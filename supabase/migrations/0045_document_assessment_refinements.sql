-- Refinements for Document Assessment Hub.
-- Keep OCR-imported writings inside the normal submission/grading pipeline,
-- while preserving the assignment rubric's actual custom flag.

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

  select a.*, r.is_custom
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

  select id into v_existing_id
  from public.submissions
  where assignment_id = p_assignment_id
    and student_id = p_student_id
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
