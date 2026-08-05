-- One comprehensive lesson-note ("konu anlatımı") per writing type, shown
-- alongside the existing reference video and example library. Separate
-- table (not folded into writing_types) because writing_types is a plain
-- lookup table with client-side i18n labels only, while guide content is
-- long-form and needs its own storage/versioning.

create table writing_type_guides (
  id uuid primary key default gen_random_uuid(),
  writing_type_id text not null unique references writing_types(id),
  title text not null,
  summary text not null default '',
  content text not null,
  key_phrases text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table writing_type_guides enable row level security;

create policy "writing type guides readable by all signed-in users" on writing_type_guides for select using (
  auth.role() = 'authenticated'
);
create policy "writing type guides managed by admin" on writing_type_guides for all using (is_admin()) with check (is_admin());
