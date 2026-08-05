import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export function PasswordChangeSection() {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 8) {
      setMessage({ kind: 'error', text: t('settings.password.tooShort') });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ kind: 'error', text: t('settings.password.mismatch') });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSubmitting(false);

    if (error) {
      setMessage({ kind: 'error', text: t('settings.password.error') });
      return;
    }
    setMessage({ kind: 'success', text: t('settings.password.success') });
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <section className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <h2 style={{ fontSize: 'var(--text-md)' }}>{t('settings.password.title')}</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <div className="field">
          <label className="field__label" htmlFor="new-password">{t('settings.password.new')}</label>
          <input
            id="new-password"
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
          <label className="field__label" htmlFor="confirm-password">{t('settings.password.confirm')}</label>
          <input
            id="confirm-password"
            type="password"
            className="input-control"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        {message && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: message.kind === 'success' ? 'var(--color-success)' : 'var(--color-error)' }}>
            {message.kind === 'success' ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertCircle size={16} aria-hidden="true" />}
            {message.text}
          </div>
        )}
        <button type="submit" className="btn btn--primary" style={{ alignSelf: 'flex-start' }} disabled={submitting}>
          {t('settings.password.submit')}
        </button>
      </form>
    </section>
  );
}
