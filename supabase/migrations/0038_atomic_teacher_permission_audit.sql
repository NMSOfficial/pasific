-- Keep the permission replacement and its audit event in the same transaction.

create or replace function public.replace_teacher_permissions(
  p_teacher_id uuid,
  p_permissions text[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_permissions text[] := coalesce(p_permissions, array[]::text[]);
  actor_name text;
begin
  if not public.is_admin() then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = p_teacher_id
      and role = 'teacher'
  ) then
    raise exception 'Teacher not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from unnest(normalized_permissions) as requested(permission)
    where requested.permission is null
       or requested.permission not in (
         'manage_school_settings',
         'manage_teachers',
         'manage_classes',
         'manage_students',
         'reset_student_passwords',
         'manage_school_catalog',
         'create_assignments',
         'view_own_class_results',
         'view_all_school_results',
         'view_student_portfolios',
         'export_reports'
       )
  ) then
    raise exception 'Invalid teacher permission' using errcode = '22023';
  end if;

  delete from public.teacher_permissions
  where teacher_id = p_teacher_id;

  insert into public.teacher_permissions (teacher_id, permission)
  select p_teacher_id, requested.permission
  from (
    select distinct permission
    from unnest(normalized_permissions) as values_list(permission)
  ) as requested;

  select coalesce(display_name, username, auth.uid()::text)
    into actor_name
  from public.profiles
  where id = auth.uid();

  insert into public.audit_events (type, actor_id, actor_name, target_label, detail)
  values (
    'teacher_permission_changed',
    auth.uid(),
    coalesce(actor_name, auth.uid()::text),
    p_teacher_id::text,
    'Permissions set to: ' || coalesce(nullif(array_to_string(normalized_permissions, ', '), ''), 'none')
  );
end;
$$;

revoke all on function public.replace_teacher_permissions(uuid, text[]) from public;
revoke all on function public.replace_teacher_permissions(uuid, text[]) from anon;
grant execute on function public.replace_teacher_permissions(uuid, text[]) to authenticated;
grant execute on function public.replace_teacher_permissions(uuid, text[]) to service_role;
