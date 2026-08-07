-- Cloud share URLs can contain transient access tokens. OCR requests use the
-- URL in-memory through the trusted API, but the database should not retain it.

create or replace function public.scrub_document_source_url()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.source_url := null;
  return new;
end;
$$;

revoke all on function public.scrub_document_source_url() from public, anon, authenticated;

drop trigger if exists scrub_document_source_url_trigger on public.document_import_items;
create trigger scrub_document_source_url_trigger
before insert or update of source_url on public.document_import_items
for each row execute function public.scrub_document_source_url();

update public.document_import_items set source_url = null where source_url is not null;
