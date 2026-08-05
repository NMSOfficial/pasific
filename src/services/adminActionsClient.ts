import { supabase } from './supabaseClient';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

/**
 * Hard-deletes a teacher/student account via the server (service-role key,
 * super_admin checked server-side) — see server/adminActions.ts for why this
 * can't be a plain client-side `profiles` delete.
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/api/admin/delete-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ userId }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new Error(body.error ?? `Failed to delete account (${res.status})`);
  }
}
