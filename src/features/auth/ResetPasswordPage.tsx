import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { supabase } from '../../services/supabaseClient';

type Status = 'checking' | 'ready' | 'invalid' | 'done';

/**
 * Landed on after clicking the link from a real password-reset email.
 * Supabase's client auto-detects the recovery token in the URL and
 * establishes a temporary session for it — we just wait for that, then let
 * the user set a new password via updateUser().
 */
export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<Status>('checking');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && active) setStatus('ready');
    });

    // Recovery events can fire before this effect subscribes, so also check
    // directly for an already-established session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session && status === 'checking') setStatus('ready');
      else if (active && !session) {
        // Give onAuthStateChange a moment in case the token is still being processed.
        setTimeout(() => { if (active) setStatus((s) => (s === 'checking' ? 'invalid' : s)); }, 2000);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError(t('settings.password.tooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('settings.password.mismatch'));
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setSubmitting(false);

    if (updateError) {
      setError(t('settings.password.error'));
      return;
    }
    await supabase.auth.signOut();
    setStatus('done');
  };

  return (
    <AuthLayout>
      <div className="auth-card__heading">
        <h1 className="auth-card__title">{t('auth.resetPassword.title')}</h1>
        <p className="auth-card__subtitle">{t('auth.resetPassword.subtitle')}</p>
      </div>

      {status === 'checking' && (
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{t('common.loading')}</p>
      )}

      {status === 'invalid' && (
        <div className="state-panel" style={{ padding: 'var(--space-4)' }} role="alert">
          <AlertCircle size={28} color="var(--color-warning)" aria-hidden="true" />
          <p className="state-panel__title">{t('auth.resetPassword.invalidTitle')}</p>
          <p>{t('auth.resetPassword.invalidDescription')}</p>
          <Link to="/forgot-password" className="btn btn--primary" style={{ marginTop: 'var(--space-3)' }}>
            {t('auth.resetPassword.requestNewLink')}
          </Link>
        </div>
      )}

      {status === 'done' && (
        <div className="auth-success">
          <CheckCircle2 size={32} color="var(--color-success)" aria-hidden="true" />
          <p>{t('auth.resetPassword.success')}</p>
          <Link to="/login" className="btn btn--primary" style={{ marginTop: 'var(--space-3)' }}>
            {t('auth.forgotPassword.backToLogin')}
          </Link>
        </div>
      )}

      {status === 'ready' && (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="reset-new-password">{t('settings.password.new')}</label>
            <input
              id="reset-new-password"
              type="password"
              className="input-control"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="reset-confirm-password">{t('settings.password.confirm')}</label>
            <input
              id="reset-confirm-password"
              type="password"
              className="input-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-error)' }}>
              <AlertCircle size={16} aria-hidden="true" />{error}
            </div>
          )}
          <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting}>
            {submitting ? t('common.loading') : t('settings.password.submit')}
          </button>
        </form>
      )}

      {status !== 'done' && (
        <div className="auth-card__footer-links">
          <Link to="/login">{t('auth.forgotPassword.backToLogin')}</Link>
        </div>
      )}
    </AuthLayout>
  );
}
