-- Student self-activation flow. These run as SECURITY DEFINER so an
-- unauthenticated (anon) caller can check a code / username without the
-- broader RLS-protected tables being exposed directly.
--
-- IMPORTANT: this flow relies on new accounts arriving already
-- "confirmed" (Pasific's synthetic @accounts.pasific.app addresses can
-- never receive a real confirmation email). In the Supabase Dashboard,
-- go to Authentication → Sign In / Providers → Email and turn OFF
-- "Confirm email" before testing activation from the app.

create or replace function public.is_username_taken(p_username text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where username = p_username)
$$;
grant execute on function public.is_username_taken(text) to anon, authenticated;

create or replace function public.validate_activation_code(p_code text)
returns table (code_status text, school_name text, class_name text)
language plpgsql stable security definer set search_path = public as $$
declare
  v_row activation_codes%rowtype;
begin
  select * into v_row from activation_codes where code = p_code;

  if not found then
    return query select 'not_found', null::text, null::text;
    return;
  end if;

  if v_row.status = 'unused' and v_row.expires_at < now() then
    return query select 'expired', null::text, null::text;
    return;
  end if;

  return query
    select v_row.status,
           (select name from schools where id = v_row.school_id),
           (select name from school_classes where id = v_row.class_id);
end;
$$;
grant execute on function public.validate_activation_code(text) to anon, authenticated;

-- Called right after supabase.auth.signUp() succeeds, so auth.uid() is the
-- newly created user. Atomically claims the code and creates the profile;
-- raises an exception (caught client-side) on any failure so nothing is
-- left half-done.
create or replace function public.claim_activation_code(
  p_code text,
  p_username text,
  p_display_name text,
  p_email text,
  p_phone text
)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_code activation_codes%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  update activation_codes
    set status = 'used', used_by_student_id = auth.uid(), used_at = now()
    where code = p_code and status = 'unused' and expires_at >= now()
    returning * into v_code;

  if not found then
    raise exception 'code_unavailable';
  end if;

  insert into profiles (id, role, username, display_name, email, phone, school_id, status)
  values (auth.uid(), 'student', p_username, p_display_name, nullif(p_email, ''), nullif(p_phone, ''), v_code.school_id, 'active');

  insert into student_classes (student_id, class_id) values (auth.uid(), v_code.class_id);
end;
$$;
grant execute on function public.claim_activation_code(text, text, text, text, text) to authenticated;
