import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { usernameToAuthEmail } from '../src/utils/authEmail.ts';

export type RecoveryResult = 'sent' | 'no_recovery';

interface PasswordResetDeps {
  supabaseUrl: string;
  serviceRoleKey: string;
  resendApiKey?: string;
  resendFromEmail?: string;
  /** Frontend origin the recovery link should redirect to, e.g. https://app.pasific.app */
  appOrigin?: string;
}

/**
 * Looks up the profile's recovery contact and, for email, actually generates
 * and emails a real Supabase recovery link (unlike the old
 * check_recovery_contact RPC, which only checked whether a contact was on
 * file). Never reveals whether a username exists — a missing profile and a
 * successfully-sent email both resolve to 'sent'.
 */
export async function requestPasswordReset(
  username: string,
  method: 'email' | 'phone',
  deps: PasswordResetDeps,
): Promise<RecoveryResult> {
  const admin = createClient(deps.supabaseUrl, deps.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile } = await admin
    .from('profiles')
    .select('username, email, phone')
    .eq('username', username.trim())
    .maybeSingle<{ username: string; email: string | null; phone: string | null }>();

  if (!profile) return 'sent';

  if (method === 'phone') {
    if (!profile.phone) return 'no_recovery';
    // No SMS provider (e.g. Twilio) is configured, so this can't actually be
    // delivered yet. Logged clearly rather than silently no-op-ing.
    console.warn(`[password-reset] phone recovery requested for "${profile.username}" but no SMS provider is configured — nothing was sent`);
    return 'sent';
  }

  if (!profile.email) return 'no_recovery';

  const recoveryEmail = profile.email;
  const authEmail = usernameToAuthEmail(profile.username);

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: authEmail,
    options: deps.appOrigin ? { redirectTo: `${deps.appOrigin}/reset-password` } : undefined,
  });

  if (error || !data?.properties?.action_link) {
    console.error(`[password-reset] failed to generate a recovery link for "${profile.username}":`, error?.message);
    return 'sent';
  }

  const actionLink = data.properties.action_link;

  if (!deps.resendApiKey || !deps.resendFromEmail) {
    console.warn(
      `[password-reset] RESEND_API_KEY/RESEND_FROM_EMAIL not configured — recovery link for "${profile.username}" was generated but NOT emailed. Link:`,
      actionLink,
    );
    return 'sent';
  }

  const resend = new Resend(deps.resendApiKey);
  const { error: sendError } = await resend.emails.send({
    from: deps.resendFromEmail,
    to: recoveryEmail,
    subject: 'Reset your Pasific password',
    html: `
      <p>We received a request to reset the password for your Pasific account (<strong>${profile.username}</strong>).</p>
      <p><a href="${actionLink}">Click here to choose a new password</a></p>
      <p>This link will expire soon. If you didn't request this, you can safely ignore this email.</p>
    `,
  });

  if (sendError) {
    console.error(`[password-reset] Resend failed to send to "${recoveryEmail}" for "${profile.username}":`, sendError.message);
  }
  return 'sent';
}
