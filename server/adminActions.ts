import { createClient } from '@supabase/supabase-js';

/**
 * Hard-deletes a teacher/student account. Must go through the server (with
 * the service-role key) rather than a plain client-side `profiles` delete:
 * profiles.id references auth.users(id), not the other way round, so
 * deleting only the profiles row would leave a dangling auth.users entry
 * the person could still (confusingly) hold a session for. Deleting the
 * auth.users row cascades to profiles, teacher_permissions, teacher_schools,
 * teacher_classes and student_classes for free.
 */
export async function deleteUserAccount(
  targetUserId: string,
  deps: { supabaseUrl: string; serviceRoleKey: string },
): Promise<void> {
  const admin = createClient(deps.supabaseUrl, deps.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await admin.auth.admin.deleteUser(targetUserId);
  if (error) throw error;
}
