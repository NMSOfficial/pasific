-- Keep the OCR intake queue synchronized with the authoritative writing/exam
-- review state. This makes refresh/re-login safe; the UI never has to invent
-- a local-only "approved" or "pending" status.

create or replace function public.sync_document_item_from_submission()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status or new.score_visible_to_student is distinct from old.score_visible_to_student then
    update public.document_import_items
    set review_status = case
      when new.status = 'result_ready' and new.score_visible_to_student then 'approved'
      when new.status = 'teacher_review_pending' then 'teacher_review_pending'
      when new.status = 'grading_failed' then 'returned'
      else review_status
    end,
    updated_at = now()
    where linked_submission_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_document_item_from_submission() from public, anon, authenticated;

drop trigger if exists sync_document_item_from_submission_trigger on public.submissions;
create trigger sync_document_item_from_submission_trigger
after update of status, score_visible_to_student on public.submissions
for each row execute function public.sync_document_item_from_submission();

create or replace function public.sync_document_item_from_exam_attempt()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status then
    update public.document_import_items
    set review_status = case new.status
      when 'teacher_review_pending' then 'teacher_review_pending'
      when 'approved' then 'approved'
      when 'returned' then 'returned'
      when 'grading_failed' then 'returned'
      else review_status
    end,
    updated_at = now()
    where linked_exam_attempt_id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_document_item_from_exam_attempt() from public, anon, authenticated;

drop trigger if exists sync_document_item_from_exam_attempt_trigger on public.exam_attempts;
create trigger sync_document_item_from_exam_attempt_trigger
after update of status on public.exam_attempts
for each row execute function public.sync_document_item_from_exam_attempt();
