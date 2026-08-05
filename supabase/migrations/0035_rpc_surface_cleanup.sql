-- Remove obsolete and accidentally public RPC surfaces.

drop function if exists public.check_recovery_contact(text, text);

revoke all on function public.claim_activation_code(text, text, text, text, text) from public, anon;
grant execute on function public.claim_activation_code(text, text, text, text, text) to authenticated;

revoke all on function public.create_class_for_teacher(uuid, text, text) from public, anon;
grant execute on function public.create_class_for_teacher(uuid, text, text) to authenticated;

-- These are intentionally callable before sign-in for the activation screen.
revoke all on function public.is_username_taken(text) from public, authenticated;
grant execute on function public.is_username_taken(text) to anon;

revoke all on function public.validate_activation_code(text) from public, authenticated;
grant execute on function public.validate_activation_code(text) to anon;
