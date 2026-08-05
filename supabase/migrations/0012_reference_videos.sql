-- Reference videos: a genre-explainer video per writing type, and a
-- grammar/error-fix video per error category (or its group, when a
-- category-specific one isn't available). Referenced by URL only — no
-- embedding, the student clicks through to YouTube.

create table reference_videos (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('writing_type', 'error_category', 'error_group')),
  subject_id text not null,
  title text not null,
  youtube_url text not null,
  channel_name text,
  created_at timestamptz not null default now(),
  unique (subject_type, subject_id)
);

alter table reference_videos enable row level security;

create policy "reference videos readable by all signed-in users" on reference_videos for select using (
  auth.role() = 'authenticated'
);
create policy "reference videos managed by admin" on reference_videos for all using (is_admin()) with check (is_admin());
