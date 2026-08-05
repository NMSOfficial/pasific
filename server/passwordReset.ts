import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { usernameToAuthEmail } from '../src/utils/authEmail.ts';

export type RecoveryResult = 'sent' | 'no_recovery';

interface PasswordResetDeps {
  supabaseUrl: string;
  serviceRoleKey: string;
  resendApiKey?: string;
  resendFromEmail?: string;
  appOrigin?: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Generates and sends a Supabase recovery link without revealing whether the
 * supplied username exists. Recovery links and recipient details are never
 * written to application logs.
 */
export async function requestPasswordReset(
  username: string,
  method: 'email' | 'phone',
  deps: PasswordResetDeps,
): Promise<RecoveryResult> {
  // Phone recovery is intentionally disabled until an SMS provider exists.
  if (method === 'phone') return 'sent';

  const admin = createClient(deps.supabaseUrl, deps.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile } = await admin
    .from('profiles')
    .select('username, email')
    .eq('username', username.trim())
    .maybeSingle<{ username: string; email: string | null }>();

  if (!profile) return 'sent';
  if (!profile.email) return 'no_recovery';

  const authEmail = usernameToAuthEmail(profile.username);
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: authEmail,
    options: deps.appOrigin ? { redirectTo: `${deps.appOrigin.replace(/\/$/, '')}/reset-password` } : undefined,
  });

  if (error || !data?.properties?.action_link) {
    console.error('[password-reset] failed to generate recovery link');
    return 'sent';
  }

  if (!deps.resendApiKey || !deps.resendFromEmail) {
    console.error('[password-reset] email provider is not configured');
    return 'sent';
  }

  const safeUsername = escapeHtml(profile.username);
  const safeActionLink = escapeHtml(data.properties.action_link);
  const resend = new Resend(deps.resendApiKey);
  const { error: sendError } = await resend.emails.send({
    from: deps.resendFromEmail,
    to: profile.email,
    subject: 'Reset your Pasific password',
    text: `We received a request to reset the password for your Pasific account (${profile.username}). Open this link to choose a new password: ${data.properties.action_link}`,
    html: `<!doctype html><html><body><p>We received a request to reset the password for your Pasific account (<strong>${safeUsername}</strong>).</p><p><a href="${safeActionLink}">Choose a new password</a></p><p>This link will expire soon. If you did not request this, you can safely ignore this email.</p></body></html>`,
  });

  if (sendError) console.error('[password-reset] email delivery failed:', sendError.message);
  return 'sent';
}
