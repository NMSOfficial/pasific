import { supabase } from './supabaseClient';
import { API_BASE } from './apiBase';
import type { AssignmentRubric, CefrLevel, WritingTypeId } from '../types/entities';
import type {
  AdvancedScoringBreakdown,
  DocumentImportBatch,
  DocumentImportItem,
  DocumentImportKind,
  DocumentSourceMode,
  ExamAppeal,
  ExamAttempt,
  ExamDefinition,
  ExamQuestionScore,
  SchoolAssignmentTemplate,
} from '../types/assessment';

function mapBatch(row: Record<string, unknown>): DocumentImportBatch {
  return {
    id: row.id as string,
    schoolId: row.school_id as string,
    createdBy: row.created_by as string,
    kind: row.kind as DocumentImportKind,
    assignmentId: (row.assignment_id as string | null) ?? undefined,
    examId: (row.exam_id as string | null) ?? undefined,
    title: row.title as string,
    sourceMode: row.source_mode as DocumentSourceMode,
    status: row.status as DocumentImportBatch['status'],
    createdAt: row.created_at as string,
  };
}

function mapItem(row: Record<string, unknown>): DocumentImportItem {
  return {
    id: row.id as string,
    batchId: row.batch_id as string,
    studentId: (row.student_id as string | null) ?? undefined,
    originalFilename: row.original_filename as string,
    mimeType: row.mime_type as string,
    sourceUrl: (row.source_url as string | null) ?? undefined,
    ocrText: (row.ocr_text as string | null) ?? undefined,
    ocrMarkdown: (row.ocr_markdown as string | null) ?? undefined,
    suggestedStudentName: (row.suggested_student_name as string | null) ?? undefined,
    suggestedStudentIdentifier: (row.suggested_student_identifier as string | null) ?? undefined,
    confidence: row.confidence == null ? undefined : Number(row.confidence),
    pageCount: row.page_count == null ? undefined : Number(row.page_count),
    ocrStatus: row.ocr_status as DocumentImportItem['ocrStatus'],
    reviewStatus: row.review_status as DocumentImportItem['reviewStatus'],
    linkedSubmissionId: (row.linked_submission_id as string | null) ?? undefined,
    linkedExamAttemptId: (row.linked_exam_attempt_id as string | null) ?? undefined,
    errorMessage: (row.error_message as string | null) ?? undefined,
    createdAt: row.created_at as string,
  };
}

function mapExam(row: Record<string, unknown>): ExamDefinition {
  return {
    id: row.id as string,
    schoolId: row.school_id as string,
    title: row.title as string,
    subject: (row.subject as string | null) ?? undefined,
    instructions: (row.instructions as string | null) ?? undefined,
    maxPoints: Number(row.max_points),
    scoringNotes: (row.scoring_notes as string | null) ?? undefined,
    masterOcrText: (row.master_ocr_text as string | null) ?? undefined,
    masterOcrMarkdown: (row.master_ocr_markdown as string | null) ?? undefined,
    sharedWithSchool: row.shared_with_school as boolean,
    feedbackVisibleDefault: row.feedback_visible_default as boolean,
    status: row.status as ExamDefinition['status'],
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
  };
}

function mapQuestion(row: Record<string, unknown>): ExamQuestionScore {
  return {
    id: row.id as string,
    attemptId: row.attempt_id as string,
    questionKey: row.question_key as string,
    questionLabel: row.question_label as string,
    maxScore: Number(row.max_score),
    aiScore: Number(row.ai_score),
    teacherScore: row.teacher_score == null ? undefined : Number(row.teacher_score),
    explanation: row.explanation as string,
    evidenceQuote: (row.evidence_quote as string | null) ?? undefined,
    feedback: (row.feedback as string | null) ?? undefined,
    sortOrder: Number(row.sort_order),
  };
}

async function mapAttempt(row: Record<string, unknown>): Promise<ExamAttempt> {
  const { data: scoreRows } = await supabase
    .from('exam_question_scores')
    .select('*')
    .eq('attempt_id', row.id)
    .order('sort_order');
  return {
    id: row.id as string,
    examId: row.exam_id as string,
    schoolId: row.school_id as string,
    studentId: row.student_id as string,
    documentItemId: (row.document_item_id as string | null) ?? undefined,
    ocrText: row.ocr_text as string,
    ocrMarkdown: (row.ocr_markdown as string | null) ?? undefined,
    status: row.status as ExamAttempt['status'],
    aiScore: row.ai_score == null ? undefined : Number(row.ai_score),
    finalScore: row.final_score == null ? undefined : Number(row.final_score),
    aiFeedback: (row.ai_feedback as Record<string, unknown> | null) ?? {},
    teacherFeedback: (row.teacher_feedback as string | null) ?? undefined,
    feedbackVisible: row.feedback_visible as boolean,
    reviewedBy: (row.reviewed_by as string | null) ?? undefined,
    reviewedAt: (row.reviewed_at as string | null) ?? undefined,
    createdAt: row.created_at as string,
    questionScores: (scoreRows ?? []).map(mapQuestion),
  };
}

function mapAppeal(row: Record<string, unknown>): ExamAppeal {
  return {
    id: row.id as string,
    attemptId: row.attempt_id as string,
    studentId: row.student_id as string,
    reason: row.reason as string,
    status: row.status as ExamAppeal['status'],
    teacherResponse: (row.teacher_response as string | null) ?? undefined,
    resolvedBy: (row.resolved_by as string | null) ?? undefined,
    resolvedAt: (row.resolved_at as string | null) ?? undefined,
    createdAt: row.created_at as string,
  };
}

async function authToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('not_authenticated');
  return token;
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await authToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(body?.error ?? `request_failed_${response.status}`);
  return body as T;
}

export async function createAdvancedWritingAssignment(input: {
  title: string;
  prompt: string;
  writingTypeId: WritingTypeId;
  level: CefrLevel;
  minWords: number;
  maxWords: number;
  dueAt: string;
  timeLimitMinutes?: number;
  classIds: string[];
  instructions?: string;
  referenceText?: string;
  vocabularyRequirements?: string;
  patternRequirements?: string;
  maxPoints: number;
  scoringBreakdown: AdvancedScoringBreakdown;
  rubric: AssignmentRubric;
  aiSupportMode: string;
  showAiScoreImmediately: boolean;
  sharedWithSchool: boolean;
  status: 'draft' | 'published';
  createdBy: string;
  schoolId: string;
  topicId?: string;
}): Promise<string> {
  const { data: rubricRow, error: rubricError } = await supabase
    .from('assignment_rubrics')
    .insert({ is_custom: input.rubric.isCustom })
    .select('id')
    .single();
  if (rubricError || !rubricRow) throw rubricError ?? new Error('rubric_insert_failed');

  const { error: criteriaError } = await supabase.from('rubric_criteria').insert(
    input.rubric.criteria.map((criterion, index) => ({
      rubric_id: rubricRow.id,
      key: criterion.key,
      name_key: criterion.nameKey,
      description_key: criterion.descriptionKey,
      weight: criterion.weight,
      max_score: criterion.maxScore,
      is_custom: criterion.isCustom,
      is_core: criterion.isCore,
      enabled: criterion.enabled,
      sort_order: index,
    })),
  );
  if (criteriaError) throw criteriaError;

  const { data: assignment, error: assignmentError } = await supabase
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
      vocabulary_requirements: input.vocabularyRequirements,
      pattern_requirements: input.patternRequirements,
      max_points: input.maxPoints,
      scoring_breakdown: input.scoringBreakdown,
      shared_with_school: input.sharedWithSchool,
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
  if (assignmentError || !assignment) throw assignmentError ?? new Error('assignment_insert_failed');

  if (input.classIds.length) {
    const { error: classError } = await supabase
      .from('assignment_classes')
      .insert(input.classIds.map((classId) => ({ assignment_id: assignment.id, class_id: classId })));
    if (classError) throw classError;
  }
  return assignment.id as string;
}

export async function fetchSchoolSharedAssignments(schoolId: string): Promise<SchoolAssignmentTemplate[]> {
  const { data: rows, error } = await supabase
    .from('assignments')
    .select('id, title, prompt, writing_type_id, level, max_points, created_by, created_at, vocabulary_requirements, pattern_requirements')
    .eq('school_id', schoolId)
    .eq('status', 'published')
    .eq('shared_with_school', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const creatorIds = [...new Set((rows ?? []).map((row) => row.created_by as string).filter(Boolean))];
  const { data: creators } = creatorIds.length
    ? await supabase.from('profiles').select('id, display_name').in('id', creatorIds)
    : { data: [] as Record<string, unknown>[] };
  return (rows ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    prompt: row.prompt as string,
    writingTypeId: row.writing_type_id as WritingTypeId,
    level: row.level as CefrLevel,
    maxPoints: Number(row.max_points ?? 100),
    createdBy: row.created_by as string,
    creatorName: (creators ?? []).find((creator) => creator.id === row.created_by)?.display_name as string || '',
    createdAt: row.created_at as string,
    vocabularyRequirements: (row.vocabulary_requirements as string | null) ?? undefined,
    patternRequirements: (row.pattern_requirements as string | null) ?? undefined,
  }));
}

export async function adoptSharedAssignment(assignmentId: string, classIds: string[]): Promise<number> {
  const { data, error } = await supabase.rpc('adopt_shared_assignment', {
    p_assignment_id: assignmentId,
    p_class_ids: classIds,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function fetchIntegrationStatus(): Promise<{ mistral: boolean }> {
  return apiJson('/api/integrations/status');
}

export async function configureMistralApiKey(apiKey: string): Promise<void> {
  await apiJson('/api/admin/integrations/mistral', {
    method: 'POST',
    body: JSON.stringify({ apiKey }),
  });
}

export async function createDocumentBatch(input: {
  schoolId: string;
  createdBy: string;
  kind: DocumentImportKind;
  assignmentId?: string;
  examId?: string;
  title: string;
  sourceMode: DocumentSourceMode;
}): Promise<DocumentImportBatch> {
  const { data, error } = await supabase
    .from('document_import_batches')
    .insert({
      school_id: input.schoolId,
      created_by: input.createdBy,
      kind: input.kind,
      assignment_id: input.assignmentId,
      exam_id: input.examId,
      title: input.title,
      source_mode: input.sourceMode,
      status: 'open',
    })
    .select('*')
    .single();
  if (error || !data) throw error ?? new Error('document_batch_create_failed');
  return mapBatch(data);
}

export async function createDocumentItem(input: {
  batchId: string;
  filename: string;
  mimeType: string;
  sourceUrl?: string;
}): Promise<DocumentImportItem> {
  const { data, error } = await supabase
    .from('document_import_items')
    .insert({
      batch_id: input.batchId,
      original_filename: input.filename,
      mime_type: input.mimeType,
      source_url: input.sourceUrl,
      ocr_status: 'queued',
      review_status: 'needs_match',
    })
    .select('*')
    .single();
  if (error || !data) throw error ?? new Error('document_item_create_failed');
  return mapItem(data);
}

export async function processDocumentItem(input: {
  itemId: string;
  dataBase64?: string;
  mimeType?: string;
  sourceUrl?: string;
}): Promise<void> {
  await apiJson('/api/documents/ocr', { method: 'POST', body: JSON.stringify(input) });
}

export async function fetchDocumentBatches(schoolId: string, kind?: DocumentImportKind): Promise<DocumentImportBatch[]> {
  let query = supabase.from('document_import_batches').select('*').eq('school_id', schoolId).order('created_at', { ascending: false });
  if (kind) query = query.eq('kind', kind);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapBatch);
}

export async function fetchDocumentItems(batchId: string): Promise<DocumentImportItem[]> {
  const { data, error } = await supabase
    .from('document_import_items')
    .select('*')
    .eq('batch_id', batchId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map(mapItem);
}

export async function createAndGradeOcrWriting(itemId: string, assignmentId: string, studentId: string): Promise<string> {
  const { data, error } = await supabase.rpc('create_ocr_submission', {
    p_item_id: itemId,
    p_assignment_id: assignmentId,
    p_student_id: studentId,
  });
  if (error || typeof data !== 'string') throw error ?? new Error('ocr_submission_create_failed');
  await apiJson(`/api/submissions/${encodeURIComponent(data)}/grade`, { method: 'POST' });
  return data;
}

export async function createExamDefinition(input: {
  schoolId: string;
  title: string;
  subject?: string;
  instructions?: string;
  maxPoints: number;
  scoringNotes?: string;
  sharedWithSchool: boolean;
  feedbackVisibleDefault: boolean;
  createdBy: string;
}): Promise<ExamDefinition> {
  const { data, error } = await supabase
    .from('exam_definitions')
    .insert({
      school_id: input.schoolId,
      title: input.title,
      subject: input.subject,
      instructions: input.instructions,
      max_points: input.maxPoints,
      scoring_notes: input.scoringNotes,
      shared_with_school: input.sharedWithSchool,
      feedback_visible_default: input.feedbackVisibleDefault,
      status: 'draft',
      created_by: input.createdBy,
    })
    .select('*')
    .single();
  if (error || !data) throw error ?? new Error('exam_create_failed');
  return mapExam(data);
}

export async function fetchExamDefinitions(schoolId: string): Promise<ExamDefinition[]> {
  const { data, error } = await supabase.from('exam_definitions').select('*').eq('school_id', schoolId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapExam);
}

export async function fetchExamDefinition(examId: string): Promise<ExamDefinition | null> {
  const { data, error } = await supabase.from('exam_definitions').select('*').eq('id', examId).maybeSingle();
  if (error) throw error;
  return data ? mapExam(data) : null;
}

export async function createExamAttemptFromItem(itemId: string, examId: string, studentId: string): Promise<ExamAttempt> {
  const { data: item, error: itemError } = await supabase
    .from('document_import_items')
    .select('id, ocr_text, ocr_markdown, batch_id')
    .eq('id', itemId)
    .maybeSingle();
  if (itemError || !item?.ocr_text) throw itemError ?? new Error('ocr_item_not_ready');
  const { data: exam, error: examError } = await supabase.from('exam_definitions').select('school_id').eq('id', examId).maybeSingle();
  if (examError || !exam) throw examError ?? new Error('exam_not_found');
  const { data, error } = await supabase
    .from('exam_attempts')
    .insert({
      exam_id: examId,
      school_id: exam.school_id,
      student_id: studentId,
      document_item_id: itemId,
      ocr_text: item.ocr_text,
      ocr_markdown: item.ocr_markdown,
      status: 'grading_pending',
      feedback_visible: false,
    })
    .select('*')
    .single();
  if (error || !data) throw error ?? new Error('exam_attempt_create_failed');
  await supabase
    .from('document_import_items')
    .update({ student_id: studentId, linked_exam_attempt_id: data.id, review_status: 'ready_for_grading' })
    .eq('id', itemId);
  return mapAttempt(data);
}

export async function gradeExamAttempt(attemptId: string): Promise<void> {
  await apiJson(`/api/exam-attempts/${encodeURIComponent(attemptId)}/grade`, { method: 'POST' });
}

export async function fetchExamAttempts(examId: string): Promise<ExamAttempt[]> {
  const { data, error } = await supabase.from('exam_attempts').select('*').eq('exam_id', examId).order('created_at', { ascending: false });
  if (error) throw error;
  return Promise.all((data ?? []).map(mapAttempt));
}

export async function fetchExamAttempt(attemptId: string): Promise<ExamAttempt | null> {
  const { data, error } = await supabase.from('exam_attempts').select('*').eq('id', attemptId).maybeSingle();
  if (error) throw error;
  return data ? mapAttempt(data) : null;
}

export async function setExamQuestionTeacherScore(questionId: string, score: number): Promise<void> {
  const { data: question, error: loadError } = await supabase
    .from('exam_question_scores')
    .select('attempt_id, max_score')
    .eq('id', questionId)
    .maybeSingle();
  if (loadError || !question) throw loadError ?? new Error('question_not_found');
  const bounded = Math.max(0, Math.min(Number(question.max_score), score));
  const { error } = await supabase.from('exam_question_scores').update({ teacher_score: bounded }).eq('id', questionId);
  if (error) throw error;
  const { data: rows } = await supabase.from('exam_question_scores').select('ai_score, teacher_score').eq('attempt_id', question.attempt_id);
  const finalScore = (rows ?? []).reduce((sum, row) => sum + Number(row.teacher_score ?? row.ai_score ?? 0), 0);
  await supabase.from('exam_attempts').update({ final_score: Number(finalScore.toFixed(2)), updated_at: new Date().toISOString() }).eq('id', question.attempt_id);
}

export async function approveExamAttempt(input: {
  attemptId: string;
  teacherId: string;
  feedback?: string;
  feedbackVisible: boolean;
}): Promise<void> {
  const { error } = await supabase
    .from('exam_attempts')
    .update({
      status: 'approved',
      teacher_feedback: input.feedback || null,
      feedback_visible: input.feedbackVisible,
      reviewed_by: input.teacherId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.attemptId);
  if (error) throw error;
}

export async function returnExamAttempt(attemptId: string, teacherId: string, feedback: string): Promise<void> {
  const { error } = await supabase
    .from('exam_attempts')
    .update({
      status: 'returned',
      teacher_feedback: feedback,
      feedback_visible: false,
      reviewed_by: teacherId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', attemptId);
  if (error) throw error;
}

export async function fetchStudentVisibleExamAttempts(studentId: string): Promise<ExamAttempt[]> {
  const { data, error } = await supabase
    .from('exam_attempts')
    .select('*')
    .eq('student_id', studentId)
    .eq('status', 'approved')
    .eq('feedback_visible', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return Promise.all((data ?? []).map(mapAttempt));
}

export async function createExamAppeal(attemptId: string, studentId: string, reason: string): Promise<void> {
  const { error } = await supabase.from('exam_appeals').insert({ attempt_id: attemptId, student_id: studentId, reason: reason.trim() });
  if (error) throw error;
}

export async function fetchExamAppeals(attemptId: string): Promise<ExamAppeal[]> {
  const { data, error } = await supabase.from('exam_appeals').select('*').eq('attempt_id', attemptId).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapAppeal);
}

export async function resolveExamAppeal(input: {
  appealId: string;
  status: 'accepted' | 'rejected';
  response: string;
  teacherId: string;
}): Promise<void> {
  const { error } = await supabase
    .from('exam_appeals')
    .update({
      status: input.status,
      teacher_response: input.response,
      resolved_by: input.teacherId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', input.appealId);
  if (error) throw error;
}
