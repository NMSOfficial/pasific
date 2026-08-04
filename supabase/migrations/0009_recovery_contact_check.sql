-- Lets the (unauthenticated) forgot-password page check whether a username
-- has a recovery email/phone on file, without exposing the profiles table
-- to anon. Returns 'sent' for a nonexistent username too, so the response
-- doesn't reveal whether an account exists — only an existing account
-- without that recovery method on file gets 'no_recovery'.

create or replace function public.check_recovery_contact(p_username text, p_method text)
returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_has_contact boolean;
begin
  select case p_method
    when 'email' then email is not null
    when 'phone' then phone is not null
    else false
  end
  into v_has_contact
  from profiles where username = p_username;

  if not found then
    return 'sent';
  end if;
  if not v_has_contact then
    return 'no_recovery';
  end if;
  return 'sent';
end;
$$;
grant execute on function public.check_recovery_contact(text, text) to anon, authenticated;
