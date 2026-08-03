import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Mail, Phone, UserCog, CheckCircle2, AlertCircle } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { mockStore } from '../../mock/useMockStore';

type Method = 'email' | 'phone' | 'teacher';
type Result = 'sent' | 'no_recovery' | null;

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [method, setMethod] = useState<Method>('email');
  const [identifier, setIdentifier] = useState('');
  const [result, setResult] = useState<Result>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const user = mockStore.findUserByUsername(identifier.trim());
    const hasEmail = user && 'email' in user && !!user.email;
    const hasPhone = user && 'phone' in user && !!user.phone;
    if (user && ((method === 'email' && !hasEmail) || (method === 'phone' && !hasPhone))) {
      setResult('no_recovery');
    } else {
      setResult('sent');
    }
  };

  const reset = () => {
    setResult(null);
    setIdentifier('');
  };

  return (
    <AuthLayout>
      <div className="auth-card__heading">
        <h1 className="auth-card__title">{t('auth.forgotPassword.title')}</h1>
        <p className="auth-card__subtitle">{t('auth.forgotPassword.subtitle')}</p>
      </div>

      <div role="tablist" aria-label={t('auth.forgotPassword.title')} className="segmented-control" style={{ alignSelf: 'center' }}>
        <button type="button" role="tab" aria-selected={method === 'email'} className={`segmented-control__option ${method === 'email' ? 'is-active' : ''}`} onClick={() => { setMethod('email'); reset(); }}>
          <Mail size={13} aria-hidden="true" style={{ marginRight: 4 }} />{t('auth.forgotPassword.byEmail')}
        </button>
        <button type="button" role="tab" aria-selected={method === 'phone'} className={`segmented-control__option ${method === 'phone' ? 'is-active' : ''}`} onClick={() => { setMethod('phone'); reset(); }}>
          <Phone size={13} aria-hidden="true" style={{ marginRight: 4 }} />{t('auth.forgotPassword.byPhone')}
        </button>
        <button type="button" role="tab" aria-selected={method === 'teacher'} className={`segmented-control__option ${method === 'teacher' ? 'is-active' : ''}`} onClick={() => { setMethod('teacher'); reset(); }}>
          <UserCog size={13} aria-hidden="true" style={{ marginRight: 4 }} />{t('auth.forgotPassword.askTeacher')}
        </button>
      </div>

      {method === 'teacher' ? (
        <div className="linked-summary">{t('auth.forgotPassword.askTeacherDescription')}</div>
      ) : result === 'sent' ? (
        <div className="auth-success">
          <CheckCircle2 size={32} color="var(--color-success)" aria-hidden="true" />
          <p>{t('auth.forgotPassword.checkInbox')}</p>
        </div>
      ) : result === 'no_recovery' ? (
        <div className="state-panel" style={{ padding: 'var(--space-4)' }} role="alert">
          <AlertCircle size={28} color="var(--color-warning)" aria-hidden="true" />
          <p className="state-panel__title">{t('auth.forgotPassword.noRecoveryTitle')}</p>
          <p>{t('auth.forgotPassword.noRecoveryDescription')}</p>
        </div>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="recovery-identifier">{t('auth.forgotPassword.identifier')}</label>
            <input
              id="recovery-identifier"
              className="input-control"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <button type="submit" className="btn btn--primary btn--lg btn--block">
            {t('auth.forgotPassword.sendCode')}
          </button>
        </form>
      )}

      <div className="auth-card__footer-links">
        <Link to="/login">{t('auth.forgotPassword.backToLogin')}</Link>
      </div>
    </AuthLayout>
  );
}
