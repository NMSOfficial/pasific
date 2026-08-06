-- Allow an authenticated super administrator to delete teacher/student accounts
-- without exposing or depending on a service-role API key in the application server.
create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  requester_role text;
  target_role text;
begin
  select role
    into requester_role
    from public.profiles
   where id = auth.uid();

  if requester_role is distinct from 'super_admin' then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'You cannot delete your own account' using errcode = '22023';
  end if;

  select role
    into target_role
    from public.profiles
   where id = p_user_id;

  if target_role is null then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  if target_role not in ('teacher', 'student') then
    raise exception 'Only teacher or student accounts can be deleted' using errcode = '42501';
  end if;

  delete from auth.users where id = p_user_id;

  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public;
grant execute on function public.admin_delete_user(uuid) to authenticated;
