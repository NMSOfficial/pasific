-- Atomic creation for advanced writing assignments.
-- Avoids orphan rubrics/assignments when a later class-link insert fails and
-- validates school/class/scoring consistency inside one transaction.

create or replace function public.create_advanced_writing_assignment(
  p_title text,
  p_prompt text,
  p_writing_type_id text,
  p_level text,
  p_min_words integer,
  p_max_words integer,
  p_due_at timestamptz,
  p_time_limit_minutes integer,
  p_class_ids uuid[],
  p_instructions text,
  p_reference_text text,
  p_vocabulary_requirements text,
  p_pattern_requirements text,
  p_max_points numeric,
  p_scoring_breakdown jsonb,
  p_criteria jsonb,
  p_ai_support_mode text,
  p_show_ai_score_immediately boolean,
  p_shared_with_school boolean,
  p_status text,
  p_school_id uuid,
  p_topic_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rubric_id uuid;
  v_assignment_id uuid;
  v_criteria_count integer;
  v_class_count integer;
  v_rubric_weight numeric;
  v_vocabulary_weight numeric;
  v_pattern_weight numeric;
  v_base_criteria_weight numeric;
  v_criteria_weight numeric;
  v_is_custom boolean;
begin
  if public.app_current_role() <> 'teacher' or not public.is_current_account_active() then
    raise exception 'teacher_required' using errcode = '42501';
  end if;

  if not public.is_teacher_of_school(p_school_id) then
    raise exception 'teacher_school_mismatch' using errcode = '42501';
  end if;

  if length(trim(coalesce(p_title, ''))) < 1 or length(p_title) > 300 then
    raise exception 'invalid_assignment_title' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_prompt, ''))) < 1 or length(p_prompt) > 12000 then
    raise exception 'invalid_assignment_prompt' using errcode = '22023';
  end if;
  if p_level not in ('B1', 'B2', 'C1', 'C2') then
    raise exception 'invalid_assignment_level' using errcode = '22023';
  end if;
  if not exists (select 1 from public.writing_types where id = p_writing_type_id) then
    raise exception 'invalid_writing_type' using errcode = '22023';
  end if;
  if p_min_words is null or p_max_words is null or p_min_words < 1 or p_max_words < p_min_words or p_max_words > 10000 then
    raise exception 'invalid_word_range' using errcode = '22023';
  end if;
  if p_due_at is null then
    raise exception 'assignment_due_date_required' using errcode = '22023';
  end if;
  if p_time_limit_minutes is not null and (p_time_limit_minutes < 1 or p_time_limit_minutes > 1440) then
    raise exception 'invalid_time_limit' using errcode = '22023';
  end if;
  if p_max_points is null or p_max_points < 1 or p_max_points > 1000 or p_max_points <> round(p_max_points, 2) then
    raise exception 'invalid_assignment_max_points' using errcode = '22023';
  end if;
  if p_status not in ('draft', 'published') then
    raise exception 'invalid_assignment_status' using errcode = '22023';
  end if;
  if p_ai_support_mode not in ('none', 'critical_alerts_only', 'guided_practice') then
    raise exception 'invalid_ai_support_mode' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_scoring_breakdown, 'null'::jsonb)) <> 'object' then
    raise exception 'invalid_scoring_breakdown' using errcode = '22023';
  end if;

  begin
    v_rubric_weight := coalesce((p_scoring_breakdown->>'rubric')::numeric, 0);
    v_vocabulary_weight := coalesce((p_scoring_breakdown->>'vocabulary')::numeric, 0);
    v_pattern_weight := coalesce((p_scoring_breakdown->>'patterns')::numeric, 0);
  exception when others then
    raise exception 'invalid_scoring_breakdown' using errcode = '22023';
  end;

  if v_rubric_weight < 0 or v_vocabulary_weight < 0 or v_pattern_weight < 0
     or abs((v_rubric_weight + v_vocabulary_weight + v_pattern_weight) - 100) > 0.001 then
    raise exception 'scoring_breakdown_must_total_100' using errcode = '22023';
  end if;

  if v_vocabulary_weight > 0 and length(trim(coalesce(p_vocabulary_requirements, ''))) = 0 then
    raise exception 'vocabulary_requirements_missing' using errcode = '22023';
  end if;
  if v_pattern_weight > 0 and length(trim(coalesce(p_pattern_requirements, ''))) = 0 then
    raise exception 'pattern_requirements_missing' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_criteria, 'null'::jsonb)) <> 'array' then
    raise exception 'invalid_rubric_criteria' using errcode = '22023';
  end if;
  v_criteria_count := jsonb_array_length(p_criteria);
  if v_criteria_count < 5 or v_criteria_count > 7 then
    raise exception 'invalid_rubric_criteria_count' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_criteria) as c(
      key text,
      name_key text,
      description_key text,
      weight numeric,
      max_score integer,
      is_custom boolean,
      is_core boolean,
      enabled boolean,
      sort_order integer
    )
    where length(trim(coalesce(c.key, ''))) = 0
       or length(c.key) > 120
       or length(trim(coalesce(c.name_key, ''))) = 0
       or length(c.name_key) > 500
       or c.weight is null
       or c.weight < 0
       or c.weight > 100
       or c.max_score is null
       or c.max_score < 1
       or c.max_score > 1000
       or c.sort_order is null
       or c.sort_order < 0
       or c.sort_order >= 20
  ) then
    raise exception 'invalid_rubric_criterion' using errcode = '22023';
  end if;

  if (
    select count(distinct c.key)
    from jsonb_to_recordset(p_criteria) as c(key text)
  ) <> v_criteria_count then
    raise exception 'duplicate_rubric_criterion_key' using errcode = '22023';
  end if;
  if (
    select count(distinct c.sort_order)
    from jsonb_to_recordset(p_criteria) as c(sort_order integer)
  ) <> v_criteria_count then
    raise exception 'duplicate_rubric_sort_order' using errcode = '22023';
  end if;

  select
    coalesce(sum(c.weight), 0),
    coalesce(sum(c.weight) filter (where c.key not in ('required_vocabulary', 'required_patterns')), 0)
  into v_criteria_weight, v_base_criteria_weight
  from jsonb_to_recordset(p_criteria) as c(key text, weight numeric);

  if abs(v_criteria_weight - 100) > 0.001 or abs(v_base_criteria_weight - v_rubric_weight) > 0.001 then
    raise exception 'rubric_weight_mismatch' using errcode = '22023';
  end if;

  if coalesce((select sum(c.weight) from jsonb_to_recordset(p_criteria) as c(key text, weight numeric) where c.key = 'required_vocabulary'), 0) <> v_vocabulary_weight then
    raise exception 'vocabulary_weight_mismatch' using errcode = '22023';
  end if;
  if coalesce((select sum(c.weight) from jsonb_to_recordset(p_criteria) as c(key text, weight numeric) where c.key = 'required_patterns'), 0) <> v_pattern_weight then
    raise exception 'pattern_weight_mismatch' using errcode = '22023';
  end if;

  v_class_count := cardinality(coalesce(p_class_ids, array[]::uuid[]));
  if v_class_count < 1 or v_class_count > 200 then
    raise exception 'assignment_class_required' using errcode = '22023';
  end if;
  if (select count(distinct id) from unnest(p_class_ids) id) <> v_class_count then
    raise exception 'duplicate_assignment_class' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(p_class_ids) class_id
    where not exists (
      select 1
      from public.school_classes c
      join public.teacher_classes tc on tc.class_id = c.id
      where c.id = class_id
        and c.school_id = p_school_id
        and tc.teacher_id = auth.uid()
    )
  ) then
    raise exception 'assignment_class_not_owned' using errcode = '42501';
  end if;

  if p_topic_id is not null and not exists (
    select 1
    from public.catalog_topics t
    where t.id = p_topic_id
      and (t.school_id is null or t.school_id = p_school_id)
  ) then
    raise exception 'invalid_assignment_topic' using errcode = '42501';
  end if;

  select coalesce(bool_or(c.is_custom), false)
  into v_is_custom
  from jsonb_to_recordset(p_criteria) as c(is_custom boolean);

  insert into public.assignment_rubrics (is_custom)
  values (v_is_custom)
  returning id into v_rubric_id;

  insert into public.rubric_criteria (
    rubric_id, key, name_key, description_key, weight, max_score,
    is_custom, is_core, enabled, sort_order
  )
  select
    v_rubric_id,
    c.key,
    c.name_key,
    nullif(c.description_key, ''),
    c.weight,
    c.max_score,
    coalesce(c.is_custom, false),
    coalesce(c.is_core, false),
    coalesce(c.enabled, true),
    c.sort_order
  from jsonb_to_recordset(p_criteria) as c(
    key text,
    name_key text,
    description_key text,
    weight numeric,
    max_score integer,
    is_custom boolean,
    is_core boolean,
    enabled boolean,
    sort_order integer
  )
  order by c.sort_order;

  insert into public.assignments (
    title, prompt, writing_type_id, level, min_words, max_words,
    suggested_min_words, suggested_max_words, due_at, time_limit_minutes,
    instructions, reference_text, vocabulary_requirements, pattern_requirements,
    max_points, scoring_breakdown, shared_with_school, ai_support_mode,
    rubric_id, show_ai_score_immediately, status, created_by, school_id, topic_id
  ) values (
    trim(p_title), trim(p_prompt), p_writing_type_id, p_level, p_min_words, p_max_words,
    p_min_words, p_max_words, p_due_at, p_time_limit_minutes,
    nullif(trim(coalesce(p_instructions, '')), ''),
    nullif(trim(coalesce(p_reference_text, '')), ''),
    nullif(trim(coalesce(p_vocabulary_requirements, '')), ''),
    nullif(trim(coalesce(p_pattern_requirements, '')), ''),
    p_max_points, p_scoring_breakdown, coalesce(p_shared_with_school, true), p_ai_support_mode,
    v_rubric_id, coalesce(p_show_ai_score_immediately, false), p_status, auth.uid(), p_school_id, p_topic_id
  ) returning id into v_assignment_id;

  insert into public.assignment_classes (assignment_id, class_id)
  select v_assignment_id, class_id
  from unnest(p_class_ids) class_id;

  return v_assignment_id;
end;
$$;

revoke all on function public.create_advanced_writing_assignment(
  text, text, text, text, integer, integer, timestamptz, integer, uuid[], text, text,
  text, text, numeric, jsonb, jsonb, text, boolean, boolean, text, uuid, uuid
) from public, anon;

grant execute on function public.create_advanced_writing_assignment(
  text, text, text, text, integer, integer, timestamptz, integer, uuid[], text, text,
  text, text, numeric, jsonb, jsonb, text, boolean, boolean, text, uuid, uuid
) to authenticated;

comment on function public.create_advanced_writing_assignment(
  text, text, text, text, integer, integer, timestamptz, integer, uuid[], text, text,
  text, text, numeric, jsonb, jsonb, text, boolean, boolean, text, uuid, uuid
) is 'Atomically creates an advanced writing assignment, rubric, criteria and class links after validating teacher/school/scoring consistency.';
