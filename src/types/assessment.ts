import type { CefrLevel, WritingTypeId } from './entities';

export type DocumentImportKind = 'writing' | 'exam_template' | 'exam_answer_key' | 'exam_attempt';
export type DocumentSourceMode = 'camera' | 'gallery' | 'zip' | 'file' | 'cloud_url';
export type DocumentOcrStatus = 'queued' | 'processing' | 'ready' | 'failed';
export type DocumentReviewStatus = 'needs_match' | 'ready_for_grading' | 'teacher_review_pending' | 'approved' | 'returned';

export interface AdvancedScoringBreakdown {
  rubric: number;
  vocabulary: number;
  patterns: number;
}

export interface SchoolAssignmentTemplate {
  id: string;
  title: string;
  prompt: string;
  writingTypeId: WritingTypeId;
  level: CefrLevel;
  maxPoints: number;
  createdBy: string;
  creatorName: string;
  createdAt: string;
  vocabularyRequirements?: string;
  patternRequirements?: string;
}

export interface DocumentImportBatch {
  id: string;
  schoolId: string;
  createdBy: string;
  kind: DocumentImportKind;
  assignmentId?: string;
  examId?: string;
  title: string;
  sourceMode: DocumentSourceMode;
  status: 'open' | 'processing' | 'ready' | 'closed' | 'failed';
  createdAt: string;
}

export interface DocumentImportItem {
  id: string;
  batchId: string;
  studentId?: string;
  originalFilename: string;
  mimeType: string;
  sourceUrl?: string;
  ocrText?: string;
  ocrMarkdown?: string;
  suggestedStudentName?: string;
  suggestedStudentIdentifier?: string;
  confidence?: number;
  pageCount?: number;
  ocrStatus: DocumentOcrStatus;
  reviewStatus: DocumentReviewStatus;
  linkedSubmissionId?: string;
  linkedExamAttemptId?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface ExamDefinition {
  id: string;
  schoolId: string;
  title: string;
  subject?: string;
  instructions?: string;
  maxPoints: number;
  scoringNotes?: string;
  masterOcrText?: string;
  masterOcrMarkdown?: string;
  answerKeyOcrText?: string;
  answerKeyOcrMarkdown?: string;
  sharedWithSchool: boolean;
  feedbackVisibleDefault: boolean;
  status: 'draft' | 'ready' | 'archived';
  createdBy: string;
  createdAt: string;
}

export type ExamAttemptStatus = 'grading_pending' | 'analyzing' | 'teacher_review_pending' | 'approved' | 'returned' | 'grading_failed';

export interface ExamQuestionScore {
  id: string;
  attemptId: string;
  questionKey: string;
  questionLabel: string;
  maxScore: number;
  aiScore: number;
  teacherScore?: number;
  explanation: string;
  evidenceQuote?: string;
  feedback?: string;
  sortOrder: number;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  schoolId: string;
  studentId: string;
  documentItemId?: string;
  ocrText: string;
  ocrMarkdown?: string;
  status: ExamAttemptStatus;
  aiScore?: number;
  finalScore?: number;
  aiFeedback: Record<string, unknown>;
  teacherFeedback?: string;
  feedbackVisible: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  questionScores: ExamQuestionScore[];
}

export interface ExamAppeal {
  id: string;
  attemptId: string;
  studentId: string;
  reason: string;
  status: 'submitted' | 'reviewing' | 'accepted' | 'rejected';
  teacherResponse?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}
