-- Immediate security hotfix applied to production on 2026-08-06.

create or replace function public.guard_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  if auth.uid() is null or old.id <> auth.uid() then
    raise exception 'profile_update_forbidden' using errcode = '42501';
  end if;

  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.username is distinct from old.username
     or new.status is distinct from old.status
     or new.must_change_password is distinct from old.must_change_password
     or new.school_id is distinct from old.school_id
     or new.created_at is distinct from old.created_at
     or new.expires_at is distinct from old.expires_at then
    raise exception 'protected_profile_field' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_profile_sensitive_fields() from public, anon, authenticated;

drop trigger if exists guard_profile_sensitive_fields_trigger on public.profiles;
create trigger guard_profile_sensitive_fields_trigger
before update on public.profiles
for each row execute function public.guard_profile_sensitive_fields();

drop policy if exists "rubric managed by staff" on public.assignment_rubrics;
create policy "rubric managed by authorized staff"
on public.assignment_rubrics for all
using (public.is_admin() or (public.app_current_role() = 'teacher' and public.has_teacher_permission('create_assignments')))
with check (public.is_admin() or (public.app_current_role() = 'teacher' and public.has_teacher_permission('create_assignments')));

drop policy if exists "rubric criteria managed by staff" on public.rubric_criteria;
create policy "rubric criteria managed by authorized staff"
on public.rubric_criteria for all
using (public.is_admin() or (public.app_current_role() = 'teacher' and public.has_teacher_permission('create_assignments')))
with check (public.is_admin() or (public.app_current_role() = 'teacher' and public.has_teacher_permission('create_assignments')));

drop policy if exists "rubric visible via assignment" on public.assignment_rubrics;
create policy "rubric visible via assignment"
on public.assignment_rubrics for select
using (
  public.is_admin()
  or exists (
    select 1 from public.assignments a
    where a.rubric_id = assignment_rubrics.id
      and (a.school_id = public.current_school_id() or public.is_teacher_of_school(a.school_id))
  )
);

drop policy if exists "rubric criteria visible via rubric" on public.rubric_criteria;
create policy "rubric criteria visible via rubric"
on public.rubric_criteria for select
using (
  public.is_admin()
  or exists (
    select 1 from public.assignments a
    where a.rubric_id = rubric_criteria.rubric_id
      and (a.school_id = public.current_school_id() or public.is_teacher_of_school(a.school_id))
  )
);

do $$
declare
  relation_record record;
begin
  for relation_record in
    select format('%I.%I', schemaname, tablename) as relation_name
    from pg_tables where schemaname = 'public'
  loop
    execute format(
      'revoke truncate, references, trigger on table %s from anon, authenticated',
      relation_record.relation_name
    );
  end loop;
end;
$$;

alter default privileges in schema public revoke truncate, references, trigger on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public;

revoke execute on function public.notify_grade_ready() from public, anon, authenticated;
revoke execute on function public.notify_new_assignment() from public, anon, authenticated;
revoke execute on function public.notify_new_assignment_on_class_link() from public, anon, authenticated;
revoke execute on function public.send_due_soon_reminders() from public, anon, authenticated;
grant execute on function public.send_due_soon_reminders() to service_role;

revoke execute on function public.app_current_role() from public, anon;
revoke execute on function public.current_school_id() from public, anon;
revoke execute on function public.current_school_ids() from public, anon;
revoke execute on function public.has_teacher_permission(text) from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.is_teacher_of_school(uuid) from public, anon;
grant execute on function public.app_current_role() to authenticated;
grant execute on function public.current_school_id() to authenticated;
grant execute on function public.current_school_ids() to authenticated;
grant execute on function public.has_teacher_permission(text) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_teacher_of_school(uuid) to authenticated;
