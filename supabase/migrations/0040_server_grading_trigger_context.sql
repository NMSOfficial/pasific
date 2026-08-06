create table if not exists app_private.server_grading_write_context (
  transaction_id bigint not null,
  submission_id uuid not null,
  primary key (transaction_id, submission_id)
);

revoke all on table app_private.server_grading_write_context from public;
revoke all on table app_private.server_grading_write_context from anon;
revoke all on table app_private.server_grading_write_context from authenticated;

create or replace function public.guard_submission_update()
returns trigger
language plpgsql
security definer
set search_path = public, auth, app_private, pg_temp
as $$
declare
  caller_role text := public.app_current_role();
begin
  if exists (
    select 1
    from app_private.server_grading_write_context context_row
    where context_row.transaction_id = txid_current()
      and context_row.submission_id = old.id
  ) then
    return new;
  end if;

  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  if not public.is_current_account_active() then
    raise exception 'inactive_account' using errcode = '42501';
  end if;

  if caller_role = 'student' then
    if old.student_id <> auth.uid() then
      raise exception 'submission_update_forbidden' using errcode = '42501';
    end if;

    if new.id is distinct from old.id
       or new.assignment_id is distinct from old.assignment_id
       or new.is_practice is distinct from old.is_practice
       or new.student_id is distinct from old.student_id
       or new.school_id is distinct from old.school_id
       or new.writing_type_id is distinct from old.writing_type_id
       or new.level is distinct from old.level
       or new.topic_title is distinct from old.topic_title
       or new.final_score is distinct from old.final_score
       or new.ai_score is distinct from old.ai_score
       or new.score_visible_to_student is distinct from old.score_visible_to_student
       or new.teacher_feedback is distinct from old.teacher_feedback
       or new.reviewed_by is distinct from old.reviewed_by
       or new.reviewed_at is distinct from old.reviewed_at
       or new.uses_custom_rubric is distinct from old.uses_custom_rubric
       or new.created_at is distinct from old.created_at then
      raise exception 'server_managed_submission_fields' using errcode = '42501';
    end if;

    if old.status not in ('not_started', 'in_progress')
       and (new.text is distinct from old.text or new.word_count is distinct from old.word_count) then
      raise exception 'submitted_text_is_immutable' using errcode = '42501';
    end if;

    if new.status is distinct from old.status
       and not (
         (old.status = 'not_started' and new.status in ('in_progress', 'submitted'))
         or (old.status = 'in_progress' and new.status = 'submitted')
       ) then
      raise exception 'invalid_student_status_transition' using errcode = '42501';
    end if;

    if new.submitted_at is distinct from old.submitted_at
       and not (old.submitted_at is null and new.status = 'submitted' and new.submitted_at is not null) then
      raise exception 'invalid_submitted_at_change' using errcode = '42501';
    end if;

    return new;
  end if;

  if caller_role = 'teacher' and public.is_teacher_of_school(old.school_id) then
    if new.id is distinct from old.id
       or new.assignment_id is distinct from old.assignment_id
       or new.is_practice is distinct from old.is_practice
       or new.student_id is distinct from old.student_id
       or new.school_id is distinct from old.school_id
       or new.writing_type_id is distinct from old.writing_type_id
       or new.level is distinct from old.level
       or new.topic_title is distinct from old.topic_title
       or new.text is distinct from old.text
       or new.word_count is distinct from old.word_count
       or new.submitted_at is distinct from old.submitted_at
       or new.last_saved_at is distinct from old.last_saved_at
       or new.ai_score is distinct from old.ai_score
       or new.uses_custom_rubric is distinct from old.uses_custom_rubric
       or new.created_at is distinct from old.created_at then
      raise exception 'teacher_cannot_change_submission_source' using errcode = '42501';
    end if;

    if new.status is distinct from old.status
       and not (old.status in ('teacher_review_pending', 'result_ready') and new.status = 'result_ready') then
      raise exception 'invalid_teacher_status_transition' using errcode = '42501';
    end if;

    return new;
  end if;

  raise exception 'submission_update_forbidden' using errcode = '42501';
end;
$$;

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

  insert into app_private.server_grading_write_context (transaction_id, submission_id)
  values (txid_current(), p_submission_id)
  on conflict do nothing;

  update public.submissions
  set status = 'analyzing',
      submitted_at = coalesce(submitted_at, now()),
      last_saved_at = now()
  where id = p_submission_id
    and status in ('in_progress', 'submitted', 'analyzing', 'grading_failed');

  if not found then
    delete from app_private.server_grading_write_context
    where transaction_id = txid_current()
      and submission_id = p_submission_id;
    raise exception 'Submission cannot be graded in its current state' using errcode = 'P0001';
  end if;

  delete from app_private.server_grading_write_context
  where transaction_id = txid_current()
    and submission_id = p_submission_id;
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

  insert into app_private.server_grading_write_context (transaction_id, submission_id)
  values (txid_current(), p_submission_id)
  on conflict do nothing;

  update public.submissions
  set ai_score = p_final_score,
      final_score = case when p_score_visible then p_final_score else null end,
      status = p_next_status,
      score_visible_to_student = p_score_visible,
      uses_custom_rubric = p_uses_custom_rubric,
      last_saved_at = now()
  where id = p_submission_id;

  delete from app_private.server_grading_write_context
  where transaction_id = txid_current()
    and submission_id = p_submission_id;
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

  insert into app_private.server_grading_write_context (transaction_id, submission_id)
  values (txid_current(), p_submission_id)
  on conflict do nothing;

  update public.submissions
  set status = 'grading_failed',
      last_saved_at = now()
  where id = p_submission_id
    and status in ('in_progress', 'submitted', 'analyzing', 'grading_failed');

  delete from app_private.server_grading_write_context
  where transaction_id = txid_current()
    and submission_id = p_submission_id;
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
