import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { standardCriteria } from '../src/mock/rubric.ts';
import { gradeSubmission, GradingError, type GradeResult } from './gemini.ts';
import type { CriterionInput } from './gradingSchema.ts';

interface SubmissionGradingDeps {
  supabaseUrl: string;
  serviceRoleKey: string;
  geminiApiKey: string;
}

interface SubmissionRow {
  id: string;
  assignment_id: string | null;
  student_id: string;
  school_id: string;
  writing_type_id: string;
  level: string;
  text: string;
  status: string;
  submitted_at: string | null;
  score_visible_to_student: boolean;
}

interface AssignmentRow {
  prompt: string;
  min_words: number | null;
  max_words: number | null;
  rubric_id: string;
  show_ai_score_immediately: boolean;
}

interface ProfileRow {
  role: 'student' | 'teacher' | 'super_admin';
  status: string;
  expires_at: string | null;
}

export class SubmissionGradingError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable = false,
  ) {
    super(message);
  }
}

function bearerToken(authHeader: string | undefined): string | null {
  return authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
}

function recomputeFinalScore(scores: GradeResult['criterionScores']): number {
  const totalWeight = scores.reduce((sum, score) => sum + score.weight, 0) || 100;
  const weighted = scores.reduce(
    (sum, score) => sum + (score.score / score.maxScore) * score.weight,
    0,
  );
  return Math.round((weighted / totalWeight) * 100);
}

async function authorizeSubmission(
  admin: SupabaseClient,
  authHeader: string | undefined,
  submission: SubmissionRow,
): Promise<void> {
  const token = bearerToken(authHeader);
  if (!token) throw new SubmissionGradingError('Unauthorized', 401);

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  const user = authData.user;
  if (authError || !user) throw new SubmissionGradingError('Unauthorized', 401);

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role, status, expires_at')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>();

  if (profileError || !profile) throw new SubmissionGradingError('Forbidden', 403);
  if (profile.status !== 'active') throw new SubmissionGradingError('Account unavailable', 403);
  if (profile.expires_at && new Date(profile.expires_at).getTime() <= Date.now()) {
    throw new SubmissionGradingError('Account expired', 403);
  }

  if (profile.role === 'super_admin') return;
  if (profile.role === 'student') {
    if (submission.student_id !== user.id) throw new SubmissionGradingError('Forbidden', 403);
    return;
  }

  const { data: teacherSchool } = await admin
    .from('teacher_schools')
    .select('teacher_id')
    .eq('teacher_id', user.id)
    .eq('school_id', submission.school_id)
    .maybeSingle();
  if (!teacherSchool) throw new SubmissionGradingError('Forbidden', 403);
}

async function loadCriteria(
  admin: SupabaseClient,
  assignment: AssignmentRow | null,
): Promise<{ criteria: CriterionInput[]; usesCustomRubric: boolean }> {
  if (!assignment) {
    return {
      criteria: standardCriteria().filter((criterion) => criterion.enabled).map((criterion) => ({
        id: criterion.id,
        key: criterion.key,
        nameKey: criterion.nameKey,
        weight: criterion.weight,
        maxScore: criterion.maxScore,
      })),
      usesCustomRubric: false,
    };
  }

  const [{ data: rows, error }, { data: rubric }] = await Promise.all([
    admin
      .from('rubric_criteria')
      .select('id, key, name_key, weight, max_score, enabled')
      .eq('rubric_id', assignment.rubric_id)
      .eq('enabled', true)
      .order('sort_order'),
    admin.from('assignment_rubrics').select('is_custom').eq('id', assignment.rubric_id).maybeSingle(),
  ]);

  if (error || !rows?.length) {
    throw new SubmissionGradingError('Assignment rubric is unavailable', 500);
  }

  return {
    criteria: rows.map((row) => ({
      id: row.id as string,
      key: row.key as string,
      nameKey: row.name_key as string,
      weight: Number(row.weight),
      maxScore: Number(row.max_score),
    })),
    usesCustomRubric: Boolean(rubric?.is_custom),
  };
}

async function setFailureStatus(admin: SupabaseClient, submissionId: string): Promise<void> {
  const { error } = await admin
    .from('submissions')
    .update({ status: 'grading_failed' })
    .eq('id', submissionId);
  if (error) console.error('[grading] failed to persist grading_failed status:', error.message);
}

export async function gradeAndPersistSubmission(
  submissionId: string,
  authHeader: string | undefined,
  deps: SubmissionGradingDeps,
): Promise<{ finalScore: number; status: string }> {
  const admin = createClient(deps.supabaseUrl, deps.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: submission, error: submissionError } = await admin
    .from('submissions')
    .select('id, assignment_id, student_id, school_id, writing_type_id, level, text, status, submitted_at, score_visible_to_student')
    .eq('id', submissionId)
    .maybeSingle<SubmissionRow>();

  if (submissionError || !submission) throw new SubmissionGradingError('Submission not found', 404);
  await authorizeSubmission(admin, authHeader, submission);

  if (!submission.text.trim()) throw new SubmissionGradingError('Submission text is empty', 400);
  if (!['in_progress', 'submitted', 'analyzing', 'grading_failed'].includes(submission.status)) {
    throw new SubmissionGradingError('Submission cannot be graded in its current state', 409);
  }

  let assignment: AssignmentRow | null = null;
  if (submission.assignment_id) {
    const { data, error } = await admin
      .from('assignments')
      .select('prompt, min_words, max_words, rubric_id, show_ai_score_immediately')
      .eq('id', submission.assignment_id)
      .maybeSingle<AssignmentRow>();
    if (error || !data) throw new SubmissionGradingError('Assignment not found', 404);
    assignment = data;
  }

  const { criteria, usesCustomRubric } = await loadCriteria(admin, assignment);
  const { data: descriptorRow } = await admin
    .from('cefr_level_descriptors')
    .select('descriptor')
    .eq('level', submission.level)
    .maybeSingle();

  const now = new Date().toISOString();
  const { error: analyzingError } = await admin
    .from('submissions')
    .update({ status: 'analyzing', submitted_at: submission.submitted_at ?? now, last_saved_at: now })
    .eq('id', submissionId);
  if (analyzingError) throw new SubmissionGradingError('Could not start grading', 500);

  try {
    const result = await gradeSubmission(
      {
        text: submission.text,
        writingTypeId: submission.writing_type_id,
        level: submission.level,
        assignmentPrompt: assignment?.prompt,
        minWords: assignment?.min_words ?? undefined,
        maxWords: assignment?.max_words ?? undefined,
        criteria,
      },
      deps.geminiApiKey,
      (descriptorRow?.descriptor as string | undefined) || undefined,
    );

    const finalScore = recomputeFinalScore(result.criterionScores);
    const nextStatus = submission.assignment_id ? 'teacher_review_pending' : 'result_ready';
    const scoreVisible = assignment ? assignment.show_ai_score_immediately : submission.score_visible_to_student;

    const { error: cleanupScoresError } = await admin.from('criterion_scores').delete().eq('submission_id', submissionId);
    if (cleanupScoresError) throw cleanupScoresError;
    const { error: cleanupAnnotationsError } = await admin.from('writing_annotations').delete().eq('submission_id', submissionId);
    if (cleanupAnnotationsError) throw cleanupAnnotationsError;
    const { error: cleanupRecommendationsError } = await admin.from('study_recommendations').delete().eq('submission_id', submissionId);
    if (cleanupRecommendationsError) throw cleanupRecommendationsError;

    const { error: scoreError } = await admin.from('criterion_scores').insert(
      result.criterionScores.map((score) => ({
        submission_id: submissionId,
        criterion_id: score.criterionId,
        criterion_key: score.criterionKey,
        ai_score: score.score,
        max_score: score.maxScore,
        weight: score.weight,
        explanation: score.explanation,
        evidence_quote: score.evidenceQuote,
        strong_aspects: score.strongAspects,
        development_areas: score.developmentAreas,
      })),
    );
    if (scoreError) throw scoreError;

    if (result.annotations.length) {
      const { error: annotationError } = await admin.from('writing_annotations').insert(
        result.annotations.map((annotation) => ({
          submission_id: submissionId,
          start_pos: annotation.start,
          end_pos: annotation.end,
          quoted_text: annotation.quotedText,
          severity: annotation.severity,
          category_id: annotation.categoryId,
          explanation: annotation.explanation,
          hint: annotation.hint,
          suggested_correction: annotation.suggestedCorrection,
        })),
      );
      if (annotationError) throw annotationError;
    }

    const { error: finishError } = await admin
      .from('submissions')
      .update({
        ai_score: finalScore,
        final_score: scoreVisible ? finalScore : null,
        status: nextStatus,
        score_visible_to_student: scoreVisible,
        uses_custom_rubric: usesCustomRubric,
      })
      .eq('id', submissionId);
    if (finishError) throw finishError;

    return { finalScore, status: nextStatus };
  } catch (error) {
    await setFailureStatus(admin, submissionId);
    if (error instanceof SubmissionGradingError) throw error;
    if (error instanceof GradingError) {
      throw new SubmissionGradingError(error.message, error.retryable ? 503 : 502, error.retryable);
    }
    console.error('[grading] persistence failed:', error);
    throw new SubmissionGradingError('Grading failed unexpectedly', 502);
  }
}
