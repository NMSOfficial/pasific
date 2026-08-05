-- In-app notification system. Rows are never inserted directly by
-- students/teachers from the client — only by SECURITY DEFINER trigger
-- functions below, so a user can't fabricate a notification for someone
-- else. Clients can only select their own rows and mark them read.

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null check (type in ('grade_ready', 'new_assignment', 'teacher_review_needed')),
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, read_at);

alter table notifications enable row level security;

create policy "notifications readable by owner" on notifications for select using (
  user_id = auth.uid() or is_admin()
);
create policy "notifications markable read by owner" on notifications for update using (
  user_id = auth.uid()
) with check (
  user_id = auth.uid()
);
create policy "notifications managed by admin" on notifications for all using (is_admin()) with check (is_admin());

-- Notify a student the moment their submission's AI result becomes ready.
create or replace function notify_grade_ready() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'result_ready' and (old.status is distinct from 'result_ready') then
    insert into notifications (user_id, type, title, body, link)
    values (new.student_id, 'grade_ready', 'Your writing has been graded', new.topic_title, '/student/submissions/' || new.id || '/result');
  end if;
  return new;
end;
$$;

drop trigger if exists submissions_notify_grade_ready on submissions;
create trigger submissions_notify_grade_ready
  after update on submissions
  for each row execute function notify_grade_ready();

-- Notify every student in a class the moment an assignment is published
-- (whether it starts published on insert, or moves draft -> published later).
create or replace function notify_new_assignment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'published' and (TG_OP = 'INSERT' or old.status is distinct from 'published') then
    insert into notifications (user_id, type, title, body, link)
    select sc.student_id, 'new_assignment', 'New assignment: ' || new.title, new.instructions, '/student/assignments/' || new.id
    from assignment_classes ac
    join student_classes sc on sc.class_id = ac.class_id
    where ac.assignment_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists assignments_notify_new_assignment on assignments;
create trigger assignments_notify_new_assignment
  after insert or update on assignments
  for each row execute function notify_new_assignment();

-- Also cover assignments published via linking a class *after* the
-- assignment itself was already published (assignment_classes inserted later).
create or replace function notify_new_assignment_on_class_link() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_assignment assignments%rowtype;
begin
  select * into v_assignment from assignments where id = new.assignment_id;
  if v_assignment.status = 'published' then
    insert into notifications (user_id, type, title, body, link)
    select sc.student_id, 'new_assignment', 'New assignment: ' || v_assignment.title, v_assignment.instructions, '/student/assignments/' || v_assignment.id
    from student_classes sc
    where sc.class_id = new.class_id;
  end if;
  return new;
end;
$$;

drop trigger if exists assignment_classes_notify_new_assignment on assignment_classes;
create trigger assignment_classes_notify_new_assignment
  after insert on assignment_classes
  for each row execute function notify_new_assignment_on_class_link();
