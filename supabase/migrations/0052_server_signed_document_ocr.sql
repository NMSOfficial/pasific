-- Server-signed OCR persistence.
-- Teachers may enqueue documents, but OCR text, confidence, identity suggestions,
-- links and template OCR are server-managed provenance and cannot be forged from
-- a browser Supabase session.

-- Existing teacher update policy lets a browser rewrite OCR output and links.
drop policy if exists "document items updateable by batch school teachers" on public.document_import_items;

-- Exam definitions are created by teachers, but OCR/template fields are only
-- populated by the trusted OCR server. There is currently no teacher metadata
-- edit UI, so replace the broad FOR ALL policy with INSERT only.
drop policy if exists "exam definitions writable by school teachers" on public.exam_definitions;
create policy "exam definitions insertable by school teachers"
on public.exam_definitions for insert to authenticated
with check (
  public.is_current_account_active()
  and (public.is_admin() or (public.is_teacher_of_school(school_id) and created_by = auth.uid()))
);

-- A direct insert can describe the source file, but may never pre-populate OCR
-- output or authoritative links/statuses.
create or replace function public.guard_document_import_item_insert()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if length(trim(coalesce(new.original_filename, ''))) < 1 or length(new.original_filename) > 500 then
    raise exception 'invalid_document_filename' using errcode = '22023';
  end if;
  if length(trim(coalesce(new.mime_type, ''))) < 1 or length(new.mime_type) > 120 then
    raise exception 'invalid_document_mime' using errcode = '22023';
  end if;

  new.student_id := null;
  new.ocr_text := null;
  new.ocr_markdown := null;
  new.ocr_payload := '{}'::jsonb;
  new.suggested_student_name := null;
  new.suggested_student_identifier := null;
  new.confidence := null;
  new.page_count := null;
  new.ocr_status := 'queued';
  new.review_status := 'needs_match';
  new.linked_submission_id := null;
  new.linked_exam_attempt_id := null;
  new.error_message := null;
  return new;
end;
$$;

revoke all on function public.guard_document_import_item_insert() from public, anon, authenticated;

drop trigger if exists guard_document_import_item_insert_trigger on public.document_import_items;
create trigger guard_document_import_item_insert_trigger
before insert on public.document_import_items
for each row execute function public.guard_document_import_item_insert();

create or replace function app_private.assert_document_ocr_access(
  p_item_id uuid,
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

  select b.school_id into v_school_id
  from public.document_import_items i
  join public.document_import_batches b on b.id = i.batch_id
  where i.id = p_item_id;

  if not found then
    raise exception 'document_item_not_found' using errcode = 'P0002';
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

revoke all on function app_private.assert_document_ocr_access(uuid, text) from public, anon, authenticated;

create or replace function public.begin_server_document_ocr(
  p_item_id uuid,
  p_server_secret text
)
returns text
language plpgsql
security definer
set search_path = app_private, public, extensions, pg_temp
as $$
declare
  v_kind text;
begin
  perform app_private.assert_document_ocr_access(p_item_id, p_server_secret);

  select b.kind into v_kind
  from public.document_import_items i
  join public.document_import_batches b on b.id = i.batch_id
  where i.id = p_item_id
  for update of i;

  update public.document_import_items
  set ocr_status = 'processing',
      error_message = null,
      updated_at = now()
  where id = p_item_id
    and ocr_status in ('queued', 'failed');

  if not found then
    raise exception 'document_ocr_cannot_start' using errcode = 'P0001';
  end if;

  return v_kind;
end;
$$;

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

  if v_kind = 'exam_template' then
    if v_exam_id is null then
      raise exception 'exam_template_batch_missing_exam' using errcode = '22023';
    end if;

    update public.exam_definitions
    set master_ocr_text = coalesce(nullif(p_ocr_markdown, ''), p_ocr_text),
        master_ocr_markdown = nullif(p_ocr_markdown, ''),
        master_structure = p_ocr_payload,
        status = 'ready',
        updated_at = now()
    where id = v_exam_id;

    if not found then
      raise exception 'exam_template_not_found' using errcode = 'P0002';
    end if;
  end if;
end;
$$;

create or replace function public.fail_server_document_ocr(
  p_item_id uuid,
  p_server_secret text,
  p_error_message text
)
returns void
language plpgsql
security definer
set search_path = app_private, public, extensions, pg_temp
as $$
begin
  perform app_private.assert_document_ocr_access(p_item_id, p_server_secret);

  update public.document_import_items
  set ocr_text = null,
      ocr_markdown = null,
      ocr_payload = '{}'::jsonb,
      suggested_student_name = null,
      suggested_student_identifier = null,
      confidence = null,
      page_count = null,
      ocr_status = 'failed',
      review_status = 'needs_match',
      error_message = left(coalesce(p_error_message, 'ocr_failed'), 500),
      updated_at = now()
  where id = p_item_id
    and ocr_status = 'processing';
end;
$$;

revoke all on function public.begin_server_document_ocr(uuid, text) from public, anon;
revoke all on function public.complete_server_document_ocr(uuid, text, text, text, jsonb, text, text, numeric, integer) from public, anon;
revoke all on function public.fail_server_document_ocr(uuid, text, text) from public, anon;

grant execute on function public.begin_server_document_ocr(uuid, text) to authenticated;
grant execute on function public.complete_server_document_ocr(uuid, text, text, text, jsonb, text, text, numeric, integer) to authenticated;
grant execute on function public.fail_server_document_ocr(uuid, text, text) to authenticated;

grant execute on function public.begin_server_document_ocr(uuid, text) to service_role;
grant execute on function public.complete_server_document_ocr(uuid, text, text, text, jsonb, text, text, numeric, integer) to service_role;
grant execute on function public.fail_server_document_ocr(uuid, text, text) to service_role;
