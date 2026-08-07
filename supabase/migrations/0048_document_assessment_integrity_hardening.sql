-- Integrity hardening for Document Assessment Hub.
-- Prevent cross-school/document mismatches, make OCR writing import idempotent,
-- preserve AI-score provenance, and align OCR metadata with current Mistral output.

-- ---------------------------------------------------------------------------
-- Batch consistency: a batch may only reference content from its own school.
-- ---------------------------------------------------------------------------

create or replace function public.guard_document_import_batch()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_target_school uuid;
begin
  if new.kind = 'writing' then
    if new.assignment_id is null or new.exam_id is not null then
      raise exception 'invalid_writing_batch' using errcode = '22023';
    end if;

    select school_id into v_target_school
    from public.assignments
    where id = new.assignment_id
      and status = 'published';
  else
    if new.exam_id is null or new.assignment_id is not null then
      raise exception 'invalid_exam_batch' using errcode = '22023';
    end if;

    select school_id into v_target_school
    from public.exam_definitions
    where id = new.exam_id
      and status <> 'archived';
  end if;

  if v_target_school is null or v_target_school <> new.school_id then
    raise exception 'batch_school_mismatch' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_document_import_batch() from public, anon, authenticated;

drop trigger if exists guard_document_import_batch_trigger on public.document_import_batches;
create trigger guard_document_import_batch_trigger
before insert or update of school_id, kind, assignment_id, exam_id
on public.document_import_batches
for each row execute function public.guard_document_import_batch();

-- ---------------------------------------------------------------------------
-- OCR item metadata: use Mistral's current page confidence structure and never
-- persist provider error payloads containing share URLs/tokens.
-- ---------------------------------------------------------------------------

create or replace function public.normalize_document_import_item_metadata()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_confidence numeric;
begin
  if new.ocr_payload is distinct from old.ocr_payload or new.confidence is null then
    select avg(nullif(page->'confidence_scores'->>'average_page_confidence_score', '')::numeric)
    into v_confidence
    from jsonb_array_elements(coalesce(new.ocr_payload->'pages', '[]'::jsonb)) page;

    if v_confidence is not null then
      new.confidence := greatest(0, least(1, v_confidence));
    end if;
  end if;

  if new.error_message is not null then
    new.error_message := regexp_replace(
      new.error_message,
      'https://[^[:space:]"''<>]+',
      '[redacted-url]',
      'gi'
    );
    new.error_message := left(new.error_message, 500);
  end if;

  return new;
end;
$$;

revoke all on function public.normalize_document_import_item_metadata() from public, anon, authenticated;

drop trigger if exists normalize_document_import_item_metadata_trigger on public.document_import_items;
create trigger normalize_document_import_item_metadata_trigger
before update of ocr_payload, confidence, error_message
on public.document_import_items
for each row execute function public.normalize_document_import_item_metadata();

-- ---------------------------------------------------------------------------
-- OCR writing import: retries for the SAME item are idempotent, but a new OCR
-- item may never silently reuse/grade a student's unrelated existing writing.
-- ---------------------------------------------------------------------------

create or replace function public.create_ocr_submission(
  p_item_id uuid,
  p_assignment_id uuid,
  p_student_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private, pg_temp
as $$
declare
  v_item public.document_import_items%rowtype;
  v_batch public.document_import_batches%rowtype;
  v_assignment public.assignments%rowtype;
  v_uses_custom_rubric boolean;
  v_submission_id uuid;
  v_existing_id uuid;
begin
  if public.app_current_role() <> 'teacher' or not public.is_current_account_active() then
    raise exception 'teacher_required' using errcode = '42501';
  end if;

  select * into v_item
  from public.document_import_items
  where id = p_item_id
  for update;

  if not found or v_item.ocr_status <> 'ready' or length(trim(coalesce(v_item.ocr_text, ''))) = 0 then
    raise exception 'ocr_item_not_ready' using errcode = '22023';
  end if;

  select * into v_batch
  from public.document_import_batches
  where id = v_item.batch_id;

  if not found or v_batch.kind <> 'writing' or v_batch.assignment_id <> p_assignment_id then
    raise exception 'invalid_writing_batch' using errcode = '22023';
  end if;

  if not public.is_teacher_of_school(v_batch.school_id) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select a, r.is_custom
  into v_assignment, v_uses_custom_rubric
  from public.assignments a
  join public.assignment_rubrics r on r.id = a.rubric_id
  where a.id = p_assignment_id
    and a.school_id = v_batch.school_id
    and a.status = 'published';

  if not found then
    raise exception 'assignment_not_found' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_student_id
      and p.role = 'student'
      and p.school_id = v_batch.school_id
      and p.status = 'active'
      and (p.expires_at is null or p.expires_at > now())
  ) or not exists (
    select 1
    from public.assignment_classes ac
    join public.student_classes sc on sc.class_id = ac.class_id
    where ac.assignment_id = p_assignment_id
      and sc.student_id = p_student_id
  ) then
    raise exception 'student_not_assigned' using errcode = '42501';
  end if;

  -- Retry of this exact OCR item: return its authoritative submission.
  if v_item.linked_submission_id is not null then
    select id into v_existing_id
    from public.submissions
    where id = v_item.linked_submission_id
      and assignment_id = p_assignment_id
      and student_id = p_student_id;

    if v_existing_id is null then
      raise exception 'ocr_item_link_mismatch' using errcode = '42501';
    end if;

    return v_existing_id;
  end if;

  -- Do not attach a newly scanned paper to a typed/prior OCR submission.
  select id into v_existing_id
  from public.submissions
  where assignment_id = p_assignment_id
    and student_id = p_student_id
  order by created_at desc
  limit 1;

  if v_existing_id is not null then
    raise exception 'student_already_has_submission' using errcode = '23505';
  end if;

  insert into app_private.server_import_write_context (transaction_id, student_id)
  values (txid_current(), p_student_id)
  on conflict do nothing;

  insert into public.submissions (
    assignment_id, is_practice, student_id, school_id, writing_type_id, level,
    topic_title, text, word_count, status, submitted_at, last_saved_at,
    score_visible_to_student, uses_custom_rubric
  )
  values (
    p_assignment_id,
    false,
    p_student_id,
    v_batch.school_id,
    v_assignment.writing_type_id,
    v_assignment.level,
    v_assignment.title,
    v_item.ocr_text,
    case
      when length(trim(v_item.ocr_text)) = 0 then 0
      else array_length(regexp_split_to_array(trim(v_item.ocr_text), '\\s+'), 1)
    end,
    'submitted',
    now(),
    now(),
    false,
    coalesce(v_uses_custom_rubric, false)
  )
  returning id into v_submission_id;

  delete from app_private.server_import_write_context
  where transaction_id = txid_current()
    and student_id = p_student_id;

  update public.document_import_items
  set student_id = p_student_id,
      linked_submission_id = v_submission_id,
      review_status = 'ready_for_grading',
      updated_at = now()
  where id = p_item_id;

  return v_submission_id;
end;
$$;

revoke all on function public.create_ocr_submission(uuid, uuid, uuid) from public, anon;
grant execute on function public.create_ocr_submission(uuid, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Exam attempt integrity. The browser may request creation, but DB derives all
-- source fields from the OCR item and rejects cross-exam/cross-school matches.
-- ---------------------------------------------------------------------------

create or replace function public.guard_exam_attempt_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_exam_school uuid;
  v_exam_status text;
  v_item public.document_import_items%rowtype;
  v_batch public.document_import_batches%rowtype;
begin
  select school_id, status
  into v_exam_school, v_exam_status
  from public.exam_definitions
  where id = new.exam_id;

  if v_exam_school is null or v_exam_status <> 'ready' then
    raise exception 'exam_not_ready' using errcode = '22023';
  end if;

  if not (public.is_admin() or public.is_teacher_of_school(v_exam_school)) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select * into v_item
  from public.document_import_items
  where id = new.document_item_id
  for update;

  if not found or v_item.ocr_status <> 'ready' or length(trim(coalesce(v_item.ocr_text, ''))) = 0 then
    raise exception 'ocr_item_not_ready' using errcode = '22023';
  end if;

  if v_item.linked_exam_attempt_id is not null then
    raise exception 'ocr_item_already_linked' using errcode = '23505';
  end if;

  select * into v_batch
  from public.document_import_batches
  where id = v_item.batch_id;

  if not found
     or v_batch.kind <> 'exam_attempt'
     or v_batch.exam_id <> new.exam_id
     or v_batch.school_id <> v_exam_school then
    raise exception 'exam_item_mismatch' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = new.student_id
      and p.role = 'student'
      and p.school_id = v_exam_school
      and p.status = 'active'
      and (p.expires_at is null or p.expires_at > now())
  ) then
    raise exception 'student_exam_school_mismatch' using errcode = '42501';
  end if;

  new.school_id := v_exam_school;
  -- For exams keep the full OCR markdown when available so printed question
  -- boundaries remain visible when comparing with the blank template.
  new.ocr_text := coalesce(nullif(trim(v_item.ocr_markdown), ''), v_item.ocr_text);
  new.ocr_markdown := v_item.ocr_markdown;
  new.status := 'grading_pending';
  new.ai_score := null;
  new.final_score := null;
  new.ai_feedback := '{}'::jsonb;
  new.teacher_feedback := null;
  new.feedback_visible := false;
  new.reviewed_by := null;
  new.reviewed_at := null;

  return new;
end;
$$;

revoke all on function public.guard_exam_attempt_insert() from public, anon, authenticated;

drop trigger if exists guard_exam_attempt_insert_trigger on public.exam_attempts;
create trigger guard_exam_attempt_insert_trigger
before insert on public.exam_attempts
for each row execute function public.guard_exam_attempt_insert();

create or replace function public.guard_exam_attempt_update()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_exam_max numeric;
  v_role text := public.app_current_role();
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

  if new.status is distinct from old.status then
    if not (
      (old.status = 'grading_pending' and new.status = 'analyzing')
      or (old.status = 'grading_failed' and new.status = 'analyzing')
      or (old.status = 'analyzing' and new.status in ('teacher_review_pending', 'grading_failed'))
      or (old.status = 'teacher_review_pending' and new.status in ('approved', 'returned'))
    ) then
      raise exception 'invalid_exam_status_transition' using errcode = '42501';
    end if;

    if new.status in ('approved', 'returned') and v_role = 'teacher' then
      new.reviewed_by := auth.uid();
      new.reviewed_at := now();
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_exam_attempt_update() from public, anon, authenticated;

drop trigger if exists guard_exam_attempt_update_trigger on public.exam_attempts;
create trigger guard_exam_attempt_update_trigger
before update on public.exam_attempts
for each row execute function public.guard_exam_attempt_update();

-- ---------------------------------------------------------------------------
-- Question-score validation. AI provenance is immutable after insertion;
-- teachers may only set teacher_score. Duplicate model keys no longer fail an
-- otherwise valid grading run because sort order is the stable unique key.
-- ---------------------------------------------------------------------------

alter table public.exam_question_scores
  drop constraint if exists exam_question_scores_attempt_id_question_key_key;

create unique index if not exists exam_question_scores_attempt_sort_unique
on public.exam_question_scores(attempt_id, sort_order);

create or replace function public.guard_exam_question_score()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt_text text;
begin
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
  end if;

  if new.max_score <= 0
     or new.ai_score < 0
     or new.ai_score > new.max_score
     or (new.teacher_score is not null and (new.teacher_score < 0 or new.teacher_score > new.max_score)) then
    raise exception 'invalid_exam_question_score' using errcode = '22023';
  end if;

  if new.evidence_quote is not null and length(trim(new.evidence_quote)) > 0 then
    select ocr_text into v_attempt_text
    from public.exam_attempts
    where id = new.attempt_id;

    if v_attempt_text is null or position(new.evidence_quote in v_attempt_text) = 0 then
      new.evidence_quote := null;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_exam_question_score() from public, anon, authenticated;

drop trigger if exists guard_exam_question_score_trigger on public.exam_question_scores;
create trigger guard_exam_question_score_trigger
before insert or update on public.exam_question_scores
for each row execute function public.guard_exam_question_score();

-- ---------------------------------------------------------------------------
-- Students need the exam title/max score after a result has been explicitly
-- approved and exposed. Question-score RLS remains tied to the same visibility.
-- ---------------------------------------------------------------------------

create policy "students read definitions for visible approved attempts"
on public.exam_definitions for select to authenticated
using (
  exists (
    select 1
    from public.exam_attempts a
    where a.exam_id = exam_definitions.id
      and a.student_id = auth.uid()
      and a.status = 'approved'
      and a.feedback_visible = true
  )
);

-- Only one unresolved appeal per attempt. A resolved appeal can be followed by
-- a new appeal if the teacher later changes/re-publishes the result.
create unique index if not exists exam_appeals_one_open_per_attempt
on public.exam_appeals(attempt_id)
where status in ('submitted', 'reviewing');

-- ---------------------------------------------------------------------------
-- Shared-assignment adoption should report newly attached classes, not classes
-- that were already linked from an earlier click/retry.
-- ---------------------------------------------------------------------------

create or replace function public.adopt_shared_assignment(
  p_assignment_id uuid,
  p_class_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_school_id uuid;
  v_count integer := 0;
  v_class_id uuid;
  v_inserted integer;
begin
  if public.app_current_role() <> 'teacher' or not public.is_current_account_active() then
    raise exception 'teacher_required' using errcode = '42501';
  end if;

  select school_id into v_school_id
  from public.assignments
  where id = p_assignment_id
    and status = 'published'
    and shared_with_school = true;

  if not found or not public.is_teacher_of_school(v_school_id) then
    raise exception 'assignment_not_shareable' using errcode = '42501';
  end if;

  foreach v_class_id in array coalesce(p_class_ids, array[]::uuid[])
  loop
    if exists (
      select 1
      from public.school_classes c
      join public.teacher_classes tc on tc.class_id = c.id
      where c.id = v_class_id
        and c.school_id = v_school_id
        and tc.teacher_id = auth.uid()
    ) then
      insert into public.assignment_classes (assignment_id, class_id)
      values (p_assignment_id, v_class_id)
      on conflict do nothing;

      insert into public.assignment_reuses (assignment_id, teacher_id, class_id)
      values (p_assignment_id, auth.uid(), v_class_id)
      on conflict do nothing;

      get diagnostics v_inserted = row_count;
      v_count := v_count + v_inserted;
    end if;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.adopt_shared_assignment(uuid, uuid[]) from public, anon;
grant execute on function public.adopt_shared_assignment(uuid, uuid[]) to authenticated;
