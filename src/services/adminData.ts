import { supabase } from './supabaseClient';
import type { AuditEvent, TeacherPermissionKey } from '../types/entities';

type Actor = { id: string; displayName: string };

export interface SchoolSummary {
  id: string;
  name: string;
  city: string | null;
  status: 'active' | 'suspended';
  planStatus: 'pilot' | 'standard' | 'trial_expired';
  createdAt: string;
  teacherCount: number;
  studentCount: number;
  classCount: number;
  activeAssignmentCount: number;
}

export interface ClassRow {
  id: string;
  name: string;
  gradeLabel: string | null;
  studentCount: number;
}

export interface TeacherRow {
  id: string;
  username: string;
  displayName: string;
  status: 'active' | 'suspended' | 'pending_password_reset';
  lastLoginAt: string | null;
  permissions: TeacherPermissionKey[];
}

export interface StudentRow {
  id: string;
  username: string;
  displayName: string;
  status: 'active' | 'suspended' | 'pending_password_reset';
  schoolId: string | null;
  schoolName: string | null;
}

export interface ActivationCodeRow {
  id: string;
  code: string;
  role: 'student' | 'teacher';
  classId: string | null;
  className: string | null;
  status: 'unused' | 'used' | 'expired' | 'revoked';
  createdAt: string;
  expiresAt: string;
}

function mapSchool(school: Record<string, unknown>, stats: Record<string, unknown> | null | undefined): SchoolSummary {
  return {
    id: school.id as string,
    name: school.name as string,
    city: (school.city as string | null) ?? null,
    status: school.status as SchoolSummary['status'],
    planStatus: school.plan_status as SchoolSummary['planStatus'],
    createdAt: school.created_at as string,
    teacherCount: (stats?.teacher_count as number) ?? 0,
    studentCount: (stats?.student_count as number) ?? 0,
    classCount: (stats?.class_count as number) ?? 0,
    activeAssignmentCount: (stats?.active_assignment_count as number) ?? 0,
  };
}

export async function fetchSchools(): Promise<SchoolSummary[]> {
  const [{ data: schools }, { data: stats }] = await Promise.all([
    supabase.from('schools').select('*').order('created_at', { ascending: false }),
    supabase.from('school_stats').select('*'),
  ]);
  const statsById = new Map((stats ?? []).map((s) => [s.school_id as string, s]));
  return (schools ?? []).map((s) => mapSchool(s, statsById.get(s.id as string)));
}

export async function fetchSchool(schoolId: string): Promise<SchoolSummary | null> {
  const [{ data: school }, { data: stats }] = await Promise.all([
    supabase.from('schools').select('*').eq('id', schoolId).maybeSingle(),
    supabase.from('school_stats').select('*').eq('school_id', schoolId).maybeSingle(),
  ]);
  if (!school) return null;
  return mapSchool(school, stats);
}

export async function createSchool(input: { name: string; city: string }): Promise<void> {
  const { error } = await supabase.from('schools').insert({ name: input.name, city: input.city });
  if (error) throw error;
}

export async function setSchoolStatus(schoolId: string, status: 'active' | 'suspended', actor: Actor): Promise<void> {
  const { error } = await supabase.from('schools').update({ status }).eq('id', schoolId);
  if (error) throw error;
  await logAudit(status === 'suspended' ? 'account_suspended' : 'account_reactivated', actor, schoolId, `School ${status}`);
}

export async function createClass(input: { schoolId: string; name: string; gradeLabel: string }): Promise<void> {
  const { error } = await supabase
    .from('school_classes')
    .insert({ school_id: input.schoolId, name: input.name, grade_label: input.gradeLabel || null });
  if (error) throw error;
}

export async function fetchClassesForSchool(schoolId: string): Promise<ClassRow[]> {
  const { data: classes } = await supabase.from('school_classes').select('*').eq('school_id', schoolId);
  const classIds = (classes ?? []).map((c) => c.id as string);
  const { data: links } = classIds.length
    ? await supabase.from('student_classes').select('class_id').in('class_id', classIds)
    : { data: [] as { class_id: string }[] };

  const countByClass = new Map<string, number>();
  for (const row of links ?? []) {
    countByClass.set(row.class_id as string, (countByClass.get(row.class_id as string) ?? 0) + 1);
  }

  return (classes ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    gradeLabel: (c.grade_label as string | null) ?? null,
    studentCount: countByClass.get(c.id as string) ?? 0,
  }));
}

export async function fetchTeachersForSchool(schoolId: string): Promise<TeacherRow[]> {
  const { data: links } = await supabase.from('teacher_schools').select('teacher_id').eq('school_id', schoolId);
  const teacherIds = (links ?? []).map((r) => r.teacher_id as string);
  if (!teacherIds.length) return [];
  const [{ data: profiles }, { data: perms }] = await Promise.all([
    supabase.from('profiles').select('*').in('id', teacherIds),
    supabase.from('teacher_permissions').select('teacher_id, permission').in('teacher_id', teacherIds),
  ]);
  const permsByTeacher = new Map<string, TeacherPermissionKey[]>();
  for (const row of perms ?? []) {
    const list = permsByTeacher.get(row.teacher_id as string) ?? [];
    list.push(row.permission as TeacherPermissionKey);
    permsByTeacher.set(row.teacher_id as string, list);
  }
  return (profiles ?? []).map((p) => ({
    id: p.id as string,
    username: p.username as string,
    displayName: p.display_name as string,
    status: p.status as TeacherRow['status'],
    lastLoginAt: (p.last_login_at as string | null) ?? null,
    permissions: permsByTeacher.get(p.id as string) ?? [],
  }));
}

export async function fetchStudentsForSchool(schoolId: string): Promise<StudentRow[]> {
  const { data } = await supabase.from('profiles').select('*').eq('school_id', schoolId).eq('role', 'student');
  return (data ?? []).map((p) => ({
    id: p.id as string,
    username: p.username as string,
    displayName: p.display_name as string,
    status: p.status as StudentRow['status'],
    schoolId,
    schoolName: null,
  }));
}

export async function fetchTeachers(): Promise<TeacherRow[]> {
  const { data: profiles } = await supabase.from('profiles').select('*').eq('role', 'teacher');
  const teacherIds = (profiles ?? []).map((p) => p.id as string);
  const { data: perms } = teacherIds.length
    ? await supabase.from('teacher_permissions').select('teacher_id, permission').in('teacher_id', teacherIds)
    : { data: [] as { teacher_id: string; permission: string }[] };

  const permsByTeacher = new Map<string, TeacherPermissionKey[]>();
  for (const row of perms ?? []) {
    const list = permsByTeacher.get(row.teacher_id as string) ?? [];
    list.push(row.permission as TeacherPermissionKey);
    permsByTeacher.set(row.teacher_id as string, list);
  }

  return (profiles ?? []).map((p) => ({
    id: p.id as string,
    username: p.username as string,
    displayName: p.display_name as string,
    status: p.status as TeacherRow['status'],
    lastLoginAt: (p.last_login_at as string | null) ?? null,
    permissions: permsByTeacher.get(p.id as string) ?? [],
  }));
}

export async function updateTeacherPermissions(teacherId: string, permissions: TeacherPermissionKey[], actor: Actor): Promise<void> {
  const { error: delError } = await supabase.from('teacher_permissions').delete().eq('teacher_id', teacherId);
  if (delError) throw delError;
  if (permissions.length) {
    const { error: insError } = await supabase
      .from('teacher_permissions')
      .insert(permissions.map((permission) => ({ teacher_id: teacherId, permission })));
    if (insError) throw insError;
  }
  await logAudit('teacher_permission_changed', actor, teacherId, `Permissions set to: ${permissions.join(', ') || 'none'}`);
}

export async function fetchStudents(): Promise<StudentRow[]> {
  const [{ data: profiles }, { data: schools }] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'student'),
    supabase.from('schools').select('id, name'),
  ]);
  const schoolNameById = new Map((schools ?? []).map((s) => [s.id as string, s.name as string]));
  return (profiles ?? []).map((p) => ({
    id: p.id as string,
    username: p.username as string,
    displayName: p.display_name as string,
    status: p.status as StudentRow['status'],
    schoolId: (p.school_id as string | null) ?? null,
    schoolName: p.school_id ? (schoolNameById.get(p.school_id as string) ?? null) : null,
  }));
}

export async function setAccountStatus(userId: string, status: 'active' | 'suspended', actor: Actor): Promise<void> {
  const { error } = await supabase.from('profiles').update({ status }).eq('id', userId);
  if (error) throw error;
  await logAudit(status === 'suspended' ? 'account_suspended' : 'account_reactivated', actor, userId, `Account ${status}`);
}

export async function fetchActivationCodes(schoolId: string): Promise<ActivationCodeRow[]> {
  const [{ data: codes }, { data: classes }] = await Promise.all([
    supabase.from('activation_codes').select('*').eq('school_id', schoolId).order('created_at', { ascending: false }),
    supabase.from('school_classes').select('id, name').eq('school_id', schoolId),
  ]);
  const classNameById = new Map((classes ?? []).map((c) => [c.id as string, c.name as string]));
  return (codes ?? []).map((c) => ({
    id: c.id as string,
    code: c.code as string,
    role: c.role as ActivationCodeRow['role'],
    classId: (c.class_id as string | null) ?? null,
    className: c.class_id ? (classNameById.get(c.class_id as string) ?? null) : null,
    status: c.status as ActivationCodeRow['status'],
    createdAt: c.created_at as string,
    expiresAt: c.expires_at as string,
  }));
}

function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `PSFC-${part()}-${part()}`;
}

export async function createActivationCodeBatch(input: {
  schoolId: string;
  role: 'student' | 'teacher';
  classId: string | null;
  count: number;
  expiresAt: string;
}): Promise<string[]> {
  const batchId = `batch_${Date.now()}`;
  const rows = Array.from({ length: input.count }, () => ({
    code: randomCode(),
    school_id: input.schoolId,
    class_id: input.role === 'teacher' ? null : input.classId,
    role: input.role,
    expires_at: input.expiresAt,
    batch_id: batchId,
  }));
  const { data, error } = await supabase.from('activation_codes').insert(rows).select('code');
  if (error) throw error;
  return (data ?? []).map((r) => r.code as string);
}

export async function revokeActivationCode(codeId: string, actor: Actor): Promise<void> {
  const { error } = await supabase.from('activation_codes').update({ status: 'revoked' }).eq('id', codeId);
  if (error) throw error;
  await logAudit('activation_code_revoked', actor, codeId, 'Activation code revoked');
}

export interface DashboardStats {
  schoolCount: number;
  teacherCount: number;
  studentCount: number;
  activeAssignmentCount: number;
  recentSchools: SchoolSummary[];
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const schools = await fetchSchools();
  const [{ count: teacherCount }, { count: studentCount }, { count: activeAssignmentCount }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('assignments').select('*', { count: 'exact', head: true }).eq('status', 'published'),
  ]);

  return {
    schoolCount: schools.length,
    teacherCount: teacherCount ?? 0,
    studentCount: studentCount ?? 0,
    activeAssignmentCount: activeAssignmentCount ?? 0,
    recentSchools: schools.slice(0, 5),
  };
}

async function logAudit(type: AuditEvent['type'], actor: Actor, targetLabel: string, detail: string): Promise<void> {
  await supabase.from('audit_events').insert({
    type,
    actor_id: actor.id,
    actor_name: actor.displayName,
    target_label: targetLabel,
    detail,
  });
}
