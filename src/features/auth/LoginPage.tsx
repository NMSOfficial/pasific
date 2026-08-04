import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { useAuth } from '../../state/AuthContext';

export function LoginPage() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const result = await login(username, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(t(result.errorKey));
      return;
    }
    const from = (location.state as { from?: Location })?.from;
    navigate(from ? `${from.pathname}${from.search ?? ''}` : '/', { replace: true });
  };

  return (
    <AuthLayout>
      <div className="auth-card__heading">
        <h1 className="auth-card__title">{t('auth.login.title')}</h1>
        <p className="auth-card__subtitle">{t('auth.login.subtitle')}</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label className="field__label" htmlFor="login-username">{t('auth.login.username')}</label>
          <input
            id="login-username"
            className="input-control"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? 'login-error' : undefined}
            required
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="login-password">{t('auth.login.password')}</label>
          <div className="input-with-action">
            <input
              id="login-password"
              className="input-control"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? 'login-error' : undefined}
              required
            />
            <button
              type="button"
              className="input-with-action__action"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')}
            >
              {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {error && (
          <p id="login-error" className="field__error" role="alert">
            <AlertCircle size={14} aria-hidden="true" /> {error}
          </p>
        )}

        <label className="checkbox-row">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          <span>{t('auth.login.rememberMe')}</span>
        </label>

        <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting}>
          {submitting ? t('common.loading') : t('auth.login.submit')}
        </button>
      </form>

      <div className="auth-card__footer-links">
        <Link to="/activate">{t('auth.login.activateAccount')}</Link>
        <Link to="/forgot-password">{t('auth.login.forgotPassword')}</Link>
      </div>
    </AuthLayout>
  );
}
