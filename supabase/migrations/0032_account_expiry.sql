-- Activation codes already have an expires_at (the redemption deadline),
-- but the account created by redeeming one never expired — someone who
-- activated a day before the code's deadline got unlimited use forever
-- after. Carries the code's own expiry over onto the resulting account:
-- profiles.expires_at is null (never expires) unless set this way, so
-- existing accounts and the super_admin bootstrap account are unaffected.

alter table profiles add column expires_at timestamptz;

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
  v_rows_updated int;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_code from activation_codes
    where code = p_code and status = 'unused' and expires_at >= now();
  if not found then
    raise exception 'code_unavailable';
  end if;

  if v_code.role = 'teacher' then
    insert into profiles (id, role, username, display_name, email, phone, status, expires_at)
    values (auth.uid(), 'teacher', p_username, p_display_name, nullif(p_email, ''), nullif(p_phone, ''), 'active', v_code.expires_at);

    insert into teacher_schools (teacher_id, school_id) values (auth.uid(), v_code.school_id);

    insert into teacher_permissions (teacher_id, permission)
    select auth.uid(), p from unnest(array[
      'manage_school_settings', 'manage_teachers', 'manage_classes', 'manage_students',
      'reset_student_passwords', 'manage_school_catalog', 'create_assignments',
      'view_own_class_results', 'view_all_school_results', 'view_student_portfolios', 'export_reports'
    ]) as p;
  else
    insert into profiles (id, role, username, display_name, email, phone, school_id, status, expires_at)
    values (auth.uid(), 'student', p_username, p_display_name, nullif(p_email, ''), nullif(p_phone, ''), v_code.school_id, 'active', v_code.expires_at);

    insert into student_classes (student_id, class_id) values (auth.uid(), v_code.class_id);
  end if;

  update activation_codes
    set status = 'used', used_by_student_id = auth.uid(), used_at = now()
    where code = p_code and status = 'unused' and expires_at >= now();

  get diagnostics v_rows_updated = row_count;
  if v_rows_updated = 0 then
    raise exception 'code_unavailable';
  end if;
end;
$$;
