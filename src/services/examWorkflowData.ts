import { API_BASE } from './apiBase';
import { supabase } from './supabaseClient';
import type {
  DocumentImportBatch,
  DocumentImportItem,
  DocumentImportKind,
  DocumentSourceMode,
  ExamDefinition,
} from '../types/assessment';

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
    answerKeyOcrText: (row.answer_key_ocr_text as string | null) ?? undefined,
    answerKeyOcrMarkdown: (row.answer_key_ocr_markdown as string | null) ?? undefined,
    sharedWithSchool: Boolean(row.shared_with_school),
    feedbackVisibleDefault: Boolean(row.feedback_visible_default),
    status: row.status as ExamDefinition['status'],
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
  };
}

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

export async function createExamDefinition(input: {
  schoolId: string;
  title: string;
  subject?: string;
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
      title: input.title.trim(),
      subject: input.subject?.trim() || null,
      max_points: input.maxPoints,
      scoring_notes: input.scoringNotes?.trim() || null,
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

export async function updateExamDefinitionSettings(input: {
  examId: string;
  title: string;
  subject?: string;
  maxPoints: number;
  scoringNotes?: string;
  sharedWithSchool: boolean;
  feedbackVisibleDefault: boolean;
}): Promise<void> {
  const { error } = await supabase.rpc('update_exam_definition_settings', {
    p_exam_id: input.examId,
    p_title: input.title.trim(),
    p_subject: input.subject?.trim() || null,
    p_max_points: input.maxPoints,
    p_scoring_notes: input.scoringNotes?.trim() || null,
    p_feedback_visible_default: input.feedbackVisibleDefault,
    p_shared_with_school: input.sharedWithSchool,
  });
  if (error) throw error;
}

export async function fetchExamDefinitions(schoolId: string): Promise<ExamDefinition[]> {
  const { data, error } = await supabase
    .from('exam_definitions')
    .select('*')
    .eq('school_id', schoolId)
    .neq('status', 'archived')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapExam);
}

export async function fetchExamDefinition(examId: string): Promise<ExamDefinition | null> {
  const { data, error } = await supabase
    .from('exam_definitions')
    .select('*')
    .eq('id', examId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapExam(data) : null;
}

export async function createExamDocumentBatch(input: {
  schoolId: string;
  createdBy: string;
  kind: 'exam_template' | 'exam_answer_key' | 'exam_attempt';
  examId: string;
  title: string;
  sourceMode: DocumentSourceMode;
}): Promise<DocumentImportBatch> {
  const { data, error } = await supabase
    .from('document_import_batches')
    .insert({
      school_id: input.schoolId,
      created_by: input.createdBy,
      kind: input.kind,
      exam_id: input.examId,
      assignment_id: null,
      title: input.title,
      source_mode: input.sourceMode,
      status: 'open',
    })
    .select('*')
    .single();
  if (error || !data) throw error ?? new Error('exam_document_batch_create_failed');
  return mapBatch(data);
}

export async function createExamDocumentItem(input: {
  batchId: string;
  filename: string;
  mimeType: string;
}): Promise<DocumentImportItem> {
  const { data, error } = await supabase
    .from('document_import_items')
    .insert({
      batch_id: input.batchId,
      original_filename: input.filename,
      mime_type: input.mimeType || 'application/octet-stream',
      ocr_status: 'queued',
      review_status: 'needs_match',
    })
    .select('*')
    .single();
  if (error || !data) throw error ?? new Error('exam_document_item_create_failed');
  return mapItem(data);
}

export async function processExamDocumentItem(input: {
  itemId: string;
  dataBase64?: string;
  mimeType?: string;
  sourceUrl?: string;
}): Promise<void> {
  await apiJson('/api/documents/ocr', { method: 'POST', body: JSON.stringify(input) });
}

export async function fetchExamDocumentBatches(examId: string): Promise<DocumentImportBatch[]> {
  const { data, error } = await supabase
    .from('document_import_batches')
    .select('*')
    .eq('exam_id', examId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapBatch);
}

export async function fetchExamDocumentItems(batchId: string): Promise<DocumentImportItem[]> {
  const { data, error } = await supabase
    .from('document_import_items')
    .select('*')
    .eq('batch_id', batchId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map(mapItem);
}

export async function createAndGradeExamItem(input: {
  itemId: string;
  examId: string;
  studentId: string;
}): Promise<{ attemptId: string; score: number }> {
  return apiJson('/api/exam-items/grade', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function retryExamAttemptGrading(attemptId: string): Promise<{ attemptId: string; score: number }> {
  return apiJson(`/api/exam-attempts/${encodeURIComponent(attemptId)}/grade`, { method: 'POST' });
}
