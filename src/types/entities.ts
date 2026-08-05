// Core domain types for Pasific. Mock data and future API responses conform to these shapes.

export type CefrLevel = 'B1' | 'B1+' | 'B2' | 'B2+' | 'C1';

export type WritingTypeId =
  | 'opinion_essay'
  | 'argumentative_essay'
  | 'for_and_against_essay'
  | 'advantages_disadvantages_essay'
  | 'problem_solution_essay'
  | 'cause_effect_essay'
  | 'compare_contrast_essay'
  | 'formal_email'
  | 'informal_email'
  | 'complaint_letter'
  | 'application_letter'
  | 'article'
  | 'report'
  | 'review'
  | 'narrative_story'
  | 'descriptive_writing'
  | 'blog_post';

export interface WritingType {
  id: WritingTypeId;
  labelKey: string; // i18n key
  category: 'essay' | 'correspondence' | 'creative' | 'functional';
}

export type UserRole = 'student' | 'teacher' | 'super_admin';

export interface BaseUser {
  id: string;
  role: UserRole;
  username: string;
  displayName: string;
  email?: string;
  phone?: string;
  status: 'active' | 'suspended' | 'pending_password_reset';
  /** Set from the activation code's own expiry when the account was created; undefined means it never expires. */
  expiresAt?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface StudentProfile extends BaseUser {
  role: 'student';
  schoolId: string;
  classIds: string[];
  mustChangePassword?: boolean;
}

export type TeacherPermissionKey =
  | 'manage_school_settings'
  | 'manage_teachers'
  | 'manage_classes'
  | 'manage_students'
  | 'reset_student_passwords'
  | 'manage_school_catalog'
  | 'create_assignments'
  | 'view_own_class_results'
  | 'view_all_school_results'
  | 'view_student_portfolios'
  | 'export_reports';

export interface TeacherProfile extends BaseUser {
  role: 'teacher';
  schoolIds: string[];
  classIds: string[];
  permissions: TeacherPermissionKey[];
  title?: string;
}

export interface AdminProfile extends BaseUser {
  role: 'super_admin';
}

export type AppUser = StudentProfile | TeacherProfile | AdminProfile;

export interface School {
  id: string;
  name: string;
  city: string;
  status: 'active' | 'suspended';
  teacherCount: number;
  studentCount: number;
  classCount: number;
  activeAssignmentCount: number;
  lastActivityAt: string;
  planStatus: 'pilot' | 'standard' | 'trial_expired';
}

export interface SchoolClass {
  id: string;
  schoolId: string;
  name: string;
  gradeLabel: string;
  teacherIds: string[];
  studentIds: string[];
  createdAt: string;
}

export interface ActivationCode {
  id: string;
  code: string;
  schoolId: string;
  classId: string;
  status: 'unused' | 'used' | 'expired' | 'revoked';
  createdAt: string;
  expiresAt: string;
  usedByStudentId?: string;
  usedAt?: string;
  batchId?: string;
}

export type CatalogSourceType = 'pasific_library' | 'school_library' | 'draft';
export type CatalogVisibility = 'global' | 'school' | 'personal_draft';

export interface CatalogTopic {
  id: string;
  title: string;
  prompt: string;
  writingTypeId: WritingTypeId;
  level: CefrLevel;
  minWords: number;
  maxWords: number;
  estimatedMinutes: number;
  tags: string[];
  difficulty: 'developing' | 'standard' | 'challenging';
  learningObjectives: string[];
  genreExpectations: string[];
  planningQuestions?: string[];
  relatedExampleIds: string[];
  sourceType: CatalogSourceType;
  visibility: CatalogVisibility;
  schoolId?: string;
  createdBy: string;
  updatedAt: string;
  originTopicId?: string; // for school duplicates of a global topic
}

export interface CatalogVisibilityOverride {
  id: string;
  schoolId: string;
  topicId: string;
  hidden: boolean;
  updatedAt: string;
  updatedBy: string;
}

export type PerformanceBand = 'developing' | 'meets_expectations' | 'strong' | 'advanced';

export interface WritingExample {
  id: string;
  writingTypeId: WritingTypeId;
  level: CefrLevel;
  topicId?: string;
  title: string;
  text: string;
  overallScore: number;
  performanceBand: PerformanceBand;
  criterionScores: CriterionScore[];
  strongPoints: string[];
  weakPoints: string[];
  annotations: WritingAnnotation[];
  teacherExplanation: string;
}

export type AiSupportMode = 'none' | 'critical_alerts_only' | 'guided_practice';

export interface RubricCriterion {
  id: string;
  key: 'task_fulfilment' | 'genre_achievement' | 'organisation_cohesion' | 'vocabulary_range' | 'grammar_mechanics' | string;
  nameKey: string;
  descriptionKey?: string;
  weight: number; // percentage, sums to 100 across an AssignmentRubric
  maxScore: number;
  isCustom: boolean;
  isCore: boolean;
  enabled: boolean;
}

export interface AssignmentRubric {
  id: string;
  isCustom: boolean;
  criteria: RubricCriterion[];
}

export interface Assignment {
  id: string;
  title: string;
  prompt: string;
  writingTypeId: WritingTypeId;
  level: CefrLevel;
  minWords: number;
  maxWords: number;
  suggestedMinWords: number;
  suggestedMaxWords: number;
  dueAt: string;
  timeLimitMinutes?: number;
  classIds: string[];
  instructions?: string;
  referenceText?: string;
  aiSupportMode: AiSupportMode;
  rubric: AssignmentRubric;
  showAiScoreImmediately: boolean;
  status: 'draft' | 'published' | 'closed';
  createdBy: string;
  schoolId: string;
  createdAt: string;
  topicId?: string;
}

export type SubmissionStatus =
  | 'not_started'
  | 'in_progress'
  | 'submitted'
  | 'analyzing'
  | 'result_ready'
  | 'teacher_review_pending'
  | 'grading_failed';

export type ErrorSeverity = 'critical' | 'mistake' | 'inaccuracy' | 'info';

export type ErrorCategoryGroup = 'grammar' | 'vocabulary' | 'organisation' | 'task_genre';

export interface ErrorCategory {
  id: string;
  group: ErrorCategoryGroup;
  nameKey: string;
}

export interface WritingAnnotation {
  id: string;
  start: number;
  end: number;
  quotedText: string;
  severity: ErrorSeverity;
  categoryId: string;
  explanation: string;
  hint?: string;
  suggestedCorrection?: string;
  relatedTopicKey?: string;
}

export interface CriterionScore {
  criterionId: string;
  criterionKey: string;
  aiScore: number;
  maxScore: number;
  weight: number;
  teacherScore?: number;
  explanation: string;
  evidenceQuote?: string;
  strongAspects: string[];
  developmentAreas: string[];
}

export interface TeacherOverride {
  id: string;
  submissionId: string;
  criterionId?: string; // undefined = overall-score-level note
  originalAiScore: number;
  finalScore: number;
  reason: string;
  teacherId: string;
  timestamp: string;
}

export interface StudyRecommendation {
  id: string;
  topicKey: string;
  reasonKey: string;
  reasonParams?: Record<string, string | number>;
  studentExampleQuote: string;
  explanationKey: string;
  relatedLessonKey: string;
  relatedExerciseKey: string;
  estimatedMinutes: number;
  errorCategoryId: string;
}

export interface Submission {
  id: string;
  assignmentId?: string; // undefined for independent practice
  isPractice: boolean;
  studentId: string;
  schoolId: string;
  writingTypeId: WritingTypeId;
  level: CefrLevel;
  topicTitle: string;
  text: string;
  wordCount: number;
  status: SubmissionStatus;
  submittedAt?: string;
  lastSavedAt?: string;
  finalScore?: number;
  aiScore?: number;
  scoreVisibleToStudent: boolean;
  criterionScores: CriterionScore[];
  annotations: WritingAnnotation[];
  studyRecommendations: StudyRecommendation[];
  teacherOverrides: TeacherOverride[];
  teacherFeedback?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  usesCustomRubric: boolean;
}

export interface PortfolioMetric {
  studentId: string;
  totalCompleted: number;
  writingTypesPractised: WritingTypeId[];
  scoreTrend: { date: string; score: number; submissionId: string }[];
  criterionTrend: Record<string, { date: string; score: number }[]>;
  topErrorCategories: { categoryId: string; count: number }[];
  recentlyImproved: string[];
}

export interface PdfReport {
  id: string;
  type: 'student_result' | 'student_portfolio' | 'teacher_submission' | 'teacher_portfolio' | 'class_report' | 'activation_sheet' | 'school_summary';
  generatedAt: string;
  requestedBy: string;
  status: 'ready' | 'generating' | 'failed';
}

export interface AuditEvent {
  id: string;
  type:
    | 'score_override'
    | 'password_reset'
    | 'account_suspended'
    | 'account_reactivated'
    | 'catalog_hidden'
    | 'catalog_restored'
    | 'activation_code_created'
    | 'activation_code_revoked'
    | 'teacher_permission_changed';
  actorId: string;
  actorName: string;
  targetLabel: string;
  timestamp: string;
  detail: string;
}

export const RUBRIC_CRITERION_ORDER = [
  'task_fulfilment',
  'genre_achievement',
  'organisation_cohesion',
  'vocabulary_range',
  'grammar_mechanics',
] as const;
