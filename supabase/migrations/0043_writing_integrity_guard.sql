-- Layered writing-integrity protection for student drafts.
-- Browser paste/drop blocking improves UX, while this trigger prevents a
-- client from persisting a large externally injected text span in one update.

create or replace function public.guard_submission_update()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  caller_role text := public.app_current_role();
  v_old_len int;
  v_new_len int;
  v_prefix int := 0;
  v_suffix int := 0;
  v_max_prefix int;
  v_max_suffix int;
  v_inserted int;
  v_elapsed_seconds numeric;
  v_allowed_insert int;
begin
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;

  if not public.is_current_account_active() then
    raise exception 'inactive_account' using errcode = '42501';
  end if;

  if caller_role = 'student' then
    if old.student_id <> auth.uid() then
      raise exception 'submission_update_forbidden' using errcode = '42501';
    end if;

    if new.id is distinct from old.id
       or new.assignment_id is distinct from old.assignment_id
       or new.is_practice is distinct from old.is_practice
       or new.student_id is distinct from old.student_id
       or new.school_id is distinct from old.school_id
       or new.writing_type_id is distinct from old.writing_type_id
       or new.level is distinct from old.level
       or new.topic_title is distinct from old.topic_title
       or new.final_score is distinct from old.final_score
       or new.ai_score is distinct from old.ai_score
       or new.score_visible_to_student is distinct from old.score_visible_to_student
       or new.teacher_feedback is distinct from old.teacher_feedback
       or new.reviewed_by is distinct from old.reviewed_by
       or new.reviewed_at is distinct from old.reviewed_at
       or new.uses_custom_rubric is distinct from old.uses_custom_rubric
       or new.created_at is distinct from old.created_at then
      raise exception 'server_managed_submission_fields' using errcode = '42501';
    end if;

    if old.status not in ('not_started', 'in_progress')
       and (new.text is distinct from old.text or new.word_count is distinct from old.word_count) then
      raise exception 'submitted_text_is_immutable' using errcode = '42501';
    end if;

    if old.status in ('not_started', 'in_progress') and new.text is distinct from old.text then
      v_old_len := char_length(coalesce(old.text, ''));
      v_new_len := char_length(coalesce(new.text, ''));
      v_max_prefix := least(v_old_len, v_new_len);

      while v_prefix < v_max_prefix
        and substr(old.text, v_prefix + 1, 1) = substr(new.text, v_prefix + 1, 1)
      loop
        v_prefix := v_prefix + 1;
      end loop;

      v_max_suffix := least(v_old_len - v_prefix, v_new_len - v_prefix);
      while v_suffix < v_max_suffix
        and substr(old.text, v_old_len - v_suffix, 1) = substr(new.text, v_new_len - v_suffix, 1)
      loop
        v_suffix := v_suffix + 1;
      end loop;

      v_inserted := greatest(v_new_len - v_prefix - v_suffix, 0);
      v_elapsed_seconds := least(
        5,
        greatest(1, extract(epoch from (now() - coalesce(old.last_saved_at, old.created_at))))
      );
      v_allowed_insert := least(90, greatest(48, ceil(v_elapsed_seconds * 18)::int));

      if v_inserted > v_allowed_insert then
        raise exception 'bulk_text_insertion_blocked' using errcode = '42501';
      end if;
    end if;

    if new.last_saved_at is distinct from old.last_saved_at then
      new.last_saved_at := now();
    end if;

    if new.status is distinct from old.status
       and not (
         (old.status = 'not_started' and new.status in ('in_progress', 'submitted'))
         or (old.status = 'in_progress' and new.status = 'submitted')
       ) then
      raise exception 'invalid_student_status_transition' using errcode = '42501';
    end if;

    if new.submitted_at is distinct from old.submitted_at
       and not (old.submitted_at is null and new.status = 'submitted' and new.submitted_at is not null) then
      raise exception 'invalid_submitted_at_change' using errcode = '42501';
    end if;

    return new;
  end if;

  if caller_role = 'teacher' and public.is_teacher_of_school(old.school_id) then
    if new.id is distinct from old.id
       or new.assignment_id is distinct from old.assignment_id
       or new.is_practice is distinct from old.is_practice
       or new.student_id is distinct from old.student_id
       or new.school_id is distinct from old.school_id
       or new.writing_type_id is distinct from old.writing_type_id
       or new.level is distinct from old.level
       or new.topic_title is distinct from old.topic_title
       or new.text is distinct from old.text
       or new.word_count is distinct from old.word_count
       or new.submitted_at is distinct from old.submitted_at
       or new.last_saved_at is distinct from old.last_saved_at
       or new.ai_score is distinct from old.ai_score
       or new.uses_custom_rubric is distinct from old.uses_custom_rubric
       or new.created_at is distinct from old.created_at then
      raise exception 'teacher_cannot_change_submission_source' using errcode = '42501';
    end if;

    if new.status is distinct from old.status
       and not (old.status in ('teacher_review_pending', 'result_ready') and new.status = 'result_ready') then
      raise exception 'invalid_teacher_status_transition' using errcode = '42501';
    end if;

    return new;
  end if;

  raise exception 'submission_update_forbidden' using errcode = '42501';
end;
$$;

revoke all on function public.guard_submission_update() from public, anon, authenticated;
