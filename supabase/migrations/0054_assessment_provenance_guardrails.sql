-- Final provenance guardrails for document batches, exam templates and writing
-- scoring configuration. These checks protect against direct PostgREST writes
-- that bypass the intended UI flow.

-- Import batches are immutable routing envelopes. The UI never edits them; a
-- new upload creates a new batch. Prevent changing an already-OCR'd document's
-- assignment/exam by mutating its parent batch.
drop policy if exists "document batches updateable by school teachers" on public.document_import_batches;

create or replace function public.guard_document_batch_insert_defaults()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.status := 'open';
  return new;
end;
$$;

revoke all on function public.guard_document_batch_insert_defaults() from public, anon, authenticated;

drop trigger if exists guard_document_batch_insert_defaults_trigger on public.document_import_batches;
create trigger guard_document_batch_insert_defaults_trigger
before insert on public.document_import_batches
for each row execute function public.guard_document_batch_insert_defaults();

-- A teacher may create the exam shell, but only signed OCR may make the blank
-- exam "ready" or populate authoritative OCR/template fields.
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
  new.status := 'draft';
  return new;
end;
$$;

revoke all on function public.guard_exam_definition_insert_defaults() from public, anon, authenticated;

drop trigger if exists guard_exam_definition_insert_defaults_trigger on public.exam_definitions;
create trigger guard_exam_definition_insert_defaults_trigger
before insert on public.exam_definitions
for each row execute function public.guard_exam_definition_insert_defaults();

-- Keep the assignment's stored scoring settings internally valid even if an
-- authenticated client writes assignments without using the advanced builder.
create or replace function public.guard_assignment_scoring_config()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rubric numeric;
  v_vocabulary numeric;
  v_patterns numeric;
begin
  if new.max_points is null or new.max_points <= 0 or new.max_points > 1000 then
    raise exception 'invalid_assignment_max_points' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(new.scoring_breakdown, 'null'::jsonb)) <> 'object' then
    raise exception 'invalid_scoring_breakdown' using errcode = '22023';
  end if;

  begin
    v_rubric := coalesce((new.scoring_breakdown->>'rubric')::numeric, 0);
    v_vocabulary := coalesce((new.scoring_breakdown->>'vocabulary')::numeric, 0);
    v_patterns := coalesce((new.scoring_breakdown->>'patterns')::numeric, 0);
  exception when others then
    raise exception 'invalid_scoring_breakdown' using errcode = '22023';
  end;

  if v_rubric < 0 or v_vocabulary < 0 or v_patterns < 0
     or v_rubric > 100 or v_vocabulary > 100 or v_patterns > 100
     or abs((v_rubric + v_vocabulary + v_patterns) - 100) > 0.001 then
    raise exception 'scoring_breakdown_must_total_100' using errcode = '22023';
  end if;

  if v_vocabulary > 0 and length(trim(coalesce(new.vocabulary_requirements, ''))) = 0 then
    raise exception 'vocabulary_requirements_missing' using errcode = '22023';
  end if;
  if v_patterns > 0 and length(trim(coalesce(new.pattern_requirements, ''))) = 0 then
    raise exception 'pattern_requirements_missing' using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_assignment_scoring_config() from public, anon, authenticated;

drop trigger if exists guard_assignment_scoring_config_trigger on public.assignments;
create trigger guard_assignment_scoring_config_trigger
before insert or update of max_points, scoring_breakdown, vocabulary_requirements, pattern_requirements
on public.assignments
for each row execute function public.guard_assignment_scoring_config();
