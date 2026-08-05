const API_BASE = import.meta.env.VITE_API_URL ?? '';

export type RecoveryResult = 'sent' | 'no_recovery';

/**
 * Unauthenticated by design — the user isn't logged in yet. Actually
 * generates and emails a real recovery link (via the server's Resend
 * integration) rather than just checking whether a contact is on file.
 */
export async function requestPasswordReset(username: string, method: 'email' | 'phone'): Promise<RecoveryResult> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/request-password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, method }),
    });
    if (!res.ok) return 'sent';
    const body = (await res.json()) as { result?: RecoveryResult };
    return body.result ?? 'sent';
  } catch {
    // Network failure shouldn't reveal anything about the account either.
    return 'sent';
  }
}
