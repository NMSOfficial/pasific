-- Fixes claim_activation_code: it set activation_codes.used_by_student_id
-- = auth.uid() BEFORE inserting the matching profiles row, but that column
-- has a foreign key into profiles(id) — the row must exist first. Reorders
-- to: validate the code -> create the profile (+ school/class link) ->
-- THEN mark the code used. The final UPDATE keeps the same race-safety as
-- before (WHERE status = 'unused'); if it affects 0 rows because someone
-- else claimed the code in between, we raise and the whole transaction
-- (including the profile insert) rolls back.

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
    insert into profiles (id, role, username, display_name, email, phone, status)
    values (auth.uid(), 'teacher', p_username, p_display_name, nullif(p_email, ''), nullif(p_phone, ''), 'active');

    insert into teacher_schools (teacher_id, school_id) values (auth.uid(), v_code.school_id);
  else
    insert into profiles (id, role, username, display_name, email, phone, school_id, status)
    values (auth.uid(), 'student', p_username, p_display_name, nullif(p_email, ''), nullif(p_phone, ''), v_code.school_id, 'active');

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
