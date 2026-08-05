-- Cover foreign keys used by joins, cascades and authorization checks.

create index if not exists activation_codes_class_id_idx
  on public.activation_codes (class_id);
create index if not exists activation_codes_used_by_student_id_idx
  on public.activation_codes (used_by_student_id);
create index if not exists assignment_classes_class_id_idx
  on public.assignment_classes (class_id);
create index if not exists assignments_created_by_idx
  on public.assignments (created_by);
create index if not exists assignments_rubric_id_idx
  on public.assignments (rubric_id);
create index if not exists assignments_topic_id_idx
  on public.assignments (topic_id);
create index if not exists assignments_writing_type_id_idx
  on public.assignments (writing_type_id);
create index if not exists audit_events_actor_id_idx
  on public.audit_events (actor_id);
create index if not exists catalog_topics_created_by_idx
  on public.catalog_topics (created_by);
create index if not exists catalog_topics_origin_topic_id_idx
  on public.catalog_topics (origin_topic_id);
create index if not exists catalog_visibility_overrides_topic_id_idx
  on public.catalog_visibility_overrides (topic_id);
create index if not exists catalog_visibility_overrides_updated_by_idx
  on public.catalog_visibility_overrides (updated_by);
create index if not exists example_annotations_category_id_idx
  on public.example_annotations (category_id);
create index if not exists example_annotations_example_id_idx
  on public.example_annotations (example_id);
create index if not exists example_criterion_scores_example_id_idx
  on public.example_criterion_scores (example_id);
create index if not exists student_classes_class_id_idx
  on public.student_classes (class_id);
create index if not exists study_recommendations_error_category_id_idx
  on public.study_recommendations (error_category_id);
create index if not exists submissions_reviewed_by_idx
  on public.submissions (reviewed_by);
create index if not exists submissions_writing_type_id_idx
  on public.submissions (writing_type_id);
create index if not exists teacher_classes_class_id_idx
  on public.teacher_classes (class_id);
create index if not exists teacher_overrides_teacher_id_idx
  on public.teacher_overrides (teacher_id);
create index if not exists teacher_schools_school_id_idx
  on public.teacher_schools (school_id);
create index if not exists writing_annotations_category_id_idx
  on public.writing_annotations (category_id);
create index if not exists writing_examples_topic_id_idx
  on public.writing_examples (topic_id);
create index if not exists writing_examples_writing_type_id_idx
  on public.writing_examples (writing_type_id);
