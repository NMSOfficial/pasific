-- Final integrity pass for the document/exam assessment flow.
-- Make document -> attempt linking atomic, keep human overrides consistent,
-- and ensure accepted appeals actually reopen the result for review.

-- ---------------------------------------------------------------------------
-- One physical OCR item can back at most one exam attempt.
-- ---------------------------------------------------------------------------

create unique index if not exists exam_attempts_document_item_unique
on public.exam_attempts(document_item_id)
where document_item_id is not null;

create or replace function public.create_exam_attempt_from_item(
  p_item_id uuid,
  p_exam_id uuid,
  p_student_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item public.document_import_items%rowtype;
  v_batch public.document_import_batches%rowtype;
  v_exam public.exam_definitions%rowtype;
  v_attempt_id uuid;
  v_existing public.exam_attempts%rowtype;
begin
  if not public.is_current_account_active()
     or not (public.is_admin() or public.app_current_role() = 'teacher') then
    raise exception 'teacher_required' using errcode = '42501';
  end if;

  select * into v_item
  from public.document_import_items
  where id = p_item_id
  for update;

  if not found
     or v_item.ocr_status <> 'ready'
     or length(trim(coalesce(v_item.ocr_text, ''))) = 0 then
    raise exception 'ocr_item_not_ready' using errcode = '22023';
  end if;

  select * into v_batch
  from public.document_import_batches
  where id = v_item.batch_id;

  select * into v_exam
  from public.exam_definitions
  where id = p_exam_id;

  if not found or v_exam.status <> 'ready' then
    raise exception 'exam_not_ready' using errcode = '22023';
  end if;

  if v_batch.id is null
     or v_batch.kind <> 'exam_attempt'
     or v_batch.exam_id <> p_exam_id
     or v_batch.school_id <> v_exam.school_id then
    raise exception 'exam_item_mismatch' using errcode = '42501';
  end if;

  if not (public.is_admin() or public.is_teacher_of_school(v_exam.school_id)) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_student_id
      and p.role = 'student'
      and p.school_id = v_exam.school_id
      and p.status = 'active'
      and (p.expires_at is null or p.expires_at > now())
  ) then
    raise exception 'student_exam_school_mismatch' using errcode = '42501';
  end if;

  -- Exact retry is idempotent. A different student/exam for the same paper is not.
  if v_item.linked_exam_attempt_id is not null then
    select * into v_existing
    from public.exam_attempts
    where id = v_item.linked_exam_attempt_id;

    if v_existing.id is null
       or v_existing.exam_id <> p_exam_id
       or v_existing.student_id <> p_student_id
       or v_existing.document_item_id <> p_item_id then
      raise exception 'ocr_item_link_mismatch' using errcode = '42501';
    end if;

    return v_existing.id;
  end if;

  insert into public.exam_attempts (
    exam_id,
    school_id,
    student_id,
    document_item_id,
    ocr_text,
    ocr_markdown,
    status,
    feedback_visible
  )
  values (
    p_exam_id,
    v_exam.school_id,
    p_student_id,
    p_item_id,
    coalesce(nullif(trim(v_item.ocr_markdown), ''), v_item.ocr_text),
    v_item.ocr_markdown,
    'grading_pending',
    false
  )
  returning id into v_attempt_id;

  update public.document_import_items
  set student_id = p_student_id,
      linked_exam_attempt_id = v_attempt_id,
      review_status = 'ready_for_grading',
      updated_at = now()
  where id = p_item_id;

  return v_attempt_id;
end;
$$;

revoke all on function public.create_exam_attempt_from_item(uuid, uuid, uuid) from public, anon;
grant execute on function public.create_exam_attempt_from_item(uuid, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Split broad write policies. Teachers may create/update attempts, but not
-- directly delete attempts. Question rows are mutable only in the stage where
-- that mutation is expected.
-- ---------------------------------------------------------------------------

drop policy if exists "exam attempts writable by school teachers" on public.exam_attempts;

create policy "exam attempts insertable by school teachers"
on public.exam_attempts for insert to authenticated
with check (public.is_admin() or public.is_teacher_of_school(school_id));

create policy "exam attempts updateable by school teachers"
on public.exam_attempts for update to authenticated
using (public.is_admin() or public.is_teacher_of_school(school_id))
with check (public.is_admin() or public.is_teacher_of_school(school_id));

drop policy if exists "exam question scores writable by school teachers" on public.exam_question_scores;

create policy "exam question scores insertable while analyzing"
on public.exam_question_scores for insert to authenticated
with check (
  exists (
    select 1
    from public.exam_attempts a
    where a.id = attempt_id
      and a.status = 'analyzing'
      and (public.is_admin() or public.is_teacher_of_school(a.school_id))
  )
);

create policy "exam question scores updateable while pending"
on public.exam_question_scores for update to authenticated
using (
  exists (
    select 1
    from public.exam_attempts a
    where a.id = attempt_id
      and a.status = 'teacher_review_pending'
      and (public.is_admin() or public.is_teacher_of_school(a.school_id))
  )
)
with check (
  exists (
    select 1
    from public.exam_attempts a
    where a.id = attempt_id
      and a.status = 'teacher_review_pending'
      and (public.is_admin() or public.is_teacher_of_school(a.school_id))
  )
);

create policy "exam question scores deletable while analyzing"
on public.exam_question_scores for delete to authenticated
using (
  exists (
    select 1
    from public.exam_attempts a
    where a.id = attempt_id
      and a.status = 'analyzing'
      and (public.is_admin() or public.is_teacher_of_school(a.school_id))
  )
);

-- ---------------------------------------------------------------------------
-- Attempt state machine. Reopening an approved result is allowed for an
-- accepted appeal, but source/AI provenance stays immutable.
-- ---------------------------------------------------------------------------

create or replace function public.guard_exam_attempt_update()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_exam_max numeric;
  v_role text := public.app_current_role();
  v_expected_final numeric;
begin
  select max_points into v_exam_max
  from public.exam_definitions
  where id = old.exam_id;

  if v_exam_max is null then
    raise exception 'exam_not_found' using errcode = 'P0002';
  end if;

  if new.id is distinct from old.id
     or new.exam_id is distinct from old.exam_id
     or new.school_id is distinct from old.school_id
     or new.student_id is distinct from old.student_id
     or new.document_item_id is distinct from old.document_item_id
     or new.ocr_text is distinct from old.ocr_text
     or new.ocr_markdown is distinct from old.ocr_markdown
     or new.created_at is distinct from old.created_at then
    raise exception 'exam_attempt_source_is_immutable' using errcode = '42501';
  end if;

  if new.ai_score is distinct from old.ai_score
     or new.ai_feedback is distinct from old.ai_feedback then
    if not (old.status in ('analyzing', 'grading_failed') and new.status in ('teacher_review_pending', 'grading_failed')) then
      raise exception 'exam_ai_fields_are_server_managed' using errcode = '42501';
    end if;
  end if;

  if new.ai_score is not null and (new.ai_score < 0 or new.ai_score > v_exam_max) then
    raise exception 'invalid_exam_ai_score' using errcode = '22023';
  end if;

  if new.final_score is not null and (new.final_score < 0 or new.final_score > v_exam_max) then
    raise exception 'invalid_exam_final_score' using errcode = '22023';
  end if;

  if new.final_score is distinct from old.final_score
     and old.status = 'teacher_review_pending'
     and new.status = 'teacher_review_pending' then
    select coalesce(sum(coalesce(q.teacher_score, q.ai_score)), 0)
    into v_expected_final
    from public.exam_question_scores q
    where q.attempt_id = old.id;

    if abs(coalesce(new.final_score, 0) - v_expected_final) > 0.02 then
      raise exception 'exam_final_score_must_match_questions' using errcode = '22023';
    end if;
  elsif new.final_score is distinct from old.final_score
        and not (old.status in ('analyzing', 'grading_failed') and new.status in ('teacher_review_pending', 'grading_failed')) then
    raise exception 'exam_final_score_transition_invalid' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'grading_pending' and new.status = 'analyzing')
      or (old.status = 'grading_failed' and new.status = 'analyzing')
      or (old.status = 'analyzing' and new.status in ('teacher_review_pending', 'grading_failed'))
      or (old.status = 'teacher_review_pending' and new.status in ('approved', 'returned'))
      or (old.status = 'approved' and new.status = 'teacher_review_pending')
    ) then
      raise exception 'invalid_exam_status_transition' using errcode = '42501';
    end if;

    if new.status in ('approved', 'returned') and v_role in ('teacher', 'super_admin') then
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_exam_attempt_update() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Question AI fields are immutable. Teacher override is the only allowed
-- update after model scoring; insert values are checked against the attempt.
-- ---------------------------------------------------------------------------

create or replace function public.guard_exam_question_score()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt_text text;
  v_attempt_status text;
begin
  select a.ocr_text, a.status
  into v_attempt_text, v_attempt_status
  from public.exam_attempts a
  where a.id = new.attempt_id;

  if v_attempt_status is null then
    raise exception 'exam_attempt_not_found' using errcode = 'P0002';
  end if;

  if tg_op = 'INSERT' and v_attempt_status <> 'analyzing' then
    raise exception 'exam_questions_can_only_be_inserted_while_analyzing' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.attempt_id is distinct from old.attempt_id
       or new.question_key is distinct from old.question_key
       or new.question_label is distinct from old.question_label
       or new.max_score is distinct from old.max_score
       or new.ai_score is distinct from old.ai_score
       or new.explanation is distinct from old.explanation
       or new.evidence_quote is distinct from old.evidence_quote
       or new.feedback is distinct from old.feedback
       or new.sort_order is distinct from old.sort_order then
      raise exception 'exam_ai_question_fields_are_immutable' using errcode = '42501';
    end if;

    if new.teacher_score is distinct from old.teacher_score
       and v_attempt_status <> 'teacher_review_pending' then
      raise exception 'exam_teacher_score_requires_pending_review' using errcode = '42501';
    end if;
  end if;

  if new.max_score <= 0
     or new.ai_score < 0
     or new.ai_score > new.max_score
     or (new.teacher_score is not null and (new.teacher_score < 0 or new.teacher_score > new.max_score)) then
    raise exception 'invalid_exam_question_score' using errcode = '22023';
  end if;

  if new.evidence_quote is not null
     and length(trim(new.evidence_quote)) > 0
     and (v_attempt_text is null or position(new.evidence_quote in v_attempt_text) = 0) then
    new.evidence_quote := null;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_exam_question_score() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Atomic human-in-the-loop operations. The client never supplies audit IDs.
-- ---------------------------------------------------------------------------

create or replace function public.set_exam_question_teacher_score(
  p_question_id uuid,
  p_score numeric
)
returns numeric
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt_id uuid;
  v_school_id uuid;
  v_status text;
  v_max_score numeric;
  v_final numeric;
begin
  if not public.is_current_account_active() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select q.attempt_id, q.max_score, a.school_id, a.status
  into v_attempt_id, v_max_score, v_school_id, v_status
  from public.exam_question_scores q
  join public.exam_attempts a on a.id = q.attempt_id
  where q.id = p_question_id
  for update of q;

  if v_attempt_id is null then
    raise exception 'question_not_found' using errcode = 'P0002';
  end if;

  if not (public.is_admin() or public.is_teacher_of_school(v_school_id)) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if v_status <> 'teacher_review_pending' then
    raise exception 'attempt_not_pending_review' using errcode = '42501';
  end if;

  if p_score is null or p_score < 0 or p_score > v_max_score then
    raise exception 'invalid_teacher_score' using errcode = '22023';
  end if;

  update public.exam_question_scores
  set teacher_score = p_score
  where id = p_question_id;

  select round(coalesce(sum(coalesce(teacher_score, ai_score)), 0)::numeric, 2)
  into v_final
  from public.exam_question_scores
  where attempt_id = v_attempt_id;

  update public.exam_attempts
  set final_score = v_final,
      updated_at = now()
  where id = v_attempt_id;

  return v_final;
end;
$$;

revoke all on function public.set_exam_question_teacher_score(uuid, numeric) from public, anon;
grant execute on function public.set_exam_question_teacher_score(uuid, numeric) to authenticated;

create or replace function public.review_exam_attempt(
  p_attempt_id uuid,
  p_action text,
  p_feedback text,
  p_feedback_visible boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt public.exam_attempts%rowtype;
begin
  if not public.is_current_account_active() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select * into v_attempt
  from public.exam_attempts
  where id = p_attempt_id
  for update;

  if not found then
    raise exception 'exam_attempt_not_found' using errcode = 'P0002';
  end if;

  if not (public.is_admin() or public.is_teacher_of_school(v_attempt.school_id)) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if v_attempt.status <> 'teacher_review_pending' then
    raise exception 'attempt_not_pending_review' using errcode = '42501';
  end if;

  if v_attempt.final_score is null then
    raise exception 'attempt_has_no_final_score' using errcode = '22023';
  end if;

  if p_action = 'approve' then
    update public.exam_attempts
    set status = 'approved',
        teacher_feedback = nullif(trim(coalesce(p_feedback, '')), ''),
        feedback_visible = coalesce(p_feedback_visible, false),
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        updated_at = now()
    where id = p_attempt_id;
  elsif p_action = 'return' then
    if length(trim(coalesce(p_feedback, ''))) < 3 then
      raise exception 'return_feedback_required' using errcode = '22023';
    end if;

    update public.exam_attempts
    set status = 'returned',
        teacher_feedback = trim(p_feedback),
        feedback_visible = false,
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        updated_at = now()
    where id = p_attempt_id;
  else
    raise exception 'invalid_review_action' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.review_exam_attempt(uuid, text, text, boolean) from public, anon;
grant execute on function public.review_exam_attempt(uuid, text, text, boolean) to authenticated;

-- Direct appeal updates are replaced by an audited RPC.
drop policy if exists "school teachers may resolve appeals" on public.exam_appeals;

create or replace function public.resolve_exam_appeal(
  p_appeal_id uuid,
  p_status text,
  p_response text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_appeal public.exam_appeals%rowtype;
  v_attempt public.exam_attempts%rowtype;
begin
  if not public.is_current_account_active() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select * into v_appeal
  from public.exam_appeals
  where id = p_appeal_id
  for update;

  if not found then
    raise exception 'appeal_not_found' using errcode = 'P0002';
  end if;

  select * into v_attempt
  from public.exam_attempts
  where id = v_appeal.attempt_id
  for update;

  if v_attempt.id is null
     or not (public.is_admin() or public.is_teacher_of_school(v_attempt.school_id)) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if v_appeal.status not in ('submitted', 'reviewing') then
    raise exception 'appeal_already_resolved' using errcode = '42501';
  end if;

  if p_status not in ('accepted', 'rejected') then
    raise exception 'invalid_appeal_status' using errcode = '22023';
  end if;

  if length(trim(coalesce(p_response, ''))) < 2 then
    raise exception 'appeal_response_required' using errcode = '22023';
  end if;

  update public.exam_appeals
  set status = p_status,
      teacher_response = trim(p_response),
      resolved_by = auth.uid(),
      resolved_at = now()
  where id = p_appeal_id;

  -- Accepting an appeal is meaningful: reopen the published attempt, hide the
  -- old result while it is being reconsidered, then let the teacher adjust and
  -- explicitly approve it again.
  if p_status = 'accepted' then
    if v_attempt.status <> 'approved' then
      raise exception 'appeal_attempt_not_approved' using errcode = '42501';
    end if;

    update public.exam_attempts
    set status = 'teacher_review_pending',
        feedback_visible = false,
        reviewed_by = null,
        reviewed_at = null,
        updated_at = now()
    where id = v_attempt.id;
  end if;
end;
$$;

revoke all on function public.resolve_exam_appeal(uuid, text, text) from public, anon;
grant execute on function public.resolve_exam_appeal(uuid, text, text) to authenticated;
