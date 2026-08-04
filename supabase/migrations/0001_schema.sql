-- Pasific core schema. Mirrors src/types/entities.ts.
-- Run this once in the Supabase SQL Editor (or `supabase db push`).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Lookup tables
-- ---------------------------------------------------------------------------

create table writing_types (
  id text primary key,
  category text not null check (category in ('essay', 'correspondence', 'creative', 'functional'))
);

create table error_categories (
  id text primary key,
  group_name text not null check (group_name in ('grammar', 'vocabulary', 'organisation', 'task_genre')),
  name_key text not null
);

-- ---------------------------------------------------------------------------
-- Schools / classes
-- ---------------------------------------------------------------------------

create table schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  status text not null default 'active' check (status in ('active', 'suspended')),
  plan_status text not null default 'pilot' check (plan_status in ('pilot', 'standard', 'trial_expired')),
  created_at timestamptz not null default now()
);

create table school_classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name text not null,
  grade_label text,
  created_at timestamptz not null default now()
);
create index on school_classes (school_id);

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('student', 'teacher', 'super_admin')),
  username text not null unique,
  display_name text not null,
  email text,
  phone text,
  status text not null default 'active' check (status in ('active', 'suspended', 'pending_password_reset')),
  must_change_password boolean not null default false,
  title text,
  school_id uuid references schools(id) on delete set null, -- students: home school
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);
create index on profiles (role);
create index on profiles (school_id);

create table student_classes (
  student_id uuid not null references profiles(id) on delete cascade,
  class_id uuid not null references school_classes(id) on delete cascade,
  primary key (student_id, class_id)
);

create table teacher_schools (
  teacher_id uuid not null references profiles(id) on delete cascade,
  school_id uuid not null references schools(id) on delete cascade,
  primary key (teacher_id, school_id)
);

create table teacher_classes (
  teacher_id uuid not null references profiles(id) on delete cascade,
  class_id uuid not null references school_classes(id) on delete cascade,
  primary key (teacher_id, class_id)
);

create table teacher_permissions (
  teacher_id uuid not null references profiles(id) on delete cascade,
  permission text not null check (permission in (
    'manage_school_settings', 'manage_teachers', 'manage_classes', 'manage_students',
    'reset_student_passwords', 'manage_school_catalog', 'create_assignments',
    'view_own_class_results', 'view_all_school_results', 'view_student_portfolios', 'export_reports'
  )),
  primary key (teacher_id, permission)
);

-- ---------------------------------------------------------------------------
-- Activation codes
-- ---------------------------------------------------------------------------

create table activation_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  school_id uuid not null references schools(id) on delete cascade,
  class_id uuid references school_classes(id) on delete set null,
  status text not null default 'unused' check (status in ('unused', 'used', 'expired', 'revoked')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_by_student_id uuid references profiles(id) on delete set null,
  used_at timestamptz,
  batch_id text
);
create index on activation_codes (school_id);

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------

create table catalog_topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  prompt text not null,
  writing_type_id text not null references writing_types(id),
  level text not null check (level in ('B1', 'B2', 'C1', 'C2')),
  min_words int not null,
  max_words int not null,
  estimated_minutes int not null,
  tags text[] not null default '{}',
  difficulty text not null check (difficulty in ('developing', 'standard', 'challenging')),
  learning_objectives text[] not null default '{}',
  genre_expectations text[] not null default '{}',
  planning_questions text[],
  source_type text not null check (source_type in ('pasific_library', 'school_library', 'draft')),
  visibility text not null check (visibility in ('global', 'school', 'personal_draft')),
  school_id uuid references schools(id) on delete cascade,
  created_by uuid references profiles(id) on delete set null,
  origin_topic_id uuid references catalog_topics(id) on delete set null,
  updated_at timestamptz not null default now()
);
create index on catalog_topics (school_id);
create index on catalog_topics (writing_type_id);

create table catalog_visibility_overrides (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  topic_id uuid not null references catalog_topics(id) on delete cascade,
  hidden boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id) on delete set null,
  unique (school_id, topic_id)
);

-- ---------------------------------------------------------------------------
-- Rubrics / assignments
-- ---------------------------------------------------------------------------

create table assignment_rubrics (
  id uuid primary key default gen_random_uuid(),
  is_custom boolean not null default false
);

create table rubric_criteria (
  id uuid primary key default gen_random_uuid(),
  rubric_id uuid not null references assignment_rubrics(id) on delete cascade,
  key text not null,
  name_key text not null,
  description_key text,
  weight numeric not null,
  max_score int not null,
  is_custom boolean not null default false,
  is_core boolean not null default false,
  enabled boolean not null default true,
  sort_order int not null default 0
);
create index on rubric_criteria (rubric_id);

create table assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  prompt text not null,
  writing_type_id text not null references writing_types(id),
  level text not null check (level in ('B1', 'B2', 'C1', 'C2')),
  min_words int not null,
  max_words int not null,
  suggested_min_words int not null,
  suggested_max_words int not null,
  due_at timestamptz not null,
  time_limit_minutes int,
  instructions text,
  reference_text text,
  ai_support_mode text not null check (ai_support_mode in ('none', 'critical_alerts_only', 'guided_practice')),
  rubric_id uuid not null references assignment_rubrics(id),
  show_ai_score_immediately boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  created_by uuid references profiles(id) on delete set null,
  school_id uuid not null references schools(id) on delete cascade,
  topic_id uuid references catalog_topics(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on assignments (school_id);

create table assignment_classes (
  assignment_id uuid not null references assignments(id) on delete cascade,
  class_id uuid not null references school_classes(id) on delete cascade,
  primary key (assignment_id, class_id)
);

-- ---------------------------------------------------------------------------
-- Submissions
-- ---------------------------------------------------------------------------

create table submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignments(id) on delete set null,
  is_practice boolean not null default false,
  student_id uuid not null references profiles(id) on delete cascade,
  school_id uuid not null references schools(id) on delete cascade,
  writing_type_id text not null references writing_types(id),
  level text not null check (level in ('B1', 'B2', 'C1', 'C2')),
  topic_title text not null,
  text text not null default '',
  word_count int not null default 0,
  status text not null default 'not_started' check (status in (
    'not_started', 'in_progress', 'submitted', 'analyzing', 'result_ready',
    'teacher_review_pending', 'grading_failed'
  )),
  submitted_at timestamptz,
  last_saved_at timestamptz,
  final_score numeric,
  ai_score numeric,
  score_visible_to_student boolean not null default false,
  teacher_feedback text,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  uses_custom_rubric boolean not null default false,
  created_at timestamptz not null default now()
);
create index on submissions (student_id);
create index on submissions (school_id);
create index on submissions (assignment_id);

create table criterion_scores (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  criterion_id text not null,
  criterion_key text not null,
  ai_score numeric not null,
  max_score int not null,
  weight numeric not null,
  teacher_score numeric,
  explanation text not null default '',
  evidence_quote text,
  strong_aspects text[] not null default '{}',
  development_areas text[] not null default '{}'
);
create index on criterion_scores (submission_id);

create table writing_annotations (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  start_pos int not null,
  end_pos int not null,
  quoted_text text not null,
  severity text not null check (severity in ('critical', 'mistake', 'inaccuracy', 'info')),
  category_id text not null references error_categories(id),
  explanation text not null default '',
  hint text,
  suggested_correction text,
  related_topic_key text
);
create index on writing_annotations (submission_id);

create table teacher_overrides (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  criterion_id text,
  original_ai_score numeric not null,
  final_score numeric not null,
  reason text not null default '',
  teacher_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index on teacher_overrides (submission_id);

create table study_recommendations (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions(id) on delete cascade,
  topic_key text not null,
  reason_key text not null,
  reason_params jsonb,
  student_example_quote text,
  explanation_key text not null,
  related_lesson_key text not null,
  related_exercise_key text not null,
  estimated_minutes int not null,
  error_category_id text not null references error_categories(id)
);
create index on study_recommendations (submission_id);

-- ---------------------------------------------------------------------------
-- Writing examples (library)
-- ---------------------------------------------------------------------------

create table writing_examples (
  id uuid primary key default gen_random_uuid(),
  writing_type_id text not null references writing_types(id),
  level text not null check (level in ('B1', 'B2', 'C1', 'C2')),
  topic_id uuid references catalog_topics(id) on delete set null,
  title text not null,
  text text not null,
  overall_score numeric not null,
  performance_band text not null check (performance_band in ('developing', 'meets_expectations', 'strong', 'advanced')),
  strong_points text[] not null default '{}',
  weak_points text[] not null default '{}',
  teacher_explanation text not null default ''
);

create table example_criterion_scores (
  id uuid primary key default gen_random_uuid(),
  example_id uuid not null references writing_examples(id) on delete cascade,
  criterion_id text not null,
  criterion_key text not null,
  ai_score numeric not null,
  max_score int not null,
  weight numeric not null,
  explanation text not null default '',
  evidence_quote text,
  strong_aspects text[] not null default '{}',
  development_areas text[] not null default '{}'
);

create table example_annotations (
  id uuid primary key default gen_random_uuid(),
  example_id uuid not null references writing_examples(id) on delete cascade,
  start_pos int not null,
  end_pos int not null,
  quoted_text text not null,
  severity text not null check (severity in ('critical', 'mistake', 'inaccuracy', 'info')),
  category_id text not null references error_categories(id),
  explanation text not null default '',
  hint text,
  suggested_correction text
);

-- ---------------------------------------------------------------------------
-- Audit log
-- ---------------------------------------------------------------------------

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in (
    'score_override', 'password_reset', 'account_suspended', 'account_reactivated',
    'catalog_hidden', 'catalog_restored', 'activation_code_created',
    'activation_code_revoked', 'teacher_permission_changed'
  )),
  actor_id uuid references profiles(id) on delete set null,
  actor_name text not null,
  target_label text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);
create index on audit_events (created_at desc);
