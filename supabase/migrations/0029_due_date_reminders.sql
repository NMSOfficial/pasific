-- Due-date reminder notifications. Explicitly flagged as "not covered" when
-- the notifications system (0027) was first built, since it needs a
-- scheduled job rather than just an event trigger. Runs hourly via pg_cron:
-- for every published assignment due within the next 24h, notify every
-- enrolled student who hasn't submitted yet. Dedup is done by checking for
-- an existing 'assignment_due_soon' notification pointing at the same
-- assignment, so re-running the job never double-notifies a student.

alter table notifications drop constraint notifications_type_check;
alter table notifications add constraint notifications_type_check check (
  type in ('grade_ready', 'new_assignment', 'teacher_review_needed', 'assignment_due_soon')
);

create or replace function send_due_soon_reminders() returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, type, title, body, link)
  select sc.student_id, 'assignment_due_soon', 'Due soon: ' || a.title, a.instructions, '/student/assignments/' || a.id
  from assignments a
  join assignment_classes ac on ac.assignment_id = a.id
  join student_classes sc on sc.class_id = ac.class_id
  where a.status = 'published'
    and a.due_at > now()
    and a.due_at <= now() + interval '24 hours'
    and not exists (
      select 1 from submissions s
      where s.assignment_id = a.id and s.student_id = sc.student_id
        and s.status not in ('not_started', 'in_progress')
    )
    and not exists (
      select 1 from notifications n
      where n.user_id = sc.student_id and n.type = 'assignment_due_soon' and n.link = '/student/assignments/' || a.id
    );
end;
$$;

create extension if not exists pg_cron;

select cron.schedule('assignment-due-reminders', '0 * * * *', $$select send_due_soon_reminders()$$);
