create schema if not exists app_private;
revoke all on schema app_private from public;
revoke all on schema app_private from anon;
revoke all on schema app_private from authenticated;

create table if not exists app_private.server_secret_hashes (
  name text primary key,
  sha256_hex text not null check (sha256_hex ~ '^[0-9a-f]{64}$')
);
revoke all on table app_private.server_secret_hashes from public;
revoke all on table app_private.server_secret_hashes from anon;
revoke all on table app_private.server_secret_hashes from authenticated;

insert into app_private.server_secret_hashes (name, sha256_hex)
values ('grading', '039994d1a2bc9eb93cc166a0f91695c1be65a3414a5a404b9d6b22a59c09c664')
on conflict (name) do update set sha256_hex = excluded.sha256_hex;

create or replace function app_private.assert_grading_access(
  p_submission_id uuid,
  p_server_secret text
)
returns void
language plpgsql
security definer
set search_path = app_private, public, extensions, pg_temp
as $$
declare
  requester_role text;
  requester_status text;
  requester_expires_at timestamptz;
  submission_student_id uuid;
  submission_school_id uuid;
begin
  if p_server_secret is null or not exists (
    select 1
    from app_private.server_secret_hashes
    where name = 'grading'
      and sha256_hex = encode(extensions.digest(p_server_secret, 'sha256'), 'hex')
  ) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if auth.uid() is null then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select role, status, expires_at
  into requester_role, requester_status, requester_expires_at
  from public.profiles
  where id = auth.uid();

  if not found or requester_status <> 'active' then
    raise exception 'Account unavailable' using errcode = '42501';
  end if;

  if requester_expires_at is not null and requester_expires_at <= now() then
    raise exception 'Account expired' using errcode = '42501';
  end if;

  select student_id, school_id
  into submission_student_id, submission_school_id
  from public.submissions
  where id = p_submission_id;

  if not found then
    raise exception 'Submission not found' using errcode = 'P0002';
  end if;

  if requester_role = 'super_admin' then
    return;
  end if;

  if requester_role = 'student' and submission_student_id = auth.uid() then
    return;
  end if;

  if requester_role = 'teacher' and exists (
    select 1
    from public.teacher_schools
    where teacher_id = auth.uid()
      and school_id = submission_school_id
  ) then
    return;
  end if;

  raise exception 'Forbidden' using errcode = '42501';
end;
$$;

revoke all on function app_private.assert_grading_access(uuid, text) from public;
revoke all on function app_private.assert_grading_access(uuid, text) from anon;
revoke all on function app_private.assert_grading_access(uuid, text) from authenticated;

create or replace function public.begin_server_submission_grading(
  p_submission_id uuid,
  p_server_secret text
)
returns void
language plpgsql
security definer
set search_path = app_private, public, extensions, pg_temp
as $$
begin
  perform app_private.assert_grading_access(p_submission_id, p_server_secret);

  update public.submissions
  set status = 'analyzing',
      submitted_at = coalesce(submitted_at, now()),
      last_saved_at = now()
  where id = p_submission_id
    and status in ('in_progress', 'submitted', 'analyzing', 'grading_failed');

  if not found then
    raise exception 'Submission cannot be graded in its current state' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.complete_server_submission_grading(
  p_submission_id uuid,
  p_server_secret text,
  p_final_score numeric,
  p_next_status text,
  p_score_visible boolean,
  p_uses_custom_rubric boolean,
  p_criterion_scores jsonb,
  p_annotations jsonb
)
returns void
language plpgsql
security definer
set search_path = app_private, public, extensions, pg_temp
as $$
declare
  current_status text;
begin
  perform app_private.assert_grading_access(p_submission_id, p_server_secret);

  select status into current_status
  from public.submissions
  where id = p_submission_id
  for update;

  if current_status <> 'analyzing' then
    raise exception 'Submission is not being graded' using errcode = 'P0001';
  end if;

  if p_final_score is null or p_final_score < 0 or p_final_score > 100 then
    raise exception 'Invalid final score' using errcode = '22023';
  end if;

  if p_next_status not in ('teacher_review_pending', 'result_ready') then
    raise exception 'Invalid grading status' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_criterion_scores, 'null'::jsonb)) <> 'array'
     or jsonb_array_length(p_criterion_scores) = 0 then
    raise exception 'Criterion scores are required' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_annotations, 'null'::jsonb)) <> 'array' then
    raise exception 'Annotations must be an array' using errcode = '22023';
  end if;

  delete from public.criterion_scores where submission_id = p_submission_id;
  delete from public.writing_annotations where submission_id = p_submission_id;
  delete from public.study_recommendations where submission_id = p_submission_id;

  insert into public.criterion_scores (
    submission_id,
    criterion_id,
    criterion_key,
    ai_score,
    max_score,
    weight,
    explanation,
    evidence_quote,
    strong_aspects,
    development_areas
  )
  select
    p_submission_id,
    item->>'criterionId',
    item->>'criterionKey',
    (item->>'score')::numeric,
    (item->>'maxScore')::integer,
    (item->>'weight')::numeric,
    coalesce(item->>'explanation', ''),
    nullif(item->>'evidenceQuote', ''),
    coalesce(array(select jsonb_array_elements_text(coalesce(item->'strongAspects', '[]'::jsonb))), '{}'::text[]),
    coalesce(array(select jsonb_array_elements_text(coalesce(item->'developmentAreas', '[]'::jsonb))), '{}'::text[])
  from jsonb_array_elements(p_criterion_scores) as score_item(item);

  insert into public.writing_annotations (
    submission_id,
    start_pos,
    end_pos,
    quoted_text,
    severity,
    category_id,
    explanation,
    hint,
    suggested_correction
  )
  select
    p_submission_id,
    (item->>'start')::integer,
    (item->>'end')::integer,
    item->>'quotedText',
    item->>'severity',
    item->>'categoryId',
    coalesce(item->>'explanation', ''),
    nullif(item->>'hint', ''),
    nullif(item->>'suggestedCorrection', '')
  from jsonb_array_elements(p_annotations) as annotation_item(item);

  update public.submissions
  set ai_score = p_final_score,
      final_score = case when p_score_visible then p_final_score else null end,
      status = p_next_status,
      score_visible_to_student = p_score_visible,
      uses_custom_rubric = p_uses_custom_rubric,
      last_saved_at = now()
  where id = p_submission_id;
end;
$$;

create or replace function public.fail_server_submission_grading(
  p_submission_id uuid,
  p_server_secret text
)
returns void
language plpgsql
security definer
set search_path = app_private, public, extensions, pg_temp
as $$
begin
  perform app_private.assert_grading_access(p_submission_id, p_server_secret);

  update public.submissions
  set status = 'grading_failed',
      last_saved_at = now()
  where id = p_submission_id
    and status in ('in_progress', 'submitted', 'analyzing', 'grading_failed');
end;
$$;

revoke all on function public.begin_server_submission_grading(uuid, text) from public;
revoke all on function public.complete_server_submission_grading(uuid, text, numeric, text, boolean, boolean, jsonb, jsonb) from public;
revoke all on function public.fail_server_submission_grading(uuid, text) from public;
revoke all on function public.begin_server_submission_grading(uuid, text) from anon;
revoke all on function public.complete_server_submission_grading(uuid, text, numeric, text, boolean, boolean, jsonb, jsonb) from anon;
revoke all on function public.fail_server_submission_grading(uuid, text) from anon;
grant execute on function public.begin_server_submission_grading(uuid, text) to authenticated;
grant execute on function public.complete_server_submission_grading(uuid, text, numeric, text, boolean, boolean, jsonb, jsonb) to authenticated;
grant execute on function public.fail_server_submission_grading(uuid, text) to authenticated;
grant execute on function public.begin_server_submission_grading(uuid, text) to service_role;
grant execute on function public.complete_server_submission_grading(uuid, text, numeric, text, boolean, boolean, jsonb, jsonb) to service_role;
grant execute on function public.fail_server_submission_grading(uuid, text) to service_role;

comment on function public.begin_server_submission_grading(uuid, text)
is 'Starts server-signed grading after validating the authenticated requester and server secret.';
comment on function public.complete_server_submission_grading(uuid, text, numeric, text, boolean, boolean, jsonb, jsonb)
is 'Atomically persists server-signed AI grading output and advances submission status.';
comment on function public.fail_server_submission_grading(uuid, text)
is 'Marks an authorized submission grading attempt as failed.';
