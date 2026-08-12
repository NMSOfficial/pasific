import { supabase } from './supabaseClient';
import type { SchoolClass, StudentProfile } from '../types/entities';

export interface ClassMeta {
  id: string;
  schoolId: string;
  name: string;
  gradeLabel: string;
  studentIds: string[];
  createdAt: string;
}

function groupByKey<T extends Record<string, unknown>>(rows: T[], key: string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = row[key] as string;
    const list = map.get(k) ?? [];
    list.push(row);
    map.set(k, list);
  }
  return map;
}

async function attachStudentIds(classes: Record<string, unknown>[]): Promise<ClassMeta[]> {
  const classIds = classes.map((c) => c.id as string);
  const { data: links } = classIds.length
    ? await supabase.from('student_classes').select('class_id, student_id').in('class_id', classIds)
    : { data: [] as { class_id: string; student_id: string }[] };
  const byClass = groupByKey(links ?? [], 'class_id');
  return classes.map((c) => ({
    id: c.id as string,
    schoolId: c.school_id as string,
    name: c.name as string,
    gradeLabel: (c.grade_label as string | null) ?? '',
    createdAt: c.created_at as string,
    studentIds: (byClass.get(c.id as string) ?? []).map((r) => r.student_id as string),
  }));
}

/**
 * Every class in the teacher's own school(s) — not just ones explicitly
 * linked via teacher_classes. That table only ever gets a row when a
 * teacher creates a class themselves (create_class_for_teacher); a class
 * created by an admin (or by a colleague) was otherwise invisible to every
 * other teacher at the school, even though they have full permissions
 * there. RLS already allows this (school_classes is readable by any
 * is_teacher_of_school(school_id)) — this was purely a client-side filter
 * that was narrower than the actual access model.
 */
export async function fetchTeacherClasses(teacherId: string): Promise<ClassMeta[]> {
  const { data: schoolLinks } = await supabase.from('teacher_schools').select('school_id').eq('teacher_id', teacherId);
  const schoolIds = (schoolLinks ?? []).map((r) => r.school_id as string);
  if (!schoolIds.length) return [];
  const { data: classes } = await supabase.from('school_classes').select('*').in('school_id', schoolIds);
  return attachStudentIds(classes ?? []);
}

export async function createClassForTeacher(input: { schoolId: string; name: string; gradeLabel: string }): Promise<string> {
  const { data, error } = await supabase.rpc('create_class_for_teacher', {
    p_school_id: input.schoolId,
    p_name: input.name,
    p_grade_label: input.gradeLabel,
  });
  if (error) throw error;
  return data as string;
}

export async function fetchClass(classId: string): Promise<ClassMeta | null> {
  const { data: row } = await supabase.from('school_classes').select('*').eq('id', classId).maybeSingle();
  if (!row) return null;
  const [meta] = await attachStudentIds([row]);
  return meta ?? null;
}

export function toSchoolClass(c: ClassMeta, teacherIds: string[] = []): SchoolClass {
  return { id: c.id, schoolId: c.schoolId, name: c.name, gradeLabel: c.gradeLabel, studentIds: c.studentIds, teacherIds, createdAt: c.createdAt };
}

function mapStudentProfile(row: Record<string, unknown>, classIds: string[]): StudentProfile {
  return {
    id: row.id as string,
    role: 'student',
    username: row.username as string,
    displayName: row.display_name as string,
    email: (row.email as string | null) ?? undefined,
    phone: (row.phone as string | null) ?? undefined,
    status: row.status as StudentProfile['status'],
    createdAt: row.created_at as string,
    lastLoginAt: (row.last_login_at as string | null) ?? undefined,
    schoolId: row.school_id as string,
    classIds,
    mustChangePassword: row.must_change_password as boolean,
  };
}

export async function fetchStudentsByIds(ids: string[]): Promise<StudentProfile[]> {
  if (!ids.length) return [];
  const [{ data: profiles }, { data: classLinks }] = await Promise.all([
    supabase.from('profiles').select('*').in('id', ids),
    supabase.from('student_classes').select('student_id, class_id').in('student_id', ids),
  ]);
  const classesByStudent = groupByKey(classLinks ?? [], 'student_id');
  return (profiles ?? []).map((p) => mapStudentProfile(p, (classesByStudent.get(p.id as string) ?? []).map((c) => c.class_id as string)));
}

export async function fetchStudent(studentId: string): Promise<StudentProfile | null> {
  const [student] = await fetchStudentsByIds([studentId]);
  return student ?? null;
}

export async function fetchUserDisplayName(userId: string): Promise<string | undefined> {
  const { data } = await supabase.from('profiles').select('display_name').eq('id', userId).maybeSingle();
  return (data?.display_name as string | undefined) ?? undefined;
}

export async function resetStudentPassword(studentId: string, teacherId: string, teacherName: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ status: 'pending_password_reset', must_change_password: true }).eq('id', studentId);
  if (error) throw error;
  const { data: student } = await supabase.from('profiles').select('display_name').eq('id', studentId).maybeSingle();
  await supabase.from('audit_events').insert({
    type: 'password_reset',
    actor_id: teacherId,
    actor_name: teacherName,
    target_label: student?.display_name ?? studentId,
    detail: 'Temporary password issued; student must change password at next login.',
  });
}
