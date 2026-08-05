-- Fixes a gap in the original profiles SELECT policy: teacher rows always
-- have school_id = NULL (they use teacher_schools, not a single column),
-- so "school_id is not null and is_teacher_of_school(school_id)" could
-- never match a teacher target row. That silently blocked:
--   - a student reading their own teacher's display name (assignment cards)
--   - a teacher reading their colleagues' profiles (TeamPage)

create or replace function public.current_school_ids()
returns uuid[] language sql stable security definer set search_path = public as $$
  select case
    when (select role from profiles where id = auth.uid()) = 'student'
      then array_remove(array[(select school_id from profiles where id = auth.uid())], null)
    when (select role from profiles where id = auth.uid()) = 'teacher'
      then coalesce((select array_agg(school_id) from teacher_schools where teacher_id = auth.uid()), array[]::uuid[])
    else array[]::uuid[]
  end
$$;

drop policy if exists "profile self or same-school staff" on profiles;

create policy "profile visible to self admin or same-school member" on profiles for select using (
  id = auth.uid()
  or is_admin()
  or (app_current_role() = 'teacher' and school_id is not null and school_id = any(current_school_ids()))
  or (role = 'teacher' and exists (
    select 1 from teacher_schools ts where ts.teacher_id = profiles.id and ts.school_id = any(current_school_ids())
  ))
);
