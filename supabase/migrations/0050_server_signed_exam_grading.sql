-- Server-signed, atomic AI exam grading.
-- Browser sessions may review approved AI output through dedicated RPCs, but
-- they cannot create/delete AI question rows or directly mutate exam attempts.

-- All exam-attempt mutations now go through SECURITY DEFINER RPCs:
-- create_exam_attempt_from_item, begin/complete/fail_server_exam_grading,
-- set_exam_question_teacher_score, review_exam_attempt and resolve_exam_appeal.
drop policy if exists "exam attempts insertable by school teachers" on public.exam_attempts;
drop policy if exists "exam attempts updateable by school teachers" on public.exam_attempts;

drop policy if exists "exam question scores insertable while analyzing" on public.exam_question_scores;
drop policy if exists "exam question scores updateable while pending" on public.exam_question_scores;
drop policy if exists "exam question scores deletable while analyzing" on public.exam_question_scores;

create or replace function app_private.assert_exam_grading_access(
  p_attempt_id uuid,
  p_server_secret text
)
returns void
language plpgsql
security definer
set search_path = app_private, public, extensions, pg_temp
as $$
declare
  v_role text;
  v_status text;
  v_expires_at timestamptz;
  v_school_id uuid;
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
  into v_role, v_status, v_expires_at
  from public.profiles
  where id = auth.uid();

  if not found or v_status <> 'active' then
    raise exception 'Account unavailable' using errcode = '42501';
  end if;

  if v_expires_at is not null and v_expires_at <= now() then
    raise exception 'Account expired' using errcode = '42501';
  end if;

  select school_id into v_school_id
  from public.exam_attempts
  where id = p_attempt_id;

  if not found then
    raise exception 'exam_attempt_not_found' using errcode = 'P0002';
  end if;

  if v_role = 'super_admin' then
    return;
  end if;

  if v_role = 'teacher' and public.is_teacher_of_school(v_school_id) then
    return;
  end if;

  raise exception 'Forbidden' using errcode = '42501';
end;
$$;

revoke all on function app_private.assert_exam_grading_access(uuid, text) from public, anon, authenticated;

create or replace function public.begin_server_exam_grading(
  p_attempt_id uuid,
  p_server_secret text
)
returns void
language plpgsql
security definer
set search_path = app_private, public, extensions, pg_temp
as $$
declare
  v_status text;
begin
  perform app_private.assert_exam_grading_access(p_attempt_id, p_server_secret);

  select status into v_status
  from public.exam_attempts
  where id = p_attempt_id
  for update;

  if v_status not in ('grading_pending', 'grading_failed') then
    raise exception 'exam_attempt_cannot_start_grading' using errcode = 'P0001';
  end if;

  update public.exam_attempts
  set status = 'analyzing',
      feedback_visible = false,
      updated_at = now()
  where id = p_attempt_id;
end;
$$;

create or replace function public.complete_server_exam_grading(
  p_attempt_id uuid,
  p_server_secret text,
  p_final_score numeric,
  p_ai_feedback jsonb,
  p_questions jsonb
)
returns void
language plpgsql
security definer
set search_path = app_private, public, extensions, pg_temp
as $$
declare
  v_status text;
  v_exam_max numeric;
  v_question_count integer;
  v_max_sum numeric;
  v_score_sum numeric;
begin
  perform app_private.assert_exam_grading_access(p_attempt_id, p_server_secret);

  select a.status, e.max_points
  into v_status, v_exam_max
  from public.exam_attempts a
  join public.exam_definitions e on e.id = a.exam_id
  where a.id = p_attempt_id
  for update of a;

  if v_status <> 'analyzing' then
    raise exception 'exam_attempt_not_analyzing' using errcode = 'P0001';
  end if;

  if v_exam_max is null or p_final_score is null or p_final_score < 0 or p_final_score > v_exam_max then
    raise exception 'invalid_exam_final_score' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_ai_feedback, 'null'::jsonb)) <> 'object' then
    raise exception 'invalid_exam_ai_feedback' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_questions, 'null'::jsonb)) <> 'array' then
    raise exception 'exam_questions_must_be_array' using errcode = '22023';
  end if;

  v_question_count := jsonb_array_length(p_questions);
  if v_question_count < 1 or v_question_count > 200 then
    raise exception 'invalid_exam_question_count' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_questions) as q(
      question_key text,
      question_label text,
      max_score numeric,
      ai_score numeric,
      explanation text,
      evidence_quote text,
      feedback text,
      sort_order integer
    )
    where q.question_key is null
       or length(trim(q.question_key)) = 0
       or length(q.question_key) > 160
       or q.question_label is null
       or length(trim(q.question_label)) = 0
       or length(q.question_label) > 500
       or q.max_score is null
       or q.max_score <= 0
       or q.ai_score is null
       or q.ai_score < 0
       or q.ai_score > q.max_score
       or q.explanation is null
       or length(q.explanation) > 12000
       or length(coalesce(q.evidence_quote, '')) > 4000
       or length(coalesce(q.feedback, '')) > 12000
       or q.sort_order is null
       or q.sort_order < 0
       or q.sort_order >= 200
  ) then
    raise exception 'invalid_exam_question_payload' using errcode = '22023';
  end if;

  if (
    select count(distinct q.sort_order)
    from jsonb_to_recordset(p_questions) as q(sort_order integer)
  ) <> v_question_count then
    raise exception 'duplicate_exam_question_order' using errcode = '22023';
  end if;

  select
    coalesce(sum(q.max_score), 0),
    coalesce(sum(q.ai_score), 0)
  into v_max_sum, v_score_sum
  from jsonb_to_recordset(p_questions) as q(max_score numeric, ai_score numeric);

  if abs(v_max_sum - v_exam_max) > 0.011 then
    raise exception 'exam_question_max_total_mismatch' using errcode = '22023';
  end if;

  if abs(v_score_sum - p_final_score) > 0.011 then
    raise exception 'exam_question_score_total_mismatch' using errcode = '22023';
  end if;

  delete from public.exam_question_scores
  where attempt_id = p_attempt_id;

  insert into public.exam_question_scores (
    attempt_id,
    question_key,
    question_label,
    max_score,
    ai_score,
    teacher_score,
    explanation,
    evidence_quote,
    feedback,
    sort_order
  )
  select
    p_attempt_id,
    trim(q.question_key),
    trim(q.question_label),
    q.max_score,
    q.ai_score,
    null,
    q.explanation,
    nullif(q.evidence_quote, ''),
    nullif(q.feedback, ''),
    q.sort_order
  from jsonb_to_recordset(p_questions) as q(
    question_key text,
    question_label text,
    max_score numeric,
    ai_score numeric,
    explanation text,
    evidence_quote text,
    feedback text,
    sort_order integer
  )
  order by q.sort_order;

  update public.exam_attempts
  set ai_score = p_final_score,
      final_score = p_final_score,
      ai_feedback = p_ai_feedback,
      status = 'teacher_review_pending',
      feedback_visible = false,
      reviewed_by = null,
      reviewed_at = null,
      updated_at = now()
  where id = p_attempt_id;
end;
$$;

create or replace function public.fail_server_exam_grading(
  p_attempt_id uuid,
  p_server_secret text
)
returns void
language plpgsql
security definer
set search_path = app_private, public, extensions, pg_temp
as $$
begin
  perform app_private.assert_exam_grading_access(p_attempt_id, p_server_secret);

  delete from public.exam_question_scores
  where attempt_id = p_attempt_id
    and exists (
      select 1
      from public.exam_attempts a
      where a.id = p_attempt_id and a.status = 'analyzing'
    );

  update public.exam_attempts
  set ai_score = null,
      final_score = null,
      ai_feedback = '{}'::jsonb,
      status = 'grading_failed',
      feedback_visible = false,
      reviewed_by = null,
      reviewed_at = null,
      updated_at = now()
  where id = p_attempt_id
    and status = 'analyzing';
end;
$$;

revoke all on function public.begin_server_exam_grading(uuid, text) from public, anon;
revoke all on function public.complete_server_exam_grading(uuid, text, numeric, jsonb, jsonb) from public, anon;
revoke all on function public.fail_server_exam_grading(uuid, text) from public, anon;

grant execute on function public.begin_server_exam_grading(uuid, text) to authenticated;
grant execute on function public.complete_server_exam_grading(uuid, text, numeric, jsonb, jsonb) to authenticated;
grant execute on function public.fail_server_exam_grading(uuid, text) to authenticated;

grant execute on function public.begin_server_exam_grading(uuid, text) to service_role;
grant execute on function public.complete_server_exam_grading(uuid, text, numeric, jsonb, jsonb) to service_role;
grant execute on function public.fail_server_exam_grading(uuid, text) to service_role;

comment on function public.begin_server_exam_grading(uuid, text)
is 'Starts exam grading only when both the authenticated teacher/admin and private grading server secret are valid.';
comment on function public.complete_server_exam_grading(uuid, text, numeric, jsonb, jsonb)
is 'Atomically persists server-generated exam question scores and transitions the attempt to teacher review.';
comment on function public.fail_server_exam_grading(uuid, text)
is 'Atomically clears partial AI grading data and marks a running exam grading attempt as failed.';
