import type {
  ActivationCode, AppUser, AuditEvent, CatalogTopic, CatalogVisibilityOverride,
  CriterionScore, Assignment, School, SchoolClass, StudentProfile, Submission,
  TeacherOverride, TeacherProfile, WritingExample,
} from '../types/entities';
import { SCHOOLS, SCHOOL_CLASSES } from './schools';
import { TEACHERS, STUDENTS, ADMINS } from './users';
import { ACTIVATION_CODES } from './activationCodes';
import { CATALOG_TOPICS, CATALOG_VISIBILITY_OVERRIDES } from './catalog';
import { WRITING_EXAMPLES } from './examples';
import { ASSIGNMENTS } from './assignments';
import { SUBMISSIONS } from './submissions';
import { AUDIT_EVENTS } from './audit';
import { standardCriteria } from './rubric';
import { gradeWithAi } from '../services/aiGrading';

export interface MockState {
  schools: School[];
  classes: SchoolClass[];
  teachers: TeacherProfile[];
  students: StudentProfile[];
  admins: AppUser[];
  activationCodes: ActivationCode[];
  catalogTopics: CatalogTopic[];
  catalogOverrides: CatalogVisibilityOverride[];
  examples: WritingExample[];
  assignments: Assignment[];
  submissions: Submission[];
  auditEvents: AuditEvent[];
}

const STORAGE_KEY = 'pasific.mockState.v1';

function seedState(): MockState {
  return {
    schools: structuredClone(SCHOOLS),
    classes: structuredClone(SCHOOL_CLASSES),
    teachers: structuredClone(TEACHERS),
    students: structuredClone(STUDENTS),
    admins: structuredClone(ADMINS),
    activationCodes: structuredClone(ACTIVATION_CODES),
    catalogTopics: structuredClone(CATALOG_TOPICS),
    catalogOverrides: structuredClone(CATALOG_VISIBILITY_OVERRIDES),
    examples: structuredClone(WRITING_EXAMPLES),
    assignments: structuredClone(ASSIGNMENTS),
    submissions: structuredClone(SUBMISSIONS),
    auditEvents: structuredClone(AUDIT_EVENTS),
  };
}

function loadState(): MockState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as MockState;
  } catch {
    // fall through to seed
  }
  return seedState();
}

class MockStore {
  private state: MockState = loadState();
  private listeners = new Set<() => void>();

  getState = (): MockState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private commit(next: MockState) {
    this.state = next;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable — continue in-memory only
    }
    this.listeners.forEach((l) => l());
  }

  resetToSeed() {
    localStorage.removeItem(STORAGE_KEY);
    this.commit(seedState());
  }

  private update(mutator: (draft: MockState) => MockState) {
    this.commit(mutator(structuredClone(this.state)));
  }

  addAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>) {
    this.update((s) => {
      s.auditEvents = [
        { ...event, id: `audit_${Date.now()}`, timestamp: new Date().toISOString() },
        ...s.auditEvents,
      ];
      return s;
    });
  }

  // ---------- Auth ----------
  findUserByUsername(username: string): AppUser | undefined {
    const s = this.state;
    return (
      s.students.find((u) => u.username === username) ??
      s.teachers.find((u) => u.username === username) ??
      (s.admins as AppUser[]).find((u) => u.username === username)
    );
  }

  markLogin(userId: string) {
    this.update((s) => {
      for (const list of [s.students, s.teachers] as { id: string; lastLoginAt?: string }[][]) {
        const u = list.find((x) => x.id === userId);
        if (u) u.lastLoginAt = new Date().toISOString();
      }
      const admin = (s.admins as AppUser[]).find((x) => x.id === userId);
      if (admin) admin.lastLoginAt = new Date().toISOString();
      return s;
    });
  }

  validateActivationCode(code: string): ActivationCode | undefined {
    return this.state.activationCodes.find((c) => c.code.toUpperCase() === code.trim().toUpperCase());
  }

  isUsernameTaken(username: string): boolean {
    return !!this.findUserByUsername(username);
  }

  activateStudent(params: {
    codeId: string; username: string; passwordHash: string; email?: string; phone?: string;
  }): StudentProfile {
    let created!: StudentProfile;
    this.update((s) => {
      const code = s.activationCodes.find((c) => c.id === params.codeId)!;
      const studentId = `student_${Date.now()}`;
      created = {
        id: studentId,
        role: 'student',
        username: params.username,
        displayName: params.username,
        email: params.email,
        phone: params.phone,
        status: 'active',
        createdAt: new Date().toISOString(),
        schoolId: code.schoolId,
        classIds: [code.classId],
      };
      s.students.push(created);
      code.status = 'used';
      code.usedByStudentId = studentId;
      code.usedAt = new Date().toISOString();
      const cls = s.classes.find((c) => c.id === code.classId);
      if (cls) cls.studentIds.push(studentId);
      return s;
    });
    return created;
  }

  // ---------- Teacher: password / permissions ----------
  resetStudentPassword(studentId: string, teacherId: string, teacherName: string) {
    this.update((s) => {
      const student = s.students.find((x) => x.id === studentId);
      if (student) student.status = 'pending_password_reset';
      return s;
    });
    const student = this.state.students.find((x) => x.id === studentId);
    this.addAuditEvent({
      type: 'password_reset',
      actorId: teacherId,
      actorName: teacherName,
      targetLabel: student?.displayName ?? studentId,
      detail: 'Temporary password issued; student must change password at next login.',
    });
  }

  // ---------- Submissions ----------
  saveSubmissionDraft(submissionId: string, text: string) {
    this.update((s) => {
      const sub = s.submissions.find((x) => x.id === submissionId);
      if (sub) {
        sub.text = text;
        sub.wordCount = text.trim().length ? text.trim().split(/\s+/).length : 0;
        sub.lastSavedAt = new Date().toISOString();
        if (sub.status === 'not_started') sub.status = 'in_progress';
      }
      return s;
    });
  }

  createDraftSubmission(input: {
    id: string; assignmentId?: string; isPractice: boolean; studentId: string; schoolId: string;
    writingTypeId: Submission['writingTypeId']; level: Submission['level']; topicTitle: string;
  }): Submission {
    const draft: Submission = {
      ...input,
      text: '',
      wordCount: 0,
      status: 'in_progress',
      lastSavedAt: new Date().toISOString(),
      scoreVisibleToStudent: true,
      usesCustomRubric: false,
      criterionScores: [],
      annotations: [],
      studyRecommendations: [],
      teacherOverrides: [],
    };
    this.update((s) => {
      s.submissions.push(structuredClone(draft));
      return s;
    });
    return draft;
  }

  submitSubmission(submissionId: string) {
    const sub = this.state.submissions.find((x) => x.id === submissionId);
    if (!sub || (sub.status !== 'not_started' && sub.status !== 'in_progress')) return;

    this.update((s) => {
      const target = s.submissions.find((x) => x.id === submissionId);
      if (target) {
        target.status = 'submitted';
        target.submittedAt = new Date().toISOString();
        target.lastSavedAt = target.submittedAt;
      }
      return s;
    });

    window.setTimeout(() => {
      this.update((s) => {
        const target = s.submissions.find((x) => x.id === submissionId);
        if (target && target.status === 'submitted') target.status = 'analyzing';
        return s;
      });
      void this.runGrading(submissionId);
    }, 800);
  }

  retryAiGrading(submissionId: string) {
    const sub = this.state.submissions.find((x) => x.id === submissionId);
    if (!sub || sub.status !== 'grading_failed') return;
    this.update((s) => {
      const target = s.submissions.find((x) => x.id === submissionId);
      if (target) target.status = 'analyzing';
      return s;
    });
    void this.runGrading(submissionId);
  }

  private async runGrading(submissionId: string) {
    const sub = this.state.submissions.find((x) => x.id === submissionId);
    if (!sub) return;
    const assignment = sub.assignmentId ? this.state.assignments.find((a) => a.id === sub.assignmentId) : undefined;
    const criteria = (assignment?.rubric.criteria ?? standardCriteria()).filter((c) => c.enabled);

    try {
      const result = await gradeWithAi({
        text: sub.text,
        writingTypeId: sub.writingTypeId,
        level: sub.level,
        assignmentPrompt: assignment?.prompt,
        minWords: assignment?.minWords,
        maxWords: assignment?.maxWords,
        criteria,
      });
      this.update((s) => {
        const target = s.submissions.find((x) => x.id === submissionId);
        if (target && target.status === 'analyzing') {
          target.criterionScores = result.criterionScores;
          target.annotations = result.annotations;
          const overall = recomputeFinalScore(result.criterionScores);
          target.aiScore = overall;
          target.finalScore = target.scoreVisibleToStudent ? overall : undefined;
          target.status = target.assignmentId ? 'teacher_review_pending' : 'result_ready';
          if (!target.assignmentId) target.finalScore = overall;
        }
        return s;
      });
    } catch (err) {
      console.error('[grading] request failed:', err);
      this.update((s) => {
        const target = s.submissions.find((x) => x.id === submissionId);
        if (target && target.status === 'analyzing') target.status = 'grading_failed';
        return s;
      });
    }
  }

  applyTeacherOverride(params: {
    submissionId: string; criterionId?: string; newScore: number; reason: string; teacherId: string; teacherName: string;
  }) {
    this.update((s) => {
      const sub = s.submissions.find((x) => x.id === params.submissionId);
      if (!sub) return s;
      let original = sub.aiScore ?? 0;
      if (params.criterionId) {
        const crit = sub.criterionScores.find((c) => c.criterionId === params.criterionId);
        if (crit) {
          original = crit.aiScore;
          crit.teacherScore = params.newScore;
        }
      }
      const override: TeacherOverride = {
        id: `override_${Date.now()}`,
        submissionId: params.submissionId,
        criterionId: params.criterionId,
        originalAiScore: original,
        finalScore: params.newScore,
        reason: params.reason,
        teacherId: params.teacherId,
        timestamp: new Date().toISOString(),
      };
      sub.teacherOverrides.push(override);
      sub.finalScore = recomputeFinalScore(sub.criterionScores);
      return s;
    });
    const sub = this.state.submissions.find((x) => x.id === params.submissionId);
    this.addAuditEvent({
      type: 'score_override',
      actorId: params.teacherId,
      actorName: params.teacherName,
      targetLabel: `${this.state.students.find((st) => st.id === sub?.studentId)?.displayName ?? ''} — ${sub?.topicTitle ?? ''}`,
      detail: params.reason,
    });
  }

  publishTeacherReview(submissionId: string, feedback: string, teacherId: string) {
    this.update((s) => {
      const sub = s.submissions.find((x) => x.id === submissionId);
      if (sub) {
        sub.teacherFeedback = feedback;
        sub.reviewedBy = teacherId;
        sub.reviewedAt = new Date().toISOString();
        sub.status = 'result_ready';
        sub.scoreVisibleToStudent = true;
        if (sub.finalScore === undefined) sub.finalScore = sub.aiScore;
      }
      return s;
    });
  }

  // ---------- Assignments ----------
  createAssignment(assignment: Assignment) {
    this.update((s) => {
      s.assignments.push(structuredClone(assignment));
      return s;
    });
  }

  // ---------- Catalog ----------
  hideCatalogTopicForSchool(schoolId: string, topicId: string, teacherId: string, teacherName: string) {
    this.update((s) => {
      const existing = s.catalogOverrides.find((o) => o.schoolId === schoolId && o.topicId === topicId);
      if (existing) {
        existing.hidden = true;
        existing.updatedAt = new Date().toISOString();
        existing.updatedBy = teacherId;
      } else {
        s.catalogOverrides.push({
          id: `override_${Date.now()}`, schoolId, topicId, hidden: true,
          updatedAt: new Date().toISOString(), updatedBy: teacherId,
        });
      }
      return s;
    });
    const topic = this.state.catalogTopics.find((t) => t.id === topicId);
    this.addAuditEvent({
      type: 'catalog_hidden', actorId: teacherId, actorName: teacherName,
      targetLabel: topic?.title ?? topicId, detail: 'Hidden for this school.',
    });
  }

  restoreCatalogTopicForSchool(schoolId: string, topicId: string, teacherId: string, teacherName: string) {
    this.update((s) => {
      const existing = s.catalogOverrides.find((o) => o.schoolId === schoolId && o.topicId === topicId);
      if (existing) {
        existing.hidden = false;
        existing.updatedAt = new Date().toISOString();
        existing.updatedBy = teacherId;
      }
      return s;
    });
    const topic = this.state.catalogTopics.find((t) => t.id === topicId);
    this.addAuditEvent({
      type: 'catalog_restored', actorId: teacherId, actorName: teacherName,
      targetLabel: topic?.title ?? topicId, detail: 'Restored for this school.',
    });
  }

  duplicateCatalogTopicToSchool(topicId: string, schoolId: string, teacherId: string): CatalogTopic {
    const source = this.state.catalogTopics.find((t) => t.id === topicId)!;
    const copy: CatalogTopic = {
      ...structuredClone(source),
      id: `topic_${Date.now()}`,
      sourceType: 'school_library',
      visibility: 'school',
      schoolId,
      createdBy: teacherId,
      originTopicId: source.id,
      updatedAt: new Date().toISOString(),
    };
    this.update((s) => {
      s.catalogTopics.push(copy);
      return s;
    });
    return copy;
  }

  upsertSchoolCatalogTopic(topic: CatalogTopic) {
    this.update((s) => {
      const idx = s.catalogTopics.findIndex((t) => t.id === topic.id);
      if (idx >= 0) s.catalogTopics[idx] = topic;
      else s.catalogTopics.push(topic);
      return s;
    });
  }

  deleteSchoolCatalogTopic(topicId: string) {
    this.update((s) => {
      s.catalogTopics = s.catalogTopics.filter((t) => t.id !== topicId);
      return s;
    });
  }

  // ---------- Activation codes ----------
  createActivationCodeBatch(params: { schoolId: string; classId: string; count: number; expiresAt: string; batchId: string }): ActivationCode[] {
    const codes: ActivationCode[] = Array.from({ length: params.count }).map((_, i) => ({
      id: `code_${Date.now()}_${i}`,
      code: generateCode(),
      schoolId: params.schoolId,
      classId: params.classId,
      status: 'unused',
      createdAt: new Date().toISOString(),
      expiresAt: params.expiresAt,
      batchId: params.batchId,
    }));
    this.update((s) => {
      s.activationCodes.push(...codes);
      return s;
    });
    return codes;
  }

  revokeActivationCode(codeId: string, actorId: string, actorName: string) {
    this.update((s) => {
      const code = s.activationCodes.find((c) => c.id === codeId);
      if (code) code.status = 'revoked';
      return s;
    });
    const code = this.state.activationCodes.find((c) => c.id === codeId);
    this.addAuditEvent({
      type: 'activation_code_revoked', actorId, actorName,
      targetLabel: code?.code ?? codeId, detail: 'Revoked by administrator.',
    });
  }

  // ---------- Admin: schools & accounts ----------
  createSchool(school: School) {
    this.update((s) => {
      s.schools.push(school);
      return s;
    });
  }

  setSchoolStatus(schoolId: string, status: School['status'], actorId: string, actorName: string) {
    this.update((s) => {
      const school = s.schools.find((sc) => sc.id === schoolId);
      if (school) school.status = status;
      return s;
    });
    const school = this.state.schools.find((sc) => sc.id === schoolId);
    this.addAuditEvent({
      type: status === 'suspended' ? 'account_suspended' : 'account_reactivated',
      actorId, actorName, targetLabel: school?.name ?? schoolId,
      detail: status === 'suspended' ? 'School suspended.' : 'School reactivated.',
    });
  }

  setAccountStatus(userId: string, status: 'active' | 'suspended', actorId: string, actorName: string) {
    this.update((s) => {
      const student = s.students.find((u) => u.id === userId);
      const teacher = s.teachers.find((u) => u.id === userId);
      if (student) student.status = status;
      if (teacher) teacher.status = status;
      return s;
    });
    const target = this.state.students.find((u) => u.id === userId) ?? this.state.teachers.find((u) => u.id === userId);
    this.addAuditEvent({
      type: status === 'suspended' ? 'account_suspended' : 'account_reactivated',
      actorId, actorName, targetLabel: target?.displayName ?? userId,
      detail: status === 'suspended' ? 'Account suspended.' : 'Account reactivated.',
    });
  }

  createTeacher(teacher: TeacherProfile) {
    this.update((s) => {
      s.teachers.push(teacher);
      return s;
    });
  }

  updateTeacherPermissions(teacherId: string, permissions: TeacherProfile['permissions'], actorId: string, actorName: string) {
    this.update((s) => {
      const teacher = s.teachers.find((t) => t.id === teacherId);
      if (teacher) teacher.permissions = permissions;
      return s;
    });
    const teacher = this.state.teachers.find((t) => t.id === teacherId);
    this.addAuditEvent({
      type: 'teacher_permission_changed', actorId, actorName,
      targetLabel: teacher?.displayName ?? teacherId, detail: `Permissions updated: ${permissions.join(', ') || 'none'}.`,
    });
  }

  promoteCatalogTopicToGlobal(topicId: string) {
    this.update((s) => {
      const topic = s.catalogTopics.find((t) => t.id === topicId);
      if (topic) {
        topic.visibility = 'global';
        topic.sourceType = 'pasific_library';
        topic.schoolId = undefined;
        topic.updatedAt = new Date().toISOString();
      }
      return s;
    });
  }
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `PSFC-${seg()}-${seg()}`;
}

function recomputeFinalScore(scores: CriterionScore[]): number {
  const totalWeight = scores.reduce((sum, c) => sum + c.weight, 0) || 100;
  const weighted = scores.reduce((sum, c) => {
    const effective = c.teacherScore ?? c.aiScore;
    return sum + (effective / c.maxScore) * c.weight;
  }, 0);
  return Math.round((weighted / totalWeight) * 100);
}

export const mockStore = new MockStore();
