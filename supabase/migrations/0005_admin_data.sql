-- Supports the admin panel: school/teacher/student management, activation
-- codes for BOTH students and teachers, and self-attested audit logging.

-- ---------------------------------------------------------------------------
-- Activation codes can now onboard a teacher too (no class required).
-- ---------------------------------------------------------------------------

alter table activation_codes add column role text not null default 'student' check (role in ('student', 'teacher'));
alter table activation_codes add constraint activation_codes_class_required_for_student
  check (role = 'teacher' or class_id is not null);

-- ---------------------------------------------------------------------------
-- Replace validate_activation_code to also report the code's role.
-- ---------------------------------------------------------------------------

drop function if exists public.validate_activation_code(text);

create or replace function public.validate_activation_code(p_code text)
returns table (code_status text, code_role text, school_name text, class_name text)
language plpgsql stable security definer set search_path = public as $$
declare
  v_row activation_codes%rowtype;
begin
  select * into v_row from activation_codes where code = p_code;

  if not found then
    return query select 'not_found', null::text, null::text, null::text;
    return;
  end if;

  if v_row.status = 'unused' and v_row.expires_at < now() then
    return query select 'expired', v_row.role, null::text, null::text;
    return;
  end if;

  return query
    select v_row.status, v_row.role,
           (select name from schools where id = v_row.school_id),
           (case when v_row.class_id is null then null else (select name from school_classes where id = v_row.class_id) end);
end;
$$;
grant execute on function public.validate_activation_code(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Replace claim_activation_code to branch on role.
-- ---------------------------------------------------------------------------

drop function if exists public.claim_activation_code(text, text, text, text, text);

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

  if v_code.role = 'teacher' then
    insert into profiles (id, role, username, display_name, email, phone, status)
    values (auth.uid(), 'teacher', p_username, p_display_name, nullif(p_email, ''), nullif(p_phone, ''), 'active');

    insert into teacher_schools (teacher_id, school_id) values (auth.uid(), v_code.school_id);
  else
    insert into profiles (id, role, username, display_name, email, phone, school_id, status)
    values (auth.uid(), 'student', p_username, p_display_name, nullif(p_email, ''), nullif(p_phone, ''), v_code.school_id, 'active');

    insert into student_classes (student_id, class_id) values (auth.uid(), v_code.class_id);
  end if;
end;
$$;
grant execute on function public.claim_activation_code(text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Aggregate school stats without denormalized counter columns.
-- security_invoker makes the view respect the querying user's own RLS
-- (schools/teacher_schools/profiles/etc.), not the view owner's.
-- ---------------------------------------------------------------------------

create view school_stats with (security_invoker = true) as
select
  s.id as school_id,
  coalesce(t.teacher_count, 0) as teacher_count,
  coalesce(st.student_count, 0) as student_count,
  coalesce(c.class_count, 0) as class_count,
  coalesce(a.active_assignment_count, 0) as active_assignment_count
from schools s
left join (select school_id, count(*) teacher_count from teacher_schools group by school_id) t on t.school_id = s.id
left join (select school_id, count(*) student_count from profiles where role = 'student' group by school_id) st on st.school_id = s.id
left join (select school_id, count(*) class_count from school_classes group by school_id) c on c.school_id = s.id
left join (select school_id, count(*) active_assignment_count from assignments where status = 'published' group by school_id) a on a.school_id = s.id;

-- ---------------------------------------------------------------------------
-- Let admins/teachers log their own actions (self-attested actor_id — they
-- cannot forge another user as the actor). Full trust in the audit trail's
-- contents would require routing writes through a trusted server instead.
-- ---------------------------------------------------------------------------

create policy "audit self-attested insert" on audit_events for insert with check (
  actor_id = auth.uid() and (is_admin() or app_current_role() = 'teacher')
);
