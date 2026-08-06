-- Supabase projects may have an explicit EXECUTE grant for anon in addition to
-- PUBLIC defaults. Keep this destructive RPC available only to authenticated
-- sessions; the function itself also verifies the caller is a super_admin.
revoke all on function public.admin_delete_user(uuid) from public;
revoke all on function public.admin_delete_user(uuid) from anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;
