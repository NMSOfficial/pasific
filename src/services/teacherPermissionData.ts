import { supabase } from './supabaseClient';
import type { TeacherPermissionKey } from '../types/entities';

/**
 * Replaces the full permission set in one database transaction.
 * The RPC performs its own active-admin authorization check.
 */
export async function replaceTeacherPermissions(
  teacherId: string,
  permissions: TeacherPermissionKey[],
): Promise<void> {
  const { error } = await supabase.rpc('replace_teacher_permissions', {
    p_teacher_id: teacherId,
    p_permissions: permissions,
  });
  if (error) throw error;
}
