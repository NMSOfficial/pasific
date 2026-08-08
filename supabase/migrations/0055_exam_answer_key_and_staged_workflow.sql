-- Staged exam workflow: blank template, optional answer key, student papers.
-- Reference OCR stays server-managed, shared exams are reusable without making
-- another teacher's reference documents, student papers, or reviews writable.

alter table public.exam_definitions
  add column if not exists answer_key_ocr_text text,
  add column if not exists answer_key_ocr_markdown text,
  add column if not exists answer_key_structure jsonb not null default '{}'::jsonb;

alter table public.document_import_batches
  drop constraint if exists document_import_batches_kind_check;
alter table public.document_import_batches
  add constraint document_import_batches_kind_check
  check (kind in ('writing', 'exam_template', 'exam_answer_key', 'exam_attempt'));

-- ---------------------------------------------------------------------------
-- Visibility and ownership helpers
-- ---------------------------------------------------------------------------

drop policy if exists "exam definitions readable by school teachers" on public.exam_definitions;
create policy "exam definitions readable by permitted school teachers"
on public.exam_definitions for select to authenticated
using (
  public.is_current_account_active()
  and (
    public.is_admin()
    or (
      public.app_current_role() = 'teacher'
      and public.is_teacher_of_school(school_id)
      and (created_by = auth.uid() or shared_with_school = true)
    )
  )
);

-- OCR batches are private workspaces. A shared exam definition may be reused,
-- but one teacher never needs to read another teacher's upload queue.
drop policy if exists "document batches readable by school teachers" on public.document_import_batches;
create policy "document batches readable by owner teacher"
on public.document_import_batches for select to authenticated
using (
  public.is_admin()
  or (
    public.is_current_account_active()
    and public.app_current_role() = 'teacher'
    and public.is_teacher_of_school(school_id)
    and created_by = auth.uid()
  )
);

drop policy if exists "document items readable by batch school teachers" on public.document_import_items;
create policy "document items readable by batch owner teacher"
on public.document_import_items for select to authenticated
using (
  exists (
    select 1
    from public.document_import_batches b
    where b.id = batch_id
      and (
        public.is_admin()
        or (
          public.is_current_account_active()
          and public.app_current_role() = 'teacher'
          and public.is_teacher_of_school(b.school_id)
          and b.created_by = auth.uid()
        )
      )
  )
);

create or replace function public.can_manage_exam_attempt_source(
  p_school_id uuid,
  p_exam_id uuid,
  p_document_item_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    public.is_admin()
    or (
      public.is_current_account_active()
      and public.app_current_role() = 'teacher'
      and public.is_teacher_of_school(p_school_id)
      and (
        (
          p_document_item_id is not null
          and exists (
            select 1
            from public.document_import_items i
            join public.document_import_batches b on b.id = i.batch_id
            where i.id = p_document_item_id
              and b.school_id = p_school_id
              and b.created_by = auth.uid()
          )
        )
        or (
          p_document_item_id is null
          and exists (
            select 1
            from public.exam_definitions e
            where e.id = p_exam_id
              and e.school_id = p_school_id
              and e.created_by = auth.uid()
          )
        )
      )
    );
$$;

revoke all on function public.can_manage_exam_attempt_source(uuid, uuid, uuid) from public, anon;
grant execute on function public.can_manage_exam_attempt_source(uuid, uuid, uuid) to authenticated;

-- Attempts and their AI details are private to the teacher who imported the
-- paper (plus admins), while approved student-visible results remain readable
-- by the student who owns the attempt.
drop policy if exists "exam attempts visible to teachers or permitted student" on public.exam_attempts;
create policy "exam attempts visible to owner teacher or permitted student"
on public.exam_attempts for select to authenticated
using (
  public.can_manage_exam_attempt_source(school_id, exam_id, document_item_id)
  or (student_id = auth.uid() and status = 'approved' and feedback_visible = true)
);

drop policy if exists "exam question scores visible through attempt" on public.exam_question_scores;
create policy "exam question scores visible through permitted attempt"
on public.exam_question_scores for select to authenticated
using (
  exists (
    select 1
    from public.exam_attempts a
    where a.id = attempt_id
      and (
        public.can_manage_exam_attempt_source(a.school_id, a.exam_id, a.document_item_id)
        or (a.student_id = auth.uid() and a.status = 'approved' and a.feedback_visible = true)
      )
  )
);

drop policy if exists "exam appeals visible to owner and school teachers" on public.exam_appeals;
create policy "exam appeals visible to student or attempt owner teacher"
on public.exam_appeals for select to authenticated
using (
  student_id = auth.uid()
  or exists (
    select 1
    from public.exam_attempts a
    where a.id = attempt_id
      and public.can_manage_exam_attempt_source(a.school_id, a.exam_id, a.document_item_id)
  )
);

-- ---------------------------------------------------------------------------
-- Immutable routing envelopes for exam documents
-- ---------------------------------------------------------------------------

create or replace function public.guard_document_batch_insert_defaults()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_exam public.exam_definitions%rowtype;
begin
  new.status := 'open';

  if new.kind in ('exam_template', 'exam_answer_key', 'exam_attempt') then
    if new.exam_id is null or new.assignment_id is not null then
      raise exception 'invalid_exam_document_batch' using errcode = '22023';
    end if;

    select * into v_exam
    from public.exam_definitions
    where id = new.exam_id;

    if not found or v_exam.school_id <> new.school_id then
      raise exception 'exam_document_school_mismatch' using errcode = '42501';
    end if;

    if not (public.is_admin() or public.is_teacher_of_school(v_exam.school_id)) then
      raise exception 'Forbidden' using errcode = '42501';
    end if;

    if new.kind in ('exam_template', 'exam_answer_key') then
      if not public.is_admin() and v_exam.created_by <> auth.uid() then
        raise exception 'exam_reference_owner_required' using errcode = '42501';
      end if;
    elsif not public.is_admin()
          and v_exam.created_by <> auth.uid()
          and not v_exam.shared_with_school then
      raise exception 'exam_not_shared_with_teacher' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_document_batch_insert_defaults() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Exam shell and server-managed reference OCR
-- ---------------------------------------------------------------------------

create or replace function public.guard_exam_definition_insert_defaults()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if length(trim(coalesce(new.title, ''))) < 1 or length(new.title) > 500 then
    raise exception 'invalid_exam_title' using errcode = '22023';
  end if;
  if new.max_points is null or new.max_points <= 0 or new.max_points > 1000 then
    raise exception 'invalid_exam_max_points' using errcode = '22023';
  end if;

  new.master_ocr_text := null;
  new.master_ocr_markdown := null;
  new.master_structure := '{}'::jsonb;
  new.answer_key_ocr_text := null;
  new.answer_key_ocr_markdown := null;
  new.answer_key_structure := '{}'::jsonb;
  new.status := 'draft';
  return new;
end;
$$;

revoke all on function public.guard_exam_definition_insert_defaults() from public, anon, authenticated;

create or replace function public.complete_server_document_ocr(
  p_item_id uuid,
  p_server_secret text,
  p_ocr_text text,
  p_ocr_markdown text,
  p_ocr_payload jsonb,
  p_suggested_student_name text,
  p_suggested_student_identifier text,
  p_confidence numeric,
  p_page_count integer
)
returns void
language plpgsql
security definer
set search_path = app_private, public, extensions, pg_temp
as $$
declare
  v_status text;
  v_kind text;
  v_exam_id uuid;
begin
  perform app_private.assert_document_ocr_access(p_item_id, p_server_secret);

  select i.ocr_status, b.kind, b.exam_id
  into v_status, v_kind, v_exam_id
  from public.document_import_items i
  join public.document_import_batches b on b.id = i.batch_id
  where i.id = p_item_id
  for update of i;

  if v_status <> 'processing' then
    raise exception 'document_ocr_not_processing' using errcode = 'P0001';
  end if;
  if length(trim(coalesce(p_ocr_text, ''))) < 1 or length(p_ocr_text) > 1000000 then
    raise exception 'invalid_ocr_text' using errcode = '22023';
  end if;
  if p_ocr_markdown is not null and length(p_ocr_markdown) > 1500000 then
    raise exception 'invalid_ocr_markdown' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_ocr_payload, 'null'::jsonb)) <> 'object' then
    raise exception 'invalid_ocr_payload' using errcode = '22023';
  end if;
  if p_confidence is not null and (p_confidence < 0 or p_confidence > 1) then
    raise exception 'invalid_ocr_confidence' using errcode = '22023';
  end if;
  if p_page_count is null or p_page_count < 1 or p_page_count > 2000 then
    raise exception 'invalid_ocr_page_count' using errcode = '22023';
  end if;

  update public.document_import_items
  set ocr_text = p_ocr_text,
      ocr_markdown = nullif(p_ocr_markdown, ''),
      ocr_payload = p_ocr_payload,
      suggested_student_name = left(nullif(trim(coalesce(p_suggested_student_name, '')), ''), 500),
      suggested_student_identifier = left(nullif(trim(coalesce(p_suggested_student_identifier, '')), ''), 500),
      confidence = p_confidence,
      page_count = p_page_count,
      ocr_status = 'ready',
      review_status = 'needs_match',
      error_message = null,
      updated_at = now()
  where id = p_item_id;

  if v_kind in ('exam_template', 'exam_answer_key') then
    if v_exam_id is null then
      raise exception 'exam_reference_batch_missing_exam' using errcode = '22023';
    end if;

    if v_kind = 'exam_template' then
      update public.exam_definitions
      set master_ocr_text = coalesce(nullif(p_ocr_markdown, ''), p_ocr_text),
          master_ocr_markdown = nullif(p_ocr_markdown, ''),
          master_structure = p_ocr_payload,
          status = 'ready',
          updated_at = now()
      where id = v_exam_id;
    else
      update public.exam_definitions
      set answer_key_ocr_text = coalesce(nullif(p_ocr_markdown, ''), p_ocr_text),
          answer_key_ocr_markdown = nullif(p_ocr_markdown, ''),
          answer_key_structure = p_ocr_payload,
          updated_at = now()
      where id = v_exam_id;
    end if;

    if not found then
      raise exception 'exam_reference_not_found' using errcode = 'P0002';
    end if;
  end if;
end;
$$;

revoke all on function public.complete_server_document_ocr(uuid, text, text, text, jsonb, text, text, numeric, integer) from public, anon;
grant execute on function public.complete_server_document_ocr(uuid, text, text, text, jsonb, text, text, numeric, integer) to authenticated;
grant execute on function public.complete_server_document_ocr(uuid, text, text, text, jsonb, text, text, numeric, integer) to service_role;

create or replace function public.update_exam_definition_settings(
  p_exam_id uuid,
  p_title text,
  p_subject text,
  p_max_points numeric,
  p_scoring_notes text,
  p_feedback_visible_default boolean,
  p_shared_with_school boolean
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_exam public.exam_definitions%rowtype;
begin
  if not public.is_current_account_active() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select * into v_exam
  from public.exam_definitions
  where id = p_exam_id
  for update;

  if not found then
    raise exception 'exam_not_found' using errcode = 'P0002';
  end if;
  if v_exam.status = 'archived' then
    raise exception 'exam_archived' using errcode = '42501';
  end if;
  if not public.is_admin() and v_exam.created_by <> auth.uid() then
    raise exception 'exam_owner_required' using errcode = '42501';
  end if;
  if length(trim(coalesce(p_title, ''))) < 1 or length(p_title) > 500 then
    raise exception 'invalid_exam_title' using errcode = '22023';
  end if;
  if p_max_points is null or p_max_points <= 0 or p_max_points > 1000 or p_max_points <> round(p_max_points, 2) then
    raise exception 'invalid_exam_max_points' using errcode = '22023';
  end if;
  if length(coalesce(p_subject, '')) > 500 or length(coalesce(p_scoring_notes, '')) > 12000 then
    raise exception 'exam_metadata_too_long' using errcode = '22023';
  end if;
  if p_max_points is distinct from v_exam.max_points
     and exists (select 1 from public.exam_attempts where exam_id = p_exam_id) then
    raise exception 'exam_scale_locked_after_attempts' using errcode = '42501';
  end if;

  update public.exam_definitions
  set title = trim(p_title),
      subject = nullif(trim(coalesce(p_subject, '')), ''),
      max_points = p_max_points,
      scoring_notes = nullif(trim(coalesce(p_scoring_notes, '')), ''),
      feedback_visible_default = coalesce(p_feedback_visible_default, false),
      shared_with_school = coalesce(p_shared_with_school, true),
      updated_at = now()
  where id = p_exam_id;
end;
$$;

revoke all on function public.update_exam_definition_settings(uuid, text, text, numeric, text, boolean, boolean) from public, anon;
grant execute on function public.update_exam_definition_settings(uuid, text, text, numeric, text, boolean, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Defense-in-depth for signed OCR and AI grading
-- ---------------------------------------------------------------------------

create or replace function app_private.assert_document_ocr_access(
  p_item_id uuid,
  p_server_secret text
)
returns void
language plpgsql
security definer
set search_path = app_private, public, extensions, auth, pg_temp
as $$
declare
  v_role text;
  v_status text;
  v_expires_at timestamptz;
  v_school_id uuid;
  v_created_by uuid;
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

  if not found or v_status <> 'active' or (v_expires_at is not null and v_expires_at <= now()) then
    raise exception 'Account unavailable' using errcode = '42501';
  end if;

  select b.school_id, b.created_by
  into v_school_id, v_created_by
  from public.document_import_items i
  join public.document_import_batches b on b.id = i.batch_id
  where i.id = p_item_id;

  if not found then
    raise exception 'document_item_not_found' using errcode = 'P0002';
  end if;

  if v_role = 'super_admin' then
    return;
  end if;

  if v_role = 'teacher'
     and public.is_teacher_of_school(v_school_id)
     and v_created_by = auth.uid() then
    return;
  end if;

  raise exception 'Forbidden' using errcode = '42501';
end;
$$;

revoke all on function app_private.assert_document_ocr_access(uuid, text) from public, anon, authenticated;

create or replace function app_private.assert_exam_grading_access(
  p_attempt_id uuid,
  p_server_secret text
)
returns void
language plpgsql
security definer
set search_path = app_private, public, extensions, auth, pg_temp
as $$
declare
  v_school_id uuid;
  v_exam_id uuid;
  v_document_item_id uuid;
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

  select school_id, exam_id, document_item_id
  into v_school_id, v_exam_id, v_document_item_id
  from public.exam_attempts
  where id = p_attempt_id;

  if not found then
    raise exception 'exam_attempt_not_found' using errcode = 'P0002';
  end if;

  if not public.can_manage_exam_attempt_source(v_school_id, v_exam_id, v_document_item_id) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
end;
$$;

revoke all on function app_private.assert_exam_grading_access(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Atomic attempt creation: only own OCR paper, permitted exam, taught student.
-- ---------------------------------------------------------------------------

create or replace function public.create_exam_attempt_from_item(
  p_item_id uuid,
  p_exam_id uuid,
  p_student_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, pg_temp
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

  if not public.is_admin() then
    if not public.is_teacher_of_school(v_exam.school_id)
       or v_batch.created_by <> auth.uid() then
      raise exception 'Forbidden' using errcode = '42501';
    end if;

    if v_exam.created_by <> auth.uid() and not v_exam.shared_with_school then
      raise exception 'exam_not_shared_with_teacher' using errcode = '42501';
    end if;
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

  if not public.is_admin() and not exists (
    select 1
    from public.teacher_classes tc
    join public.student_classes sc on sc.class_id = tc.class_id
    where tc.teacher_id = auth.uid()
      and sc.student_id = p_student_id
  ) then
    raise exception 'student_not_taught_by_teacher' using errcode = '42501';
  end if;

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

  select * into v_existing
  from public.exam_attempts
  where document_item_id = p_item_id;

  if found then
    if v_existing.exam_id <> p_exam_id or v_existing.student_id <> p_student_id then
      raise exception 'ocr_item_link_mismatch' using errcode = '42501';
    end if;

    update public.document_import_items
    set student_id = p_student_id,
        linked_exam_attempt_id = v_existing.id,
        review_status = case
          when v_existing.status = 'teacher_review_pending' then 'teacher_review_pending'
          when v_existing.status = 'approved' then 'approved'
          when v_existing.status = 'returned' then 'returned'
          else 'ready_for_grading'
        end,
        updated_at = now()
    where id = p_item_id;

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
-- Human-in-the-loop operations inherit attempt ownership.
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
  v_exam_id uuid;
  v_document_item_id uuid;
  v_status text;
  v_max_score numeric;
  v_final numeric;
begin
  if not public.is_current_account_active() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select q.attempt_id, q.max_score, a.school_id, a.exam_id, a.document_item_id, a.status
  into v_attempt_id, v_max_score, v_school_id, v_exam_id, v_document_item_id, v_status
  from public.exam_question_scores q
  join public.exam_attempts a on a.id = q.attempt_id
  where q.id = p_question_id
  for update of q;

  if v_attempt_id is null then
    raise exception 'question_not_found' using errcode = 'P0002';
  end if;

  if not public.can_manage_exam_attempt_source(v_school_id, v_exam_id, v_document_item_id) then
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

  if not public.can_manage_exam_attempt_source(v_attempt.school_id, v_attempt.exam_id, v_attempt.document_item_id) then
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
     or not public.can_manage_exam_attempt_source(v_attempt.school_id, v_attempt.exam_id, v_attempt.document_item_id) then
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
