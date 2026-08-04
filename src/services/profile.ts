import { supabase } from './supabaseClient';
import type { AppUser, TeacherPermissionKey } from '../types/entities';

export async function fetchAppUser(userId: string): Promise<AppUser | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) return null;

  const base = {
    id: profile.id as string,
    username: profile.username as string,
    displayName: profile.display_name as string,
    email: (profile.email as string | null) ?? undefined,
    phone: (profile.phone as string | null) ?? undefined,
    status: profile.status as AppUser['status'],
    createdAt: profile.created_at as string,
    lastLoginAt: (profile.last_login_at as string | null) ?? undefined,
  };

  if (profile.role === 'student') {
    const { data: classRows } = await supabase
      .from('student_classes')
      .select('class_id')
      .eq('student_id', userId);

    return {
      ...base,
      role: 'student',
      schoolId: profile.school_id as string,
      classIds: (classRows ?? []).map((r) => r.class_id as string),
      mustChangePassword: profile.must_change_password as boolean,
    };
  }

  if (profile.role === 'teacher') {
    const [{ data: schoolRows }, { data: classRows }, { data: permRows }] = await Promise.all([
      supabase.from('teacher_schools').select('school_id').eq('teacher_id', userId),
      supabase.from('teacher_classes').select('class_id').eq('teacher_id', userId),
      supabase.from('teacher_permissions').select('permission').eq('teacher_id', userId),
    ]);

    return {
      ...base,
      role: 'teacher',
      schoolIds: (schoolRows ?? []).map((r) => r.school_id as string),
      classIds: (classRows ?? []).map((r) => r.class_id as string),
      permissions: (permRows ?? []).map((r) => r.permission as TeacherPermissionKey),
      title: (profile.title as string | null) ?? undefined,
    };
  }

  return { ...base, role: 'super_admin' };
}

export async function markLogin(userId: string): Promise<void> {
  await supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', userId);
}
