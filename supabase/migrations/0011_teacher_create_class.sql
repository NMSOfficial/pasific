-- Lets a teacher (with manage_classes permission) create a class at their
-- own school and be linked to it automatically. A plain client-side insert
-- can't do the second part: teacher_classes only has an admin-managed RLS
-- policy, so a teacher has no way to link themselves to a class they just
-- created. This function does both atomically, checking authorization
-- itself since SECURITY DEFINER bypasses RLS.

create or replace function public.create_class_for_teacher(p_school_id uuid, p_name text, p_grade_label text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_class_id uuid;
begin
  if not (is_teacher_of_school(p_school_id) and has_teacher_permission('manage_classes')) then
    raise exception 'not_authorized';
  end if;

  insert into school_classes (school_id, name, grade_label) values (p_school_id, p_name, nullif(p_grade_label, ''))
    returning id into v_class_id;

  insert into teacher_classes (teacher_id, class_id) values (auth.uid(), v_class_id);

  return v_class_id;
end;
$$;
grant execute on function public.create_class_for_teacher(uuid, text, text) to authenticated;
