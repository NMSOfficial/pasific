interface SupabaseRpcError {
  message?: string;
  code?: string;
}

/**
 * Hard-deletes a teacher/student account through a SECURITY DEFINER RPC.
 * The RPC verifies auth.uid() is an active super_admin and refuses self or
 * super-admin deletion. The requester's access token is forwarded so the
 * database performs authorization without a service-role key.
 */
export async function deleteUserAccount(
  targetUserId: string,
  requesterAuthorization: string | undefined,
  deps: { supabaseUrl: string; anonKey: string },
): Promise<void> {
  if (!requesterAuthorization?.startsWith('Bearer ')) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${deps.supabaseUrl}/rest/v1/rpc/admin_delete_user`, {
    method: 'POST',
    headers: {
      Authorization: requesterAuthorization,
      apikey: deps.anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_user_id: targetUserId }),
  });

  if (response.ok) return;

  const body = (await response.json().catch(() => ({}))) as SupabaseRpcError;
  throw new Error(body.message ?? `Account deletion failed (${response.status})`);
}
