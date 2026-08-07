-- Document Assessment Hub: OCR writing imports, reusable school assignments,
-- general exam reading/grading, teacher approval, and student appeals.

-- ---------------------------------------------------------------------------
-- Writing assignment extensions
-- ---------------------------------------------------------------------------

alter table public.assignments
  add column if not exists vocabulary_requirements text,
  add column if not exists pattern_requirements text,
  add column if not exists max_points numeric not null default 100,
  add column if not exists scoring_breakdown jsonb not null default '{"rubric":100,"vocabulary":0,"patterns":0}'::jsonb,
  add column if not exists shared_with_school boolean not null default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'assignments_max_points_check'
  ) then
    alter table public.assignments
      add constraint assignments_max_points_check check (max_points > 0 and max_points <= 1000);
  end if;
end $$;

create table if not exists public.assignment_reuses (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.school_classes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (assignment_id, teacher_id, class_id)
);

alter table public.assignment_reuses enable row level security;

create policy "assignment reuses visible to linked school teachers"
on public.assignment_reuses for select to authenticated
using (
  public.is_current_account_active()
  and exists (
    select 1
    from public.assignments a
    where a.id = assignment_id
      and (public.is_admin() or public.is_teacher_of_school(a.school_id))
  )
);

-- Teachers can attach a shared assignment created by another teacher in the
-- same school to classes they themselves teach. The original assignment is
-- reused instead of copied, so the school has one canonical definition.
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

      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.adopt_shared_assignment(uuid, uuid[]) from public, anon;
grant execute on function public.adopt_shared_assignment(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Secure provider integration secrets
-- ---------------------------------------------------------------------------

create table if not exists app_private.integration_secrets (
  provider text primary key,
  encrypted_value text not null,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

revoke all on table app_private.integration_secrets from public, anon, authenticated;

create or replace function public.admin_set_integration_secret(
  p_provider text,
  p_encrypted_value text
)
returns void
language plpgsql
security definer
set search_path = app_private, public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if length(trim(coalesce(p_provider, ''))) = 0
     or length(trim(coalesce(p_encrypted_value, ''))) < 16 then
    raise exception 'invalid_secret_payload' using errcode = '22023';
  end if;

  insert into app_private.integration_secrets (provider, encrypted_value, updated_by, updated_at)
  values (lower(trim(p_provider)), p_encrypted_value, auth.uid(), now())
  on conflict (provider) do update
    set encrypted_value = excluded.encrypted_value,
        updated_by = excluded.updated_by,
        updated_at = now();
end;
$$;

create or replace function public.integration_secret_status(p_provider text)
returns boolean
language plpgsql
stable
security definer
set search_path = app_private, public, pg_temp
as $$
begin
  if not public.is_current_account_active() then
    return false;
  end if;

  if public.app_current_role() not in ('teacher', 'super_admin') then
    return false;
  end if;

  return exists (
    select 1 from app_private.integration_secrets
    where provider = lower(trim(p_provider))
  );
end;
$$;

create or replace function public.server_get_integration_secret(
  p_provider text,
  p_server_secret text
)
returns text
language plpgsql
security definer
set search_path = app_private, public, extensions, pg_temp
as $$
declare
  v_value text;
begin
  if p_server_secret is null or not exists (
    select 1
    from app_private.server_secret_hashes
    where name = 'grading'
      and sha256_hex = encode(extensions.digest(p_server_secret, 'sha256'), 'hex')
  ) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if auth.uid() is null or not public.is_current_account_active() then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select encrypted_value into v_value
  from app_private.integration_secrets
  where provider = lower(trim(p_provider));

  return v_value;
end;
$$;

revoke all on function public.admin_set_integration_secret(text, text) from public, anon;
revoke all on function public.integration_secret_status(text) from public, anon;
revoke all on function public.server_get_integration_secret(text, text) from public, anon;
grant execute on function public.admin_set_integration_secret(text, text) to authenticated;
grant execute on function public.integration_secret_status(text) to authenticated;
grant execute on function public.server_get_integration_secret(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- General exams
-- ---------------------------------------------------------------------------

create table if not exists public.exam_definitions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  title text not null,
  subject text,
  instructions text,
  max_points numeric not null default 100 check (max_points > 0 and max_points <= 1000),
  scoring_notes text,
  master_ocr_text text,
  master_ocr_markdown text,
  master_structure jsonb not null default '{}'::jsonb,
  shared_with_school boolean not null default true,
  feedback_visible_default boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'ready', 'archived')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists exam_definitions_school_idx on public.exam_definitions(school_id);

create table if not exists public.document_import_batches (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('writing', 'exam_template', 'exam_attempt')),
  assignment_id uuid references public.assignments(id) on delete cascade,
  exam_id uuid references public.exam_definitions(id) on delete cascade,
  title text not null,
  source_mode text not null check (source_mode in ('camera', 'gallery', 'zip', 'file', 'cloud_url')),
  status text not null default 'open' check (status in ('open', 'processing', 'ready', 'closed', 'failed')),
  created_at timestamptz not null default now()
);
create index if not exists document_import_batches_school_idx on public.document_import_batches(school_id);

create table if not exists public.document_import_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.document_import_batches(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete set null,
  original_filename text not null,
  mime_type text not null,
  source_url text,
  ocr_text text,
  ocr_markdown text,
  ocr_payload jsonb not null default '{}'::jsonb,
  suggested_student_name text,
  suggested_student_identifier text,
  confidence numeric,
  page_count integer,
  ocr_status text not null default 'queued' check (ocr_status in ('queued', 'processing', 'ready', 'failed')),
  review_status text not null default 'needs_match' check (review_status in ('needs_match', 'ready_for_grading', 'teacher_review_pending', 'approved', 'returned')),
  linked_submission_id uuid references public.submissions(id) on delete set null,
  linked_exam_attempt_id uuid,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists document_import_items_batch_idx on public.document_import_items(batch_id);
create index if not exists document_import_items_student_idx on public.document_import_items(student_id);

create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exam_definitions(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  document_item_id uuid references public.document_import_items(id) on delete set null,
  ocr_text text not null default '',
  ocr_markdown text,
  status text not null default 'grading_pending' check (status in ('grading_pending', 'analyzing', 'teacher_review_pending', 'approved', 'returned', 'grading_failed')),
  ai_score numeric,
  final_score numeric,
  ai_feedback jsonb not null default '{}'::jsonb,
  teacher_feedback text,
  feedback_visible boolean not null default false,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_id, student_id, document_item_id)
);
create index if not exists exam_attempts_exam_idx on public.exam_attempts(exam_id);
create index if not exists exam_attempts_student_idx on public.exam_attempts(student_id);

alter table public.document_import_items
  drop constraint if exists document_import_items_linked_exam_attempt_id_fkey;
alter table public.document_import_items
  add constraint document_import_items_linked_exam_attempt_id_fkey
  foreign key (linked_exam_attempt_id) references public.exam_attempts(id) on delete set null;

create table if not exists public.exam_question_scores (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  question_key text not null,
  question_label text not null,
  max_score numeric not null,
  ai_score numeric not null,
  teacher_score numeric,
  explanation text not null default '',
  evidence_quote text,
  feedback text,
  sort_order integer not null default 0,
  unique (attempt_id, question_key)
);

create table if not exists public.exam_appeals (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'accepted', 'rejected')),
  teacher_response text,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists exam_appeals_attempt_idx on public.exam_appeals(attempt_id);

alter table public.exam_definitions enable row level security;
alter table public.document_import_batches enable row level security;
alter table public.document_import_items enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.exam_question_scores enable row level security;
alter table public.exam_appeals enable row level security;

create policy "exam definitions readable by school teachers"
on public.exam_definitions for select to authenticated
using (
  public.is_current_account_active()
  and (public.is_admin() or public.is_teacher_of_school(school_id))
);
create policy "exam definitions writable by school teachers"
on public.exam_definitions for all to authenticated
using (public.is_admin() or public.is_teacher_of_school(school_id))
with check (public.is_admin() or (public.is_teacher_of_school(school_id) and created_by = auth.uid()));

create policy "document batches readable by school teachers"
on public.document_import_batches for select to authenticated
using (public.is_admin() or public.is_teacher_of_school(school_id));
create policy "document batches insertable by school teachers"
on public.document_import_batches for insert to authenticated
with check (public.is_admin() or (public.is_teacher_of_school(school_id) and created_by = auth.uid()));
create policy "document batches updateable by school teachers"
on public.document_import_batches for update to authenticated
using (public.is_admin() or public.is_teacher_of_school(school_id))
with check (public.is_admin() or public.is_teacher_of_school(school_id));

create policy "document items readable by batch school teachers"
on public.document_import_items for select to authenticated
using (
  exists (
    select 1 from public.document_import_batches b
    where b.id = batch_id and (public.is_admin() or public.is_teacher_of_school(b.school_id))
  )
);
create policy "document items insertable by batch school teachers"
on public.document_import_items for insert to authenticated
with check (
  exists (
    select 1 from public.document_import_batches b
    where b.id = batch_id and (public.is_admin() or public.is_teacher_of_school(b.school_id))
  )
);
create policy "document items updateable by batch school teachers"
on public.document_import_items for update to authenticated
using (
  exists (
    select 1 from public.document_import_batches b
    where b.id = batch_id and (public.is_admin() or public.is_teacher_of_school(b.school_id))
  )
)
with check (
  exists (
    select 1 from public.document_import_batches b
    where b.id = batch_id and (public.is_admin() or public.is_teacher_of_school(b.school_id))
  )
);

create policy "exam attempts visible to teachers or permitted student"
on public.exam_attempts for select to authenticated
using (
  public.is_admin()
  or public.is_teacher_of_school(school_id)
  or (student_id = auth.uid() and status = 'approved' and feedback_visible = true)
);
create policy "exam attempts writable by school teachers"
on public.exam_attempts for all to authenticated
using (public.is_admin() or public.is_teacher_of_school(school_id))
with check (public.is_admin() or public.is_teacher_of_school(school_id));

create policy "exam question scores visible through attempt"
on public.exam_question_scores for select to authenticated
using (
  exists (
    select 1 from public.exam_attempts a
    where a.id = attempt_id
      and (
        public.is_admin()
        or public.is_teacher_of_school(a.school_id)
        or (a.student_id = auth.uid() and a.status = 'approved' and a.feedback_visible = true)
      )
  )
);
create policy "exam question scores writable by school teachers"
on public.exam_question_scores for all to authenticated
using (
  exists (
    select 1 from public.exam_attempts a
    where a.id = attempt_id and (public.is_admin() or public.is_teacher_of_school(a.school_id))
  )
)
with check (
  exists (
    select 1 from public.exam_attempts a
    where a.id = attempt_id and (public.is_admin() or public.is_teacher_of_school(a.school_id))
  )
);

create policy "exam appeals visible to owner and school teachers"
on public.exam_appeals for select to authenticated
using (
  student_id = auth.uid()
  or exists (
    select 1 from public.exam_attempts a
    where a.id = attempt_id and (public.is_admin() or public.is_teacher_of_school(a.school_id))
  )
);
create policy "students may appeal visible approved exams"
on public.exam_appeals for insert to authenticated
with check (
  student_id = auth.uid()
  and length(trim(reason)) >= 5
  and exists (
    select 1 from public.exam_attempts a
    where a.id = attempt_id
      and a.student_id = auth.uid()
      and a.status = 'approved'
      and a.feedback_visible = true
  )
);
create policy "school teachers may resolve appeals"
on public.exam_appeals for update to authenticated
using (
  exists (
    select 1 from public.exam_attempts a
    where a.id = attempt_id and (public.is_admin() or public.is_teacher_of_school(a.school_id))
  )
)
with check (
  exists (
    select 1 from public.exam_attempts a
    where a.id = attempt_id and (public.is_admin() or public.is_teacher_of_school(a.school_id))
  )
);

-- ---------------------------------------------------------------------------
-- OCR writing -> existing submission pipeline
-- ---------------------------------------------------------------------------

create table if not exists app_private.server_import_write_context (
  transaction_id bigint not null,
  student_id uuid not null,
  primary key (transaction_id, student_id)
);
revoke all on table app_private.server_import_write_context from public, anon, authenticated;

create or replace function public.guard_submission_insert()
returns trigger
language plpgsql
security definer
set search_path = public, auth, app_private, pg_temp
as $$
declare
  expected_school_id uuid;
  expected_writing_type text;
  expected_level text;
  expected_score_visibility boolean;
  expected_custom_rubric boolean;
begin
  if exists (
    select 1 from app_private.server_import_write_context ctx
    where ctx.transaction_id = txid_current()
      and ctx.student_id = new.student_id
  ) then
    return new;
  end if;

  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  if not public.is_current_account_active()
     or public.app_current_role() <> 'student'
     or new.student_id <> auth.uid() then
    raise exception 'submission_insert_forbidden' using errcode = '42501';
  end if;

  if new.status not in ('not_started', 'in_progress') then
    raise exception 'invalid_initial_submission_status' using errcode = '42501';
  end if;

  if new.ai_score is not null
     or new.final_score is not null
     or new.teacher_feedback is not null
     or new.reviewed_by is not null
     or new.reviewed_at is not null then
    raise exception 'server_managed_submission_fields' using errcode = '42501';
  end if;

  if new.assignment_id is null then
    if not new.is_practice or new.school_id <> public.current_school_id() then
      raise exception 'invalid_practice_submission' using errcode = '42501';
    end if;
    new.score_visible_to_student := true;
    new.uses_custom_rubric := false;
  else
    select
      a.school_id,
      a.writing_type_id,
      a.level,
      a.show_ai_score_immediately,
      r.is_custom
    into
      expected_school_id,
      expected_writing_type,
      expected_level,
      expected_score_visibility,
      expected_custom_rubric
    from public.assignments a
    join public.assignment_rubrics r on r.id = a.rubric_id
    where a.id = new.assignment_id
      and a.status = 'published'
      and a.school_id = public.current_school_id()
      and exists (
        select 1
        from public.assignment_classes ac
        join public.student_classes sc on sc.class_id = ac.class_id
        where ac.assignment_id = a.id and sc.student_id = auth.uid()
      );

    if not found
       or new.is_practice
       or new.school_id <> expected_school_id
       or new.writing_type_id <> expected_writing_type
       or new.level <> expected_level then
      raise exception 'invalid_assignment_submission' using errcode = '42501';
    end if;

    new.score_visible_to_student := expected_score_visibility;
    new.uses_custom_rubric := expected_custom_rubric;
  end if;

  return new;
end;
$$;

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
  v_submission_id uuid;
  v_existing_id uuid;
begin
  if public.app_current_role() <> 'teacher' or not public.is_current_account_active() then
    raise exception 'teacher_required' using errcode = '42501';
  end if;

  select * into v_item from public.document_import_items where id = p_item_id for update;
  if not found or v_item.ocr_status <> 'ready' or length(trim(coalesce(v_item.ocr_text, ''))) = 0 then
    raise exception 'ocr_item_not_ready' using errcode = '22023';
  end if;

  select * into v_batch from public.document_import_batches where id = v_item.batch_id;
  if not found or v_batch.kind <> 'writing' or v_batch.assignment_id <> p_assignment_id then
    raise exception 'invalid_writing_batch' using errcode = '22023';
  end if;

  if not public.is_teacher_of_school(v_batch.school_id) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select * into v_assignment
  from public.assignments
  where id = p_assignment_id
    and school_id = v_batch.school_id
    and status = 'published';
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
  ) or not exists (
    select 1
    from public.assignment_classes ac
    join public.student_classes sc on sc.class_id = ac.class_id
    where ac.assignment_id = p_assignment_id
      and sc.student_id = p_student_id
  ) then
    raise exception 'student_not_assigned' using errcode = '42501';
  end if;

  select id into v_existing_id
  from public.submissions
  where assignment_id = p_assignment_id and student_id = p_student_id
  order by created_at desc
  limit 1;

  if v_existing_id is not null then
    update public.document_import_items
      set student_id = p_student_id,
          linked_submission_id = v_existing_id,
          review_status = 'ready_for_grading',
          updated_at = now()
    where id = p_item_id;
    return v_existing_id;
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
    p_assignment_id, false, p_student_id, v_batch.school_id, v_assignment.writing_type_id,
    v_assignment.level, v_assignment.title, v_item.ocr_text,
    case when length(trim(v_item.ocr_text)) = 0 then 0 else array_length(regexp_split_to_array(trim(v_item.ocr_text), '\\s+'), 1) end,
    'submitted', now(), now(), false, true
  )
  returning id into v_submission_id;

  delete from app_private.server_import_write_context
  where transaction_id = txid_current() and student_id = p_student_id;

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

comment on table public.document_import_batches is 'Teacher-created OCR import batches for handwritten writings and exams.';
comment on table public.document_import_items is 'OCR results and human matching state for each imported document.';
comment on table public.exam_attempts is 'AI-graded general exam attempts that require teacher approval before release.';
comment on function public.create_ocr_submission(uuid, uuid, uuid) is 'Converts a teacher-reviewed OCR writing into the existing submission pipeline without granting broad teacher insert rights.';
