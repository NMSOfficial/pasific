import type { MockState } from './store';
import type { Assignment, CatalogTopic, PortfolioMetric, Submission, SubmissionStatus, TeacherPermissionKey, TeacherProfile } from '../types/entities';

export function getSchool(state: MockState, schoolId: string) {
  return state.schools.find((s) => s.id === schoolId);
}

export function getClass(state: MockState, classId: string) {
  return state.classes.find((c) => c.id === classId);
}

export function getClassesForSchool(state: MockState, schoolId: string) {
  return state.classes.filter((c) => c.schoolId === schoolId);
}

export function getStudent(state: MockState, studentId: string) {
  return state.students.find((s) => s.id === studentId);
}

export function getTeacher(state: MockState, teacherId: string) {
  return state.teachers.find((t) => t.id === teacherId);
}

export function teacherHasPermission(teacher: TeacherProfile | undefined, permission: TeacherPermissionKey): boolean {
  return !!teacher?.permissions.includes(permission);
}

export function getAssignmentsForClass(state: MockState, classId: string): Assignment[] {
  return state.assignments.filter((a) => a.classIds.includes(classId));
}

export function getAssignmentsForTeacher(state: MockState, teacher: TeacherProfile): Assignment[] {
  return state.assignments.filter((a) => a.classIds.some((cid) => teacher.classIds.includes(cid)));
}

export function getAssignment(state: MockState, assignmentId: string) {
  return state.assignments.find((a) => a.id === assignmentId);
}

export function getSubmission(state: MockState, submissionId: string) {
  return state.submissions.find((s) => s.id === submissionId);
}

export function getSubmissionsForStudent(state: MockState, studentId: string): Submission[] {
  return state.submissions.filter((s) => s.studentId === studentId);
}

export function getSubmissionForAssignment(state: MockState, assignmentId: string, studentId: string): Submission | undefined {
  return state.submissions.find((s) => s.assignmentId === assignmentId && s.studentId === studentId);
}

export function getSubmissionsForAssignment(state: MockState, assignmentId: string): Submission[] {
  return state.submissions.filter((s) => s.assignmentId === assignmentId);
}

export function assignmentStatusForStudent(state: MockState, assignmentId: string, studentId: string): SubmissionStatus {
  const sub = getSubmissionForAssignment(state, assignmentId, studentId);
  return sub?.status ?? 'not_started';
}

export function getVisibleCatalogForSchool(state: MockState, schoolId: string | undefined): CatalogTopic[] {
  const hiddenIds = new Set(
    state.catalogOverrides.filter((o) => o.schoolId === schoolId && o.hidden).map((o) => o.topicId)
  );
  return state.catalogTopics.filter((t) => {
    if (t.visibility === 'global') return !hiddenIds.has(t.id);
    if (t.visibility === 'school') return t.schoolId === schoolId;
    return false; // personal_draft handled separately (owner-only)
  });
}

export function getDraftsForTeacher(state: MockState, teacherId: string): CatalogTopic[] {
  return state.catalogTopics.filter((t) => t.visibility === 'personal_draft' && t.createdBy === teacherId);
}

export function getHiddenGlobalTopicsForSchool(state: MockState, schoolId: string): CatalogTopic[] {
  const hiddenIds = new Set(
    state.catalogOverrides.filter((o) => o.schoolId === schoolId && o.hidden).map((o) => o.topicId)
  );
  return state.catalogTopics.filter((t) => t.visibility === 'global' && hiddenIds.has(t.id));
}

export function getExample(state: MockState, exampleId: string) {
  return state.examples.find((e) => e.id === exampleId);
}

export function computePortfolioMetrics(state: MockState, studentId: string): PortfolioMetric {
  const subs = getSubmissionsForStudent(state, studentId)
    .filter((s) => s.status === 'result_ready' && s.finalScore !== undefined)
    .sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''));

  const scoreTrend = subs
    .filter((s) => !s.usesCustomRubric)
    .map((s) => ({ date: s.submittedAt ?? '', score: s.finalScore as number, submissionId: s.id }));

  const criterionTrend: Record<string, { date: string; score: number }[]> = {};
  for (const s of subs) {
    if (s.usesCustomRubric) continue;
    for (const c of s.criterionScores) {
      const pct = Math.round(((c.teacherScore ?? c.aiScore) / c.maxScore) * 100);
      criterionTrend[c.criterionKey] ??= [];
      criterionTrend[c.criterionKey].push({ date: s.submittedAt ?? '', score: pct });
    }
  }

  const errorCounts = new Map<string, number>();
  for (const s of subs) {
    for (const a of s.annotations) {
      errorCounts.set(a.categoryId, (errorCounts.get(a.categoryId) ?? 0) + 1);
    }
  }
  const topErrorCategories = [...errorCounts.entries()]
    .map(([categoryId, count]) => ({ categoryId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    studentId,
    totalCompleted: subs.length,
    writingTypesPractised: [...new Set(subs.map((s) => s.writingTypeId))],
    scoreTrend,
    criterionTrend,
    topErrorCategories,
    recentlyImproved: [],
  };
}
