import type { SupabaseClient } from '@supabase/supabase-js';
import { standardCriteria } from '../src/mock/rubric.ts';
import { gradeSubmission, GradingError, type GradeResult } from './gemini.ts';
import type { CriterionInput } from './gradingSchema.ts';
import {
  createRequesterClient,
  loadSubmissionForRequester,
  type GradingSubmissionRow,
} from './submissionLookup.ts';

interface SubmissionGradingDeps {
  supabaseUrl: string;
  anonKey: string;
  gradingServerSecret: string;
  geminiApiKey: string;
}

interface AssignmentRow {
  prompt: string;
  min_words: number | null;
  max_words: number | null;
  rubric_id: string;
  show_ai_score_immediately: boolean;
  vocabulary_requirements: string | null;
  pattern_requirements: string | null;
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
  requester: SupabaseClient,
  token: string,
  submission: GradingSubmissionRow,
): Promise<void> {
  const { data: authData, error: authError } = await requester.auth.getUser(token);
  const user = authData.user;
  if (authError || !user) throw new SubmissionGradingError('Unauthorized', 401);

  const { data: profile, error: profileError } = await requester
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

  const { data: teacherSchool, error: teacherSchoolError } = await requester
    .from('teacher_schools')
    .select('teacher_id')
    .eq('teacher_id', user.id)
    .eq('school_id', submission.school_id)
    .maybeSingle();
  if (teacherSchoolError || !teacherSchool) throw new SubmissionGradingError('Forbidden', 403);
}

async function loadCriteria(
  requester: SupabaseClient,
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

  const [{ data: rows, error }, { data: rubric, error: rubricError }] = await Promise.all([
    requester
      .from('rubric_criteria')
      .select('id, key, name_key, weight, max_score, enabled')
      .eq('rubric_id', assignment.rubric_id)
      .eq('enabled', true)
      .order('sort_order'),
    requester.from('assignment_rubrics').select('is_custom').eq('id', assignment.rubric_id).maybeSingle(),
  ]);

  if (error || rubricError || !rows?.length) {
    throw new SubmissionGradingError('Assignment rubric is unavailable', 500, true);
  }

  return {
    criteria: rows.map((row) => {
      const key = row.key as string;
      const description = key === 'required_vocabulary'
        ? assignment.vocabulary_requirements ?? undefined
        : key === 'required_patterns'
          ? assignment.pattern_requirements ?? undefined
          : undefined;
      return {
        id: row.id as string,
        key,
        nameKey: row.name_key as string,
        description,
        weight: Number(row.weight),
        maxScore: Number(row.max_score),
      };
    }),
    usesCustomRubric: Boolean(rubric?.is_custom),
  };
}

async function setFailureStatus(
  requester: SupabaseClient,
  submissionId: string,
  gradingServerSecret: string,
): Promise<void> {
  const { error } = await requester.rpc('fail_server_submission_grading', {
    p_submission_id: submissionId,
    p_server_secret: gradingServerSecret,
  });
  if (error) console.error('[grading] failed to persist grading_failed status:', error.message);
}

export async function gradeAndPersistSubmission(
  submissionId: string,
  authHeader: string | undefined,
  deps: SubmissionGradingDeps,
): Promise<{ finalScore: number; status: string }> {
  const token = bearerToken(authHeader);
  if (!token) throw new SubmissionGradingError('Unauthorized', 401);

  const requester = createRequesterClient(token, deps);
  const lookup = await loadSubmissionForRequester(submissionId, token, deps);
  if (lookup.error) {
    console.error('[grading] requester submission lookup failed:', lookup.error);
    throw new SubmissionGradingError('Could not read submission', 500, true);
  }
  const submission = lookup.submission;
  if (!submission) throw new SubmissionGradingError('Submission not found', 404);

  await authorizeSubmission(requester, token, submission);

  if (!submission.text.trim()) throw new SubmissionGradingError('Submission text is empty', 400);
  if (!['in_progress', 'submitted', 'analyzing', 'grading_failed'].includes(submission.status)) {
    throw new SubmissionGradingError('Submission cannot be graded in its current state', 409);
  }

  let assignment: AssignmentRow | null = null;
  if (submission.assignment_id) {
    const { data, error } = await requester
      .from('assignments')
      .select('prompt, min_words, max_words, rubric_id, show_ai_score_immediately, vocabulary_requirements, pattern_requirements')
      .eq('id', submission.assignment_id)
      .maybeSingle<AssignmentRow>();
    if (error || !data) throw new SubmissionGradingError('Assignment not found', 404);
    assignment = data;
  }

  const { criteria, usesCustomRubric } = await loadCriteria(requester, assignment);
  const { data: descriptorRow, error: descriptorError } = await requester
    .from('cefr_level_descriptors')
    .select('descriptor')
    .eq('level', submission.level)
    .maybeSingle();
  if (descriptorError) throw new SubmissionGradingError('Level descriptor is unavailable', 500, true);

  const { data: ocrImport } = await requester
    .from('document_import_items')
    .select('id')
    .eq('linked_submission_id', submissionId)
    .maybeSingle();
  const importedFromOcr = Boolean(ocrImport);

  const { error: analyzingError } = await requester.rpc('begin_server_submission_grading', {
    p_submission_id: submissionId,
    p_server_secret: deps.gradingServerSecret,
  });
  if (analyzingError) {
    console.error('[grading] could not start grading:', analyzingError.message);
    throw new SubmissionGradingError('Could not start grading', 500, true);
  }

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
    const scoreVisible = importedFromOcr
      ? false
      : assignment
        ? assignment.show_ai_score_immediately
        : submission.score_visible_to_student;

    const { error: finishError } = await requester.rpc('complete_server_submission_grading', {
      p_submission_id: submissionId,
      p_server_secret: deps.gradingServerSecret,
      p_final_score: finalScore,
      p_next_status: nextStatus,
      p_score_visible: scoreVisible,
      p_uses_custom_rubric: usesCustomRubric,
      p_criterion_scores: result.criterionScores,
      p_annotations: result.annotations,
    });
    if (finishError) throw finishError;

    return { finalScore, status: nextStatus };
  } catch (error) {
    await setFailureStatus(requester, submissionId, deps.gradingServerSecret);
    if (error instanceof SubmissionGradingError) throw error;
    if (error instanceof GradingError) {
      throw new SubmissionGradingError(error.message, error.retryable ? 503 : 502, error.retryable);
    }
    console.error('[grading] persistence failed:', error);
    throw new SubmissionGradingError('Grading failed unexpectedly', 502);
  }
}
