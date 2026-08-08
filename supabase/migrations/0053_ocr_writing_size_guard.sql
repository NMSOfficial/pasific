-- OCR writing imports should remain essay-sized. General exams may be much
-- longer, so enforce this only when the server import context is active.

create or replace function public.guard_ocr_submission_size()
returns trigger
language plpgsql
security definer
set search_path = public, app_private, pg_temp
as $$
begin
  if exists (
    select 1
    from app_private.server_import_write_context ctx
    where ctx.transaction_id = txid_current()
      and ctx.student_id = new.student_id
  ) then
    if length(new.text) > 120000 then
      raise exception 'ocr_writing_too_large' using errcode = '22023';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_ocr_submission_size() from public, anon, authenticated;

drop trigger if exists guard_ocr_submission_size_trigger on public.submissions;
create trigger guard_ocr_submission_size_trigger
before insert on public.submissions
for each row execute function public.guard_ocr_submission_size();
