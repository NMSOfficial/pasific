-- Staged exam workflow: blank template, optional answer key, student papers.
-- Answer-key OCR is server-managed provenance just like the blank template.

alter table public.exam_definitions
  add column if not exists answer_key_ocr_text text,
  add column if not exists answer_key_ocr_markdown text,
  add column if not exists answer_key_structure jsonb not null default '{}'::jsonb;

alter table public.document_import_batches
  drop constraint if exists document_import_batches_kind_check;
alter table public.document_import_batches
  add constraint document_import_batches_kind_check
  check (kind in ('writing', 'exam_template', 'exam_answer_key', 'exam_attempt'));

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
set search_path = public, pg_temp
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
  if not (public.is_admin() or public.is_teacher_of_school(v_exam.school_id)) then
    raise exception 'Forbidden' using errcode = '42501';
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
