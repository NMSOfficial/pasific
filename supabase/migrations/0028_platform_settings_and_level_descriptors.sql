-- Backs two admin screens that had "Save" buttons wired to nothing:
-- AdminSettingsPage (platform name / maintenance mode) and AdminLevelsPage
-- (CEFR level descriptors). Both are singleton/lookup-style config tables,
-- readable by any signed-in user (maintenance_mode needs to be visible to
-- students/teachers too, to show a banner) and writable only by super_admin.

create table platform_settings (
  id int primary key default 1 check (id = 1), -- singleton row
  platform_name text not null default 'Pasific',
  maintenance_mode boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into platform_settings (id) values (1);

alter table platform_settings enable row level security;

create policy "platform settings readable by signed-in users" on platform_settings for select using (
  auth.role() = 'authenticated'
);
create policy "platform settings managed by admin" on platform_settings for all using (is_admin()) with check (is_admin());

create table cefr_level_descriptors (
  level text primary key check (level in ('B1', 'B2', 'C1', 'C2')),
  descriptor text not null,
  updated_at timestamptz not null default now()
);

insert into cefr_level_descriptors (level, descriptor) values
  ('B1', 'Can write straightforward, connected texts on familiar topics using simple linking words. Vocabulary and grammar cover everyday needs with noticeable but non-disruptive errors.'),
  ('B2', 'Can write clear, detailed texts on a range of subjects, developing an argument with supporting points. Good control of grammar and a fairly wide vocabulary range.'),
  ('C1', 'Can write well-structured, detailed texts on complex subjects, using organisational patterns and cohesive devices effectively. Wide vocabulary used with precision.'),
  ('C2', 'Can write clear, smoothly flowing, complex texts in an appropriate and effective style with a logical structure that helps the reader find significant points.');

alter table cefr_level_descriptors enable row level security;

create policy "level descriptors readable by signed-in users" on cefr_level_descriptors for select using (
  auth.role() = 'authenticated'
);
create policy "level descriptors managed by admin" on cefr_level_descriptors for all using (is_admin()) with check (is_admin());
