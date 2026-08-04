-- Row Level Security: students see only their own data, teachers see their
-- school's data, super_admin sees everything. Run after 0001_schema.sql.

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so they can read `profiles` without
-- triggering the RLS policy that is being evaluated — avoids recursion).
-- ---------------------------------------------------------------------------

create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'super_admin')
$$;

create or replace function public.is_teacher_of_school(target_school uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from teacher_schools where teacher_id = auth.uid() and school_id = target_school
  )
$$;

create or replace function public.has_teacher_permission(perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from teacher_permissions where teacher_id = auth.uid() and permission = perm
  )
$$;

create or replace function public.current_school_id()
returns uuid language sql stable security definer set search_path = public as $$
  select school_id from profiles where id = auth.uid()
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------

alter table schools enable row level security;
alter table school_classes enable row level security;
alter table profiles enable row level security;
alter table student_classes enable row level security;
alter table teacher_schools enable row level security;
alter table teacher_classes enable row level security;
alter table teacher_permissions enable row level security;
alter table activation_codes enable row level security;
alter table catalog_topics enable row level security;
alter table catalog_visibility_overrides enable row level security;
alter table assignment_rubrics enable row level security;
alter table rubric_criteria enable row level security;
alter table assignments enable row level security;
alter table assignment_classes enable row level security;
alter table submissions enable row level security;
alter table criterion_scores enable row level security;
alter table writing_annotations enable row level security;
alter table teacher_overrides enable row level security;
alter table study_recommendations enable row level security;
alter table writing_examples enable row level security;
alter table example_criterion_scores enable row level security;
alter table example_annotations enable row level security;
alter table audit_events enable row level security;
alter table writing_types enable row level security;
alter table error_categories enable row level security;

-- ---------------------------------------------------------------------------
-- Lookup tables: readable by every signed-in user
-- ---------------------------------------------------------------------------

create policy "lookup readable" on writing_types for select using (auth.role() = 'authenticated');
create policy "lookup readable" on error_categories for select using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- schools / school_classes
-- ---------------------------------------------------------------------------

create policy "school visible to members" on schools for select using (
  is_admin() or id = current_school_id() or is_teacher_of_school(id)
);
create policy "school managed by admin" on schools for all using (is_admin()) with check (is_admin());

create policy "class visible to school members" on school_classes for select using (
  is_admin() or school_id = current_school_id() or is_teacher_of_school(school_id)
);
create policy "class managed by school staff" on school_classes for all using (
  is_admin() or (is_teacher_of_school(school_id) and has_teacher_permission('manage_classes'))
) with check (
  is_admin() or (is_teacher_of_school(school_id) and has_teacher_permission('manage_classes'))
);

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy "profile self or same-school staff" on profiles for select using (
  id = auth.uid() or is_admin() or (school_id is not null and is_teacher_of_school(school_id))
);
create policy "profile self update" on profiles for update using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());
create policy "profile admin manage" on profiles for insert with check (is_admin());
create policy "profile admin delete" on profiles for delete using (is_admin());

create policy "student_classes visible" on student_classes for select using (
  is_admin()
  or student_id = auth.uid()
  or exists (select 1 from school_classes c where c.id = class_id and is_teacher_of_school(c.school_id))
);
create policy "student_classes managed by staff" on student_classes for all using (
  is_admin() or exists (
    select 1 from school_classes c where c.id = class_id
    and is_teacher_of_school(c.school_id) and has_teacher_permission('manage_students')
  )
) with check (
  is_admin() or exists (
    select 1 from school_classes c where c.id = class_id
    and is_teacher_of_school(c.school_id) and has_teacher_permission('manage_students')
  )
);

create policy "teacher_schools visible" on teacher_schools for select using (
  is_admin() or teacher_id = auth.uid() or is_teacher_of_school(school_id)
);
create policy "teacher_schools admin managed" on teacher_schools for all using (is_admin()) with check (is_admin());

create policy "teacher_classes visible" on teacher_classes for select using (
  is_admin() or teacher_id = auth.uid()
  or exists (select 1 from school_classes c where c.id = class_id and is_teacher_of_school(c.school_id))
);
create policy "teacher_classes admin managed" on teacher_classes for all using (is_admin()) with check (is_admin());

create policy "teacher_permissions visible" on teacher_permissions for select using (
  is_admin() or teacher_id = auth.uid() or is_teacher_of_school(current_school_id())
);
create policy "teacher_permissions admin managed" on teacher_permissions for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------------------
-- activation_codes
-- ---------------------------------------------------------------------------

create policy "activation codes visible to school staff" on activation_codes for select using (
  is_admin() or is_teacher_of_school(school_id)
);
create policy "activation codes managed by staff" on activation_codes for all using (
  is_admin() or (is_teacher_of_school(school_id) and has_teacher_permission('manage_students'))
) with check (
  is_admin() or (is_teacher_of_school(school_id) and has_teacher_permission('manage_students'))
);

-- ---------------------------------------------------------------------------
-- catalog
-- ---------------------------------------------------------------------------

create policy "catalog visible" on catalog_topics for select using (
  visibility = 'global' or is_admin() or school_id = current_school_id() or is_teacher_of_school(school_id)
);
create policy "catalog managed by staff" on catalog_topics for all using (
  is_admin() or (is_teacher_of_school(school_id) and has_teacher_permission('manage_school_catalog'))
) with check (
  is_admin() or (is_teacher_of_school(school_id) and has_teacher_permission('manage_school_catalog'))
);

create policy "catalog overrides visible" on catalog_visibility_overrides for select using (
  is_admin() or is_teacher_of_school(school_id) or school_id = current_school_id()
);
create policy "catalog overrides managed by staff" on catalog_visibility_overrides for all using (
  is_admin() or (is_teacher_of_school(school_id) and has_teacher_permission('manage_school_catalog'))
) with check (
  is_admin() or (is_teacher_of_school(school_id) and has_teacher_permission('manage_school_catalog'))
);

-- ---------------------------------------------------------------------------
-- rubrics / assignments
-- ---------------------------------------------------------------------------

create policy "rubric visible via assignment" on assignment_rubrics for select using (
  is_admin() or exists (
    select 1 from assignments a where a.rubric_id = id
    and (a.school_id = current_school_id() or is_teacher_of_school(a.school_id))
  )
);
create policy "rubric managed by staff" on assignment_rubrics for all using (is_admin() or auth.role() = 'authenticated')
  with check (is_admin() or auth.role() = 'authenticated');

create policy "rubric criteria visible via rubric" on rubric_criteria for select using (
  is_admin() or exists (
    select 1 from assignments a where a.rubric_id = rubric_id
    and (a.school_id = current_school_id() or is_teacher_of_school(a.school_id))
  )
);
create policy "rubric criteria managed by staff" on rubric_criteria for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "assignment visible to school" on assignments for select using (
  is_admin() or school_id = current_school_id() or is_teacher_of_school(school_id)
);
create policy "assignment managed by staff" on assignments for all using (
  is_admin() or (is_teacher_of_school(school_id) and has_teacher_permission('create_assignments'))
) with check (
  is_admin() or (is_teacher_of_school(school_id) and has_teacher_permission('create_assignments'))
);

create policy "assignment_classes visible" on assignment_classes for select using (
  is_admin() or exists (
    select 1 from assignments a where a.id = assignment_id
    and (a.school_id = current_school_id() or is_teacher_of_school(a.school_id))
  )
);
create policy "assignment_classes managed by staff" on assignment_classes for all using (
  is_admin() or exists (
    select 1 from assignments a where a.id = assignment_id and is_teacher_of_school(a.school_id)
    and has_teacher_permission('create_assignments')
  )
) with check (
  is_admin() or exists (
    select 1 from assignments a where a.id = assignment_id and is_teacher_of_school(a.school_id)
    and has_teacher_permission('create_assignments')
  )
);

-- ---------------------------------------------------------------------------
-- submissions and everything hanging off them
-- ---------------------------------------------------------------------------

create policy "submission visible to owner or school staff" on submissions for select using (
  is_admin() or student_id = auth.uid() or is_teacher_of_school(school_id)
);
create policy "submission writable by owner" on submissions for insert with check (
  student_id = auth.uid() or is_admin()
);
create policy "submission updatable by owner or staff" on submissions for update using (
  is_admin() or student_id = auth.uid() or is_teacher_of_school(school_id)
) with check (
  is_admin() or student_id = auth.uid() or is_teacher_of_school(school_id)
);

create policy "criterion_scores follow submission" on criterion_scores for select using (
  exists (
    select 1 from submissions s where s.id = submission_id
    and (is_admin() or s.student_id = auth.uid() or is_teacher_of_school(s.school_id))
  )
);
create policy "criterion_scores writable via submission access" on criterion_scores for all using (
  exists (
    select 1 from submissions s where s.id = submission_id
    and (is_admin() or s.student_id = auth.uid() or is_teacher_of_school(s.school_id))
  )
) with check (
  exists (
    select 1 from submissions s where s.id = submission_id
    and (is_admin() or s.student_id = auth.uid() or is_teacher_of_school(s.school_id))
  )
);

create policy "annotations follow submission" on writing_annotations for select using (
  exists (
    select 1 from submissions s where s.id = submission_id
    and (is_admin() or s.student_id = auth.uid() or is_teacher_of_school(s.school_id))
  )
);
create policy "annotations writable via submission access" on writing_annotations for all using (
  exists (
    select 1 from submissions s where s.id = submission_id
    and (is_admin() or s.student_id = auth.uid() or is_teacher_of_school(s.school_id))
  )
) with check (
  exists (
    select 1 from submissions s where s.id = submission_id
    and (is_admin() or s.student_id = auth.uid() or is_teacher_of_school(s.school_id))
  )
);

create policy "teacher_overrides follow submission" on teacher_overrides for select using (
  exists (
    select 1 from submissions s where s.id = submission_id
    and (is_admin() or s.student_id = auth.uid() or is_teacher_of_school(s.school_id))
  )
);
create policy "teacher_overrides writable by school staff" on teacher_overrides for insert with check (
  is_admin() or exists (
    select 1 from submissions s where s.id = submission_id and is_teacher_of_school(s.school_id)
  )
);

create policy "study_recommendations follow submission" on study_recommendations for select using (
  exists (
    select 1 from submissions s where s.id = submission_id
    and (is_admin() or s.student_id = auth.uid() or is_teacher_of_school(s.school_id))
  )
);
create policy "study_recommendations writable via submission access" on study_recommendations for all using (
  exists (
    select 1 from submissions s where s.id = submission_id
    and (is_admin() or s.student_id = auth.uid() or is_teacher_of_school(s.school_id))
  )
) with check (
  exists (
    select 1 from submissions s where s.id = submission_id
    and (is_admin() or s.student_id = auth.uid() or is_teacher_of_school(s.school_id))
  )
);

-- ---------------------------------------------------------------------------
-- writing examples (library content — global read, staff-managed write)
-- ---------------------------------------------------------------------------

create policy "examples readable by all signed-in users" on writing_examples for select using (
  auth.role() = 'authenticated'
);
create policy "examples managed by admin or catalog staff" on writing_examples for all using (
  is_admin() or has_teacher_permission('manage_school_catalog')
) with check (
  is_admin() or has_teacher_permission('manage_school_catalog')
);

create policy "example_criterion_scores readable" on example_criterion_scores for select using (
  auth.role() = 'authenticated'
);
create policy "example_criterion_scores managed" on example_criterion_scores for all using (
  is_admin() or has_teacher_permission('manage_school_catalog')
) with check (
  is_admin() or has_teacher_permission('manage_school_catalog')
);

create policy "example_annotations readable" on example_annotations for select using (
  auth.role() = 'authenticated'
);
create policy "example_annotations managed" on example_annotations for all using (
  is_admin() or has_teacher_permission('manage_school_catalog')
) with check (
  is_admin() or has_teacher_permission('manage_school_catalog')
);

-- ---------------------------------------------------------------------------
-- audit_events: write via server (service role) only, read by admin/staff
-- ---------------------------------------------------------------------------

create policy "audit visible to admin and involved school staff" on audit_events for select using (
  is_admin() or current_role() = 'teacher'
);
-- Inserts happen from trusted server code using the service_role key, which
-- bypasses RLS entirely — no client-facing insert policy is defined.
