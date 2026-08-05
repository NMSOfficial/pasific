import { supabase } from './supabaseClient';
import type { CriterionScore, StudyRecommendation, Submission, TeacherOverride, WritingAnnotation } from '../types/entities';
import { recomputeFinalScore } from '../utils/portfolio';
import { API_BASE } from './apiBase';

function mapCriterionScore(row: Record<string, unknown>): CriterionScore {
  return {
    criterionId: row.criterion_id as string,
    criterionKey: row.criterion_key as string,
    aiScore: row.ai_score as number,
    maxScore: row.max_score as number,
    weight: row.weight as number,
    teacherScore: (row.teacher_score as number | null) ?? undefined,
    explanation: row.explanation as string,
    evidenceQuote: (row.evidence_quote as string | null) ?? undefined,
    strongAspects: (row.strong_aspects as string[] | null) ?? [],
    developmentAreas: (row.development_areas as string[] | null) ?? [],
  };
}

function mapAnnotation(row: Record<string, unknown>): WritingAnnotation {
  return {
    id: row.id as string,
    start: row.start_pos as number,
    end: row.end_pos as number,
    quotedText: row.quoted_text as string,
    severity: row.severity as WritingAnnotation['severity'],
    categoryId: row.category_id as string,
    explanation: row.explanation as string,
    hint: (row.hint as string | null) ?? undefined,
    suggestedCorrection: (row.suggested_correction as string | null) ?? undefined,
  };
}

function mapRecommendation(row: Record<string, unknown>): StudyRecommendation {
  return {
    id: row.id as string,
    topicKey: row.topic_key as string,
    reasonKey: row.reason_key as string,
    reasonParams: (row.reason_params as Record<string, string | number> | null) ?? undefined,
    studentExampleQuote: (row.student_example_quote as string | null) ?? '',
    explanationKey: row.explanation_key as string,
    relatedLessonKey: row.related_lesson_key as string,
    relatedExerciseKey: row.related_exercise_key as string,
    estimatedMinutes: row.estimated_minutes as number,
    errorCategoryId: row.error_category_id as string,
  };
}

function mapOverride(row: Record<string, unknown>): TeacherOverride {
  return {
    id: row.id as string,
    submissionId: row.submission_id as string,
    criterionId: (row.criterion_id as string | null) ?? undefined,
    originalAiScore: row.original_ai_score as number,
    finalScore: row.final_score as number,
    reason: row.reason as string,
    teacherId: row.teacher_id as string,
    timestamp: row.created_at as string,
  };
}

function mapSubmission(
  row: Record<string, unknown>,
  scores: CriterionScore[],
  annotations: WritingAnnotation[],
  recs: StudyRecommendation[],
  overrides: TeacherOverride[],
): Submission {
  return {
    id: row.id as string,
    assignmentId: (row.assignment_id as string | null) ?? undefined,
    isPractice: row.is_practice as boolean,
    studentId: row.student_id as string,
    schoolId: row.school_id as string,
    writingTypeId: row.writing_type_id as Submission['writingTypeId'],
    level: row.level as Submission['level'],
    topicTitle: row.topic_title as string,
    text: row.text as string,
    wordCount: row.word_count as number,
    status: row.status as Submission['status'],
    submittedAt: (row.submitted_at as string | null) ?? undefined,
    lastSavedAt: (row.last_saved_at as string | null) ?? undefined,
    finalScore: (row.final_score as number | null) ?? undefined,
    aiScore: (row.ai_score as number | null) ?? undefined,
    scoreVisibleToStudent: row.score_visible_to_student as boolean,
    criterionScores: scores,
    annotations,
    studyRecommendations: recs,
    teacherOverrides: overrides,
    teacherFeedback: (row.teacher_feedback as string | null) ?? undefined,
    reviewedBy: (row.reviewed_by as string | null) ?? undefined,
    reviewedAt: (row.reviewed_at as string | null) ?? undefined,
    usesCustomRubric: row.uses_custom_rubric as boolean,
  };
}

function groupBy<T extends Record<string, unknown>>(rows: T[], key: string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = row[key] as string;
    const list = map.get(k) ?? [];
    list.push(row);
    map.set(k, list);
  }
  return map;
}

async function assembleSubmissions(rows: Record<string, unknown>[]): Promise<Submission[]> {
  const ids = rows.map((row) => row.id as string);
  if (!ids.length) return [];

  const [{ data: scores }, { data: annotations }, { data: recs }, { data: overrides }] = await Promise.all([
    supabase.from('criterion_scores').select('*').in('submission_id', ids),
    supabase.from('writing_annotations').select('*').in('submission_id', ids),
    supabase.from('study_recommendations').select('*').in('submission_id', ids),
    supabase.from('teacher_overrides').select('*').in('submission_id', ids),
  ]);

  const scoresBySub = groupBy(scores ?? [], 'submission_id');
  const annotationsBySub = groupBy(annotations ?? [], 'submission_id');
  const recommendationsBySub = groupBy(recs ?? [], 'submission_id');
  const overridesBySub = groupBy(overrides ?? [], 'submission_id');

  return rows.map((row) =>
    mapSubmission(
      row,
      (scoresBySub.get(row.id as string) ?? []).map(mapCriterionScore),
      (annotationsBySub.get(row.id as string) ?? []).map(mapAnnotation),
      (recommendationsBySub.get(row.id as string) ?? []).map(mapRecommendation),
      (overridesBySub.get(row.id as string) ?? []).map(mapOverride),
    ),
  );
}

export async function fetchSubmissionsForStudents(
  studentIds: string[],
  opts?: { practiceOnly?: boolean; excludePractice?: boolean },
): Promise<Submission[]> {
  if (!studentIds.length) return [];
  let query = supabase.from('submissions').select('*').in('student_id', studentIds);
  if (opts?.practiceOnly) query = query.eq('is_practice', true);
  if (opts?.excludePractice) query = query.eq('is_practice', false);
  const { data } = await query;
  return assembleSubmissions(data ?? []);
}

export async function fetchSubmissionsForAssignment(assignmentId: string): Promise<Submission[]> {
  const { data } = await supabase.from('submissions').select('*').eq('assignment_id', assignmentId);
  return assembleSubmissions(data ?? []);
}

export async function fetchSubmission(submissionId: string): Promise<Submission | null> {
  const { data } = await supabase.from('submissions').select('*').eq('id', submissionId).maybeSingle();
  if (!data) return null;
  const [full] = await assembleSubmissions([data]);
  return full ?? null;
}

export async function saveSubmissionDraft(submissionId: string, text: string): Promise<void> {
  const wordCount = text.trim().length ? text.trim().split(/\s+/).length : 0;
  const { data: current } = await supabase.from('submissions').select('status').eq('id', submissionId).maybeSingle();
  const nextStatus = current?.status === 'not_started' ? 'in_progress' : current?.status;
  const { error } = await supabase
    .from('submissions')
    .update({ text, word_count: wordCount, last_saved_at: new Date().toISOString(), status: nextStatus })
    .eq('id', submissionId);
  if (error) throw error;
}

export async function applyTeacherOverride(params: {
  submissionId: string;
  criterionId: string;
  newScore: number;
  reason: string;
  teacherId: string;
  teacherName: string;
}): Promise<void> {
  const submission = await fetchSubmission(params.submissionId);
  if (!submission) throw new Error('submission_not_found');

  const criterion = submission.criterionScores.find((candidate) => candidate.criterionId === params.criterionId);
  const originalScore = criterion?.aiScore ?? submission.aiScore ?? 0;

  if (criterion) {
    const { error } = await supabase
      .from('criterion_scores')
      .update({ teacher_score: params.newScore })
      .eq('submission_id', params.submissionId)
      .eq('criterion_id', params.criterionId);
    if (error) throw error;
  }

  const updatedScores = submission.criterionScores.map((score) =>
    score.criterionId === params.criterionId ? { ...score, teacherScore: params.newScore } : score,
  );
  const newFinalScore = recomputeFinalScore(updatedScores);

  const { error: submissionError } = await supabase
    .from('submissions')
    .update({ final_score: newFinalScore })
    .eq('id', params.submissionId);
  if (submissionError) throw submissionError;

  const { error: overrideError } = await supabase.from('teacher_overrides').insert({
    submission_id: params.submissionId,
    criterion_id: params.criterionId,
    original_ai_score: originalScore,
    final_score: params.newScore,
    reason: params.reason,
    teacher_id: params.teacherId,
  });
  if (overrideError) throw overrideError;

  await supabase.from('audit_events').insert({
    type: 'score_override',
    actor_id: params.teacherId,
    actor_name: params.teacherName,
    target_label: submission.topicTitle,
    detail: params.reason,
  });
}

export async function publishTeacherReview(submissionId: string, feedback: string, teacherId: string): Promise<void> {
  const { data: current } = await supabase
    .from('submissions')
    .select('final_score, ai_score')
    .eq('id', submissionId)
    .maybeSingle();
  const { error } = await supabase
    .from('submissions')
    .update({
      teacher_feedback: feedback,
      reviewed_by: teacherId,
      reviewed_at: new Date().toISOString(),
      status: 'result_ready',
      score_visible_to_student: true,
      final_score: current?.final_score ?? current?.ai_score,
    })
    .eq('id', submissionId);
  if (error) throw error;
}

async function runGrading(submissionId: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error('grading_unauthorized');

  const response = await fetch(`${API_BASE}/api/submissions/${encodeURIComponent(submissionId)}/grade`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `grading_failed_${response.status}`);
  }
}

export async function retryAiGrading(submissionId: string): Promise<void> {
  await runGrading(submissionId);
}

export async function fetchSubmissionForAssignment(assignmentId: string, studentId: string): Promise<Submission | null> {
  const { data } = await supabase
    .from('submissions')
    .select('*')
    .eq('assignment_id', assignmentId)
    .eq('student_id', studentId)
    .eq('is_practice', false)
    .maybeSingle();
  if (!data) return null;
  const [full] = await assembleSubmissions([data]);
  return full ?? null;
}

export async function createDraftSubmission(input: {
  assignmentId?: string;
  isPractice: boolean;
  studentId: string;
  schoolId: string;
  writingTypeId: string;
  level: string;
  topicTitle: string;
  scoreVisibleToStudent?: boolean;
}): Promise<Submission> {
  const { data, error } = await supabase
    .from('submissions')
    .insert({
      assignment_id: input.assignmentId,
      is_practice: input.isPractice,
      student_id: input.studentId,
      school_id: input.schoolId,
      writing_type_id: input.writingTypeId,
      level: input.level,
      topic_title: input.topicTitle,
      text: '',
      word_count: 0,
      status: 'in_progress',
      last_saved_at: new Date().toISOString(),
      score_visible_to_student: input.scoreVisibleToStudent ?? true,
      uses_custom_rubric: false,
    })
    .select('*')
    .single();
  if (error || !data) throw error ?? new Error('submission_create_failed');
  const [full] = await assembleSubmissions([data]);
  return full;
}

export async function submitSubmission(submissionId: string): Promise<void> {
  const { data: current } = await supabase.from('submissions').select('status').eq('id', submissionId).maybeSingle();
  if (!current || (current.status !== 'not_started' && current.status !== 'in_progress')) return;

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('submissions')
    .update({ status: 'submitted', submitted_at: now, last_saved_at: now })
    .eq('id', submissionId);
  if (error) throw error;

  await runGrading(submissionId);
}
