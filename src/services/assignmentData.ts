import { supabase } from './supabaseClient';
import type { Assignment, AssignmentRubric, RubricCriterion } from '../types/entities';

function mapCriterion(row: Record<string, unknown>): RubricCriterion {
  return {
    id: row.id as string,
    key: row.key as RubricCriterion['key'],
    nameKey: row.name_key as string,
    descriptionKey: (row.description_key as string | null) ?? undefined,
    weight: row.weight as number,
    maxScore: row.max_score as number,
    isCustom: row.is_custom as boolean,
    isCore: row.is_core as boolean,
    enabled: row.enabled as boolean,
  };
}

async function fetchRubric(rubricId: string, isCustom: boolean): Promise<AssignmentRubric> {
  const { data } = await supabase.from('rubric_criteria').select('*').eq('rubric_id', rubricId).order('sort_order');
  return { id: rubricId, isCustom, criteria: (data ?? []).map(mapCriterion) };
}

async function mapAssignment(row: Record<string, unknown>): Promise<Assignment> {
  const [{ data: rubricRow }, { data: classLinks }] = await Promise.all([
    supabase.from('assignment_rubrics').select('*').eq('id', row.rubric_id).maybeSingle(),
    supabase.from('assignment_classes').select('class_id').eq('assignment_id', row.id),
  ]);
  const rubric = await fetchRubric(row.rubric_id as string, (rubricRow?.is_custom as boolean) ?? false);
  const scoring = row.scoring_breakdown as { rubric?: number; vocabulary?: number; patterns?: number } | null;

  return {
    id: row.id as string,
    title: row.title as string,
    prompt: row.prompt as string,
    writingTypeId: row.writing_type_id as Assignment['writingTypeId'],
    level: row.level as Assignment['level'],
    minWords: row.min_words as number,
    maxWords: row.max_words as number,
    suggestedMinWords: row.suggested_min_words as number,
    suggestedMaxWords: row.suggested_max_words as number,
    dueAt: row.due_at as string,
    timeLimitMinutes: (row.time_limit_minutes as number | null) ?? undefined,
    classIds: (classLinks ?? []).map((c) => c.class_id as string),
    instructions: (row.instructions as string | null) ?? undefined,
    referenceText: (row.reference_text as string | null) ?? undefined,
    vocabularyRequirements: (row.vocabulary_requirements as string | null) ?? undefined,
    patternRequirements: (row.pattern_requirements as string | null) ?? undefined,
    maxPoints: Number(row.max_points ?? 100),
    scoringBreakdown: {
      rubric: Number(scoring?.rubric ?? 100),
      vocabulary: Number(scoring?.vocabulary ?? 0),
      patterns: Number(scoring?.patterns ?? 0),
    },
    sharedWithSchool: row.shared_with_school == null ? true : Boolean(row.shared_with_school),
    aiSupportMode: row.ai_support_mode as Assignment['aiSupportMode'],
    rubric,
    showAiScoreImmediately: row.show_ai_score_immediately as boolean,
    status: row.status as Assignment['status'],
    createdBy: row.created_by as string,
    schoolId: row.school_id as string,
    createdAt: row.created_at as string,
    topicId: (row.topic_id as string | null) ?? undefined,
  };
}

export async function fetchAssignmentsForTeacher(teacherId: string): Promise<Assignment[]> {
  const { data: classLinks } = await supabase.from('teacher_classes').select('class_id').eq('teacher_id', teacherId);
  const classIds = (classLinks ?? []).map((c) => c.class_id as string);
  if (!classIds.length) return [];

  const { data: assignmentLinks } = await supabase.from('assignment_classes').select('assignment_id').in('class_id', classIds);
  const assignmentIds = [...new Set((assignmentLinks ?? []).map((a) => a.assignment_id as string))];
  if (!assignmentIds.length) return [];

  const { data: rows } = await supabase.from('assignments').select('*').in('id', assignmentIds);
  return Promise.all((rows ?? []).map(mapAssignment));
}

export async function fetchAssignmentsForClasses(classIds: string[]): Promise<Assignment[]> {
  if (!classIds.length) return [];
  const { data: links } = await supabase.from('assignment_classes').select('assignment_id').in('class_id', classIds);
  const assignmentIds = [...new Set((links ?? []).map((a) => a.assignment_id as string))];
  if (!assignmentIds.length) return [];
  const { data: rows } = await supabase.from('assignments').select('*').in('id', assignmentIds);
  return Promise.all((rows ?? []).map(mapAssignment));
}

export async function fetchAssignment(assignmentId: string): Promise<Assignment | null> {
  const { data: row } = await supabase.from('assignments').select('*').eq('id', assignmentId).maybeSingle();
  if (!row) return null;
  return mapAssignment(row);
}

export async function createAssignment(input: {
  title: string;
  prompt: string;
  writingTypeId: string;
  level: string;
  minWords: number;
  maxWords: number;
  dueAt: string;
  timeLimitMinutes?: number;
  classIds: string[];
  instructions?: string;
  referenceText?: string;
  aiSupportMode: string;
  rubric: AssignmentRubric;
  showAiScoreImmediately: boolean;
  status: 'draft' | 'published';
  createdBy: string;
  schoolId: string;
  topicId?: string;
}): Promise<void> {
  const { data: rubricRow, error: rubricError } = await supabase
    .from('assignment_rubrics')
    .insert({ is_custom: input.rubric.isCustom })
    .select('id')
    .single();
  if (rubricError || !rubricRow) throw rubricError ?? new Error('rubric_insert_failed');

  const { error: criteriaError } = await supabase.from('rubric_criteria').insert(
    input.rubric.criteria.map((c, i) => ({
      rubric_id: rubricRow.id,
      key: c.key,
      name_key: c.nameKey,
      description_key: c.descriptionKey,
      weight: c.weight,
      max_score: c.maxScore,
      is_custom: c.isCustom,
      is_core: c.isCore,
      enabled: c.enabled,
      sort_order: i,
    })),
  );
  if (criteriaError) throw criteriaError;

  const { data: assignmentRow, error: assignmentError } = await supabase
    .from('assignments')
    .insert({
      title: input.title,
      prompt: input.prompt,
      writing_type_id: input.writingTypeId,
      level: input.level,
      min_words: input.minWords,
      max_words: input.maxWords,
      suggested_min_words: input.minWords,
      suggested_max_words: input.maxWords,
      due_at: input.dueAt,
      time_limit_minutes: input.timeLimitMinutes,
      instructions: input.instructions,
      reference_text: input.referenceText,
      ai_support_mode: input.aiSupportMode,
      rubric_id: rubricRow.id,
      show_ai_score_immediately: input.showAiScoreImmediately,
      status: input.status,
      created_by: input.createdBy,
      school_id: input.schoolId,
      topic_id: input.topicId,
    })
    .select('id')
    .single();
  if (assignmentError || !assignmentRow) throw assignmentError ?? new Error('assignment_insert_failed');

  const { error: classError } = await supabase
    .from('assignment_classes')
    .insert(input.classIds.map((classId) => ({ assignment_id: assignmentRow.id, class_id: classId })));
  if (classError) throw classError;
}
