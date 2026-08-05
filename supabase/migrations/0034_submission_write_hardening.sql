-- Move grading authority to the trusted Railway service and enforce account
-- status/expiry at the database boundary.

create or replace function public.is_current_account_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'active'
      and (expires_at is null or expires_at > now())
  )
$$;

revoke execute on function public.is_current_account_active() from public, anon;
grant execute on function public.is_current_account_active() to authenticated;

create or replace function public.app_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and status = 'active'
    and (expires_at is null or expires_at > now())
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'super_admin'
      and status = 'active'
      and (expires_at is null or expires_at > now())
  )
$$;

create or replace function public.is_teacher_of_school(target_school uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_current_account_active()
    and exists (
      select 1 from public.teacher_schools
      where teacher_id = auth.uid() and school_id = target_school
    )
$$;

create or replace function public.has_teacher_permission(perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_current_account_active()
    and exists (
      select 1 from public.teacher_permissions
      where teacher_id = auth.uid() and permission = perm
    )
$$;

create or replace function public.current_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select school_id
  from public.profiles
  where id = auth.uid()
    and status = 'active'
    and (expires_at is null or expires_at > now())
$$;

create or replace function public.current_school_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.is_current_account_active() then array[]::uuid[]
    when (select role from public.profiles where id = auth.uid()) = 'student'
      then array_remove(array[(select school_id from public.profiles where id = auth.uid())], null)
    when (select role from public.profiles where id = auth.uid()) = 'teacher'
      then coalesce(
        (select array_agg(school_id) from public.teacher_schools where teacher_id = auth.uid()),
        array[]::uuid[]
      )
    else array[]::uuid[]
  end
$$;

create or replace function public.guard_submission_insert()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  expected_school_id uuid;
  expected_writing_type text;
  expected_level text;
  expected_score_visibility boolean;
  expected_custom_rubric boolean;
begin
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

create or replace function public.guard_submission_update()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_role text := public.app_current_role();
begin
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  if not public.is_current_account_active() then
    raise exception 'inactive_account' using errcode = '42501';
  end if;

  if caller_role = 'student' then
    if old.student_id <> auth.uid() then
      raise exception 'submission_update_forbidden' using errcode = '42501';
    end if;

    if new.id is distinct from old.id
       or new.assignment_id is distinct from old.assignment_id
       or new.is_practice is distinct from old.is_practice
       or new.student_id is distinct from old.student_id
       or new.school_id is distinct from old.school_id
       or new.writing_type_id is distinct from old.writing_type_id
       or new.level is distinct from old.level
       or new.topic_title is distinct from old.topic_title
       or new.final_score is distinct from old.final_score
       or new.ai_score is distinct from old.ai_score
       or new.score_visible_to_student is distinct from old.score_visible_to_student
       or new.teacher_feedback is distinct from old.teacher_feedback
       or new.reviewed_by is distinct from old.reviewed_by
       or new.reviewed_at is distinct from old.reviewed_at
       or new.uses_custom_rubric is distinct from old.uses_custom_rubric
       or new.created_at is distinct from old.created_at then
      raise exception 'server_managed_submission_fields' using errcode = '42501';
    end if;

    if old.status not in ('not_started', 'in_progress')
       and (new.text is distinct from old.text or new.word_count is distinct from old.word_count) then
      raise exception 'submitted_text_is_immutable' using errcode = '42501';
    end if;

    if new.status is distinct from old.status
       and not (
         (old.status = 'not_started' and new.status in ('in_progress', 'submitted'))
         or (old.status = 'in_progress' and new.status = 'submitted')
       ) then
      raise exception 'invalid_student_status_transition' using errcode = '42501';
    end if;

    if new.submitted_at is distinct from old.submitted_at
       and not (old.submitted_at is null and new.status = 'submitted' and new.submitted_at is not null) then
      raise exception 'invalid_submitted_at_change' using errcode = '42501';
    end if;

    return new;
  end if;

  if caller_role = 'teacher' and public.is_teacher_of_school(old.school_id) then
    if new.id is distinct from old.id
       or new.assignment_id is distinct from old.assignment_id
       or new.is_practice is distinct from old.is_practice
       or new.student_id is distinct from old.student_id
       or new.school_id is distinct from old.school_id
       or new.writing_type_id is distinct from old.writing_type_id
       or new.level is distinct from old.level
       or new.topic_title is distinct from old.topic_title
       or new.text is distinct from old.text
       or new.word_count is distinct from old.word_count
       or new.submitted_at is distinct from old.submitted_at
       or new.last_saved_at is distinct from old.last_saved_at
       or new.ai_score is distinct from old.ai_score
       or new.uses_custom_rubric is distinct from old.uses_custom_rubric
       or new.created_at is distinct from old.created_at then
      raise exception 'teacher_cannot_change_submission_source' using errcode = '42501';
    end if;

    if new.status is distinct from old.status
       and not (old.status in ('teacher_review_pending', 'result_ready') and new.status = 'result_ready') then
      raise exception 'invalid_teacher_status_transition' using errcode = '42501';
    end if;

    return new;
  end if;

  raise exception 'submission_update_forbidden' using errcode = '42501';
end;
$$;

revoke all on function public.guard_submission_insert() from public, anon, authenticated;
revoke all on function public.guard_submission_update() from public, anon, authenticated;

drop trigger if exists guard_submission_insert_trigger on public.submissions;
create trigger guard_submission_insert_trigger
before insert on public.submissions
for each row execute function public.guard_submission_insert();

drop trigger if exists guard_submission_update_trigger on public.submissions;
create trigger guard_submission_update_trigger
before update on public.submissions
for each row execute function public.guard_submission_update();

create or replace function public.guard_criterion_score_update()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_school uuid;
begin
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  select school_id into target_school
  from public.submissions
  where id = old.submission_id;

  if public.app_current_role() <> 'teacher' or not public.is_teacher_of_school(target_school) then
    raise exception 'criterion_score_update_forbidden' using errcode = '42501';
  end if;

  if new.id is distinct from old.id
     or new.submission_id is distinct from old.submission_id
     or new.criterion_id is distinct from old.criterion_id
     or new.criterion_key is distinct from old.criterion_key
     or new.ai_score is distinct from old.ai_score
     or new.max_score is distinct from old.max_score
     or new.weight is distinct from old.weight
     or new.explanation is distinct from old.explanation
     or new.evidence_quote is distinct from old.evidence_quote
     or new.strong_aspects is distinct from old.strong_aspects
     or new.development_areas is distinct from old.development_areas then
    raise exception 'only_teacher_score_is_editable' using errcode = '42501';
  end if;

  if new.teacher_score is not null and (new.teacher_score < 0 or new.teacher_score > old.max_score) then
    raise exception 'teacher_score_out_of_range' using errcode = '22003';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_criterion_score_update() from public, anon, authenticated;

drop trigger if exists guard_criterion_score_update_trigger on public.criterion_scores;
create trigger guard_criterion_score_update_trigger
before update on public.criterion_scores
for each row execute function public.guard_criterion_score_update();

-- Replace broad submission and result-write policies.
drop policy if exists "submission visible to owner or school staff" on public.submissions;
create policy "submission visible to active owner or school staff"
on public.submissions for select
using (
  public.is_current_account_active()
  and (public.is_admin() or student_id = auth.uid() or public.is_teacher_of_school(school_id))
);

drop policy if exists "submission writable by owner" on public.submissions;
drop policy if exists "submission updatable by owner or staff" on public.submissions;

create policy "submission insertable by active student"
on public.submissions for insert to authenticated
with check (
  public.is_current_account_active()
  and public.app_current_role() = 'student'
  and student_id = auth.uid()
);

create policy "submission draft updatable by owner"
on public.submissions for update to authenticated
using (public.is_current_account_active() and student_id = auth.uid())
with check (public.is_current_account_active() and student_id = auth.uid());

create policy "submission reviewable by school staff"
on public.submissions for update to authenticated
using (public.is_admin() or public.is_teacher_of_school(school_id))
with check (public.is_admin() or public.is_teacher_of_school(school_id));

drop policy if exists "criterion_scores follow submission" on public.criterion_scores;
create policy "criterion scores readable through active submission access"
on public.criterion_scores for select
using (
  public.is_current_account_active()
  and exists (
    select 1 from public.submissions s
    where s.id = submission_id
      and (public.is_admin() or s.student_id = auth.uid() or public.is_teacher_of_school(s.school_id))
  )
);

drop policy if exists "criterion_scores writable via submission access" on public.criterion_scores;
create policy "criterion scores teacher editable"
on public.criterion_scores for update to authenticated
using (
  public.app_current_role() = 'teacher'
  and exists (
    select 1 from public.submissions s
    where s.id = submission_id and public.is_teacher_of_school(s.school_id)
  )
)
with check (
  public.app_current_role() = 'teacher'
  and exists (
    select 1 from public.submissions s
    where s.id = submission_id and public.is_teacher_of_school(s.school_id)
  )
);

drop policy if exists "annotations follow submission" on public.writing_annotations;
create policy "annotations readable through active submission access"
on public.writing_annotations for select
using (
  public.is_current_account_active()
  and exists (
    select 1 from public.submissions s
    where s.id = submission_id
      and (public.is_admin() or s.student_id = auth.uid() or public.is_teacher_of_school(s.school_id))
  )
);

drop policy if exists "annotations writable via submission access" on public.writing_annotations;

drop policy if exists "study_recommendations follow submission" on public.study_recommendations;
create policy "recommendations readable through active submission access"
on public.study_recommendations for select
using (
  public.is_current_account_active()
  and exists (
    select 1 from public.submissions s
    where s.id = submission_id
      and (public.is_admin() or s.student_id = auth.uid() or public.is_teacher_of_school(s.school_id))
  )
);

drop policy if exists "study_recommendations writable via submission access" on public.study_recommendations;

drop policy if exists "teacher_overrides writable by school staff" on public.teacher_overrides;
create policy "teacher overrides insertable by linked teacher"
on public.teacher_overrides for insert to authenticated
with check (
  teacher_id = auth.uid()
  and public.app_current_role() = 'teacher'
  and exists (
    select 1 from public.submissions s
    where s.id = submission_id and public.is_teacher_of_school(s.school_id)
  )
);

-- Account status/expiry also applies to direct owner policies.
drop policy if exists "profile visible to self admin or same-school member" on public.profiles;
create policy "profile visible to active self admin or same-school member"
on public.profiles for select
using (
  public.is_current_account_active()
  and (
    id = auth.uid()
    or public.is_admin()
    or (public.app_current_role() = 'teacher' and school_id is not null and school_id = any(public.current_school_ids()))
    or (role = 'teacher' and exists (
      select 1 from public.teacher_schools ts
      where ts.teacher_id = profiles.id and ts.school_id = any(public.current_school_ids())
    ))
  )
);

drop policy if exists "profile self update" on public.profiles;
create policy "profile self contact update"
on public.profiles for update to authenticated
using (public.is_current_account_active() and id = auth.uid())
with check (public.is_current_account_active() and id = auth.uid());

create policy "profile admin update"
on public.profiles for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "student_classes visible" on public.student_classes;
create policy "student_classes visible to active members"
on public.student_classes for select
using (
  public.is_current_account_active()
  and (
    public.is_admin()
    or student_id = auth.uid()
    or exists (
      select 1 from public.school_classes c
      where c.id = class_id and public.is_teacher_of_school(c.school_id)
    )
  )
);

-- Least-privilege grants. RLS and triggers provide row/role checks; column
-- grants prevent protected fields from being sent by ordinary clients.
revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant update (display_name, email, phone, title, last_login_at, status) on public.profiles to authenticated;

revoke all on public.submissions from anon;
revoke insert, update, delete on public.submissions from authenticated;
grant insert (
  assignment_id, is_practice, student_id, school_id, writing_type_id, level,
  topic_title, text, word_count, status, submitted_at, last_saved_at,
  score_visible_to_student, uses_custom_rubric
) on public.submissions to authenticated;
grant update (
  text, word_count, status, submitted_at, last_saved_at, final_score,
  score_visible_to_student, teacher_feedback, reviewed_by, reviewed_at
) on public.submissions to authenticated;

revoke insert, update, delete on public.criterion_scores from anon, authenticated;
grant update (teacher_score) on public.criterion_scores to authenticated;
revoke insert, update, delete on public.writing_annotations from anon, authenticated;
revoke insert, update, delete on public.study_recommendations from anon, authenticated;
revoke insert, update, delete on public.teacher_overrides from anon, authenticated;
grant insert (
  submission_id, criterion_id, original_ai_score, final_score, reason, teacher_id
) on public.teacher_overrides to authenticated;

revoke insert, update, delete on public.assignment_rubrics from anon;
revoke insert, update, delete on public.rubric_criteria from anon;

revoke all on public.school_stats from anon, authenticated;
grant select on public.school_stats to authenticated;
