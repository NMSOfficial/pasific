const AUTH_EMAIL_DOMAIN = 'accounts.pasific.app';

/**
 * Pasific logs in with a username, but Supabase Auth identifies accounts by
 * email. This deterministic mapping lets both login and account creation
 * derive the same internal address without a database round-trip.
 */
export function usernameToAuthEmail(username: string): string {
  const normalized = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '-');
  return `${normalized}@${AUTH_EMAIL_DOMAIN}`;
}
