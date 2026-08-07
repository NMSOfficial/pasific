import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { useAuth } from '../../state/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { usernameToAuthEmail } from '../../utils/authEmail';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+\d][\d\s]{6,}$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

type Step = 1 | 2 | 3;

interface ValidatedCode {
  code: string;
  role: 'student' | 'teacher';
  schoolName: string | null;
  className: string | null;
}

export function ActivatePage() {
  const { t, i18n } = useTranslation();
  const { refreshUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>(1);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validatedCode, setValidatedCode] = useState<ValidatedCode | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const fullNameLabel = i18n.resolvedLanguage?.startsWith('tr') ? 'Ad Soyad' : 'Full name';

  const handleValidateCode = async (e: FormEvent) => {
    e.preventDefault();
    setCodeError(null);
    setValidating(true);
    const { data, error } = await supabase.rpc('validate_activation_code', { p_code: code.trim() });
    setValidating(false);

    const result = error ? null : data?.[0];
    if (!result || result.code_status === 'not_found') {
      setCodeError(t('auth.activate.codeInvalid'));
      return;
    }
    if (result.code_status === 'expired') {
      setCodeError(t('auth.activate.codeExpired'));
      return;
    }
    if (result.code_status === 'used') {
      setCodeError(t('auth.activate.codeUsed'));
      return;
    }
    if (result.code_status === 'revoked') {
      setCodeError(t('auth.activate.codeRevoked'));
      return;
    }
    setValidatedCode({ code: code.trim(), role: result.code_role, schoolName: result.school_name, className: result.class_name });
    setStep(2);
  };

  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (!validatedCode) return;
    const errors: Record<string, string> = {};

    const trimmedDisplayName = displayName.trim().replace(/\s+/g, ' ');
    const trimmedUsername = username.trim();
    if (trimmedDisplayName.length < 2) errors.displayName = t('common.required');
    if (!trimmedUsername) errors.username = t('common.required');

    if (!PASSWORD_RE.test(password)) errors.password = t('auth.activate.passwordWeak');
    if (password !== confirmPassword) errors.confirmPassword = t('auth.activate.passwordMismatch');

    if (email.trim() && !EMAIL_RE.test(email.trim())) errors.email = t('auth.activate.emailInvalid');
    if (phone.trim() && !PHONE_RE.test(phone.trim())) errors.phone = t('auth.activate.phoneInvalid');

    if (!termsAccepted) errors.terms = t('auth.activate.termsRequired');

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);

    const { data: taken } = await supabase.rpc('is_username_taken', { p_username: trimmedUsername });
    if (taken) {
      setSubmitting(false);
      setFieldErrors({ username: t('auth.activate.usernameTaken') });
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: usernameToAuthEmail(trimmedUsername),
      password,
    });
    if (signUpError) {
      setSubmitting(false);
      setFieldErrors({ username: signUpError.message });
      return;
    }

    const { error: claimError } = await supabase.rpc('claim_activation_code', {
      p_code: validatedCode.code,
      p_username: trimmedUsername,
      p_display_name: trimmedDisplayName,
      p_email: email.trim(),
      p_phone: phone.trim(),
    });
    setSubmitting(false);
    if (claimError) {
      setFieldErrors({ username: claimError.message });
      return;
    }

    await refreshUser();
    setStep(3);
    const homePath = validatedCode.role === 'teacher' ? '/teacher/dashboard' : '/student/home';
    window.setTimeout(() => navigate(homePath, { replace: true }), 1600);
  };

  return (
    <AuthLayout wide={step === 2}>
      <div className="auth-stepper" aria-hidden="true">
        {[1, 2, 3].map((n, i) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span className={`auth-stepper__dot ${step === n ? 'is-active' : ''} ${step > n ? 'is-done' : ''}`}>
              {step > n ? <CheckCircle2 size={13} /> : n}
            </span>
            {i < 2 && <span className="auth-stepper__line" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <>
          <div className="auth-card__heading">
            <h1 className="auth-card__title">{t('auth.activate.step1Title')}</h1>
            <p className="auth-card__subtitle">{t('auth.activate.step1Description')}</p>
          </div>
          <form className="auth-form" onSubmit={handleValidateCode} noValidate>
            <div className="field">
              <label className="field__label" htmlFor="activation-code">{t('auth.activate.code')}</label>
              <input
                id="activation-code"
                className="input-control"
                style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t('auth.activate.codePlaceholder')}
                aria-invalid={!!codeError}
                aria-describedby={codeError ? 'code-error' : undefined}
                required
              />
            </div>
            {codeError && (
              <p id="code-error" className="field__error" role="alert">
                <AlertCircle size={14} aria-hidden="true" /> {codeError}
              </p>
            )}
            <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={validating}>
              {validating ? t('common.loading') : t('auth.activate.validateCode')}
            </button>
          </form>
          <div className="auth-card__footer-links">
            <Link to="/login">{t('auth.forgotPassword.backToLogin')}</Link>
          </div>
        </>
      )}

      {step === 2 && validatedCode && (
        <>
          <div className="auth-card__heading">
            <h1 className="auth-card__title">{t('auth.activate.step2Title')}</h1>
          </div>
          <div className="linked-summary">
            {t('auth.activate.linkedTo')} <strong>{validatedCode.schoolName}</strong>{validatedCode.className ? ` — ${validatedCode.className}` : ''}
          </div>
          <form className="auth-form" onSubmit={handleCreateAccount} noValidate>
            <div className="field">
              <label className="field__label" htmlFor="display-name">{fullNameLabel}</label>
              <input
                id="display-name"
                className={`input-control ${fieldErrors.displayName ? 'has-error' : ''}`}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="name"
                aria-invalid={!!fieldErrors.displayName}
                aria-describedby={fieldErrors.displayName ? 'display-name-error' : undefined}
                required
              />
              {fieldErrors.displayName && <p id="display-name-error" className="field__error" role="alert"><AlertCircle size={14} aria-hidden="true" />{fieldErrors.displayName}</p>}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="new-username">{t('auth.activate.chooseUsername')}</label>
              <input
                id="new-username"
                className={`input-control ${fieldErrors.username ? 'has-error' : ''}`}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                aria-invalid={!!fieldErrors.username}
                aria-describedby={fieldErrors.username ? 'username-error' : undefined}
                required
              />
              {fieldErrors.username && <p id="username-error" className="field__error" role="alert"><AlertCircle size={14} aria-hidden="true" />{fieldErrors.username}</p>}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="new-password">{t('auth.activate.choosePassword')}</label>
              <div className="input-with-action">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`input-control ${fieldErrors.password ? 'has-error' : ''}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? 'password-error' : 'password-hint'}
                  required
                />
                <button type="button" className="input-with-action__action" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? t('auth.login.hidePassword') : t('auth.login.showPassword')}>
                  {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                </button>
              </div>
              {fieldErrors.password
                ? <p id="password-error" className="field__error" role="alert"><AlertCircle size={14} aria-hidden="true" />{fieldErrors.password}</p>
                : <p id="password-hint" className="field__hint">{t('auth.activate.passwordWeak')}</p>}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="confirm-password">{t('auth.activate.confirmPassword')}</label>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                className={`input-control ${fieldErrors.confirmPassword ? 'has-error' : ''}`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                aria-invalid={!!fieldErrors.confirmPassword}
                aria-describedby={fieldErrors.confirmPassword ? 'confirm-password-error' : undefined}
                required
              />
              {fieldErrors.confirmPassword && <p id="confirm-password-error" className="field__error" role="alert"><AlertCircle size={14} aria-hidden="true" />{fieldErrors.confirmPassword}</p>}
            </div>

            <fieldset style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
              <legend style={{ padding: '0 var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>
                {t('auth.activate.recoveryTitle')}
              </legend>
              <p className="field__hint" style={{ marginTop: '-0.5rem' }}>{t('auth.activate.recoveryDescription')}</p>

              <div className="field">
                <label className="field__label" htmlFor="recovery-email">{t('auth.activate.email')} <span className="field__hint">({t('common.optional')})</span></label>
                <input
                  id="recovery-email"
                  type="email"
                  className={`input-control ${fieldErrors.email ? 'has-error' : ''}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                />
                {fieldErrors.email && <p id="email-error" className="field__error" role="alert"><AlertCircle size={14} aria-hidden="true" />{fieldErrors.email}</p>}
              </div>

              <div className="field">
                <label className="field__label" htmlFor="recovery-phone">{t('auth.activate.phone')} <span className="field__hint">({t('common.optional')})</span></label>
                <input
                  id="recovery-phone"
                  type="tel"
                  className={`input-control ${fieldErrors.phone ? 'has-error' : ''}`}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  aria-invalid={!!fieldErrors.phone}
                  aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
                />
                {fieldErrors.phone && <p id="phone-error" className="field__error" role="alert"><AlertCircle size={14} aria-hidden="true" />{fieldErrors.phone}</p>}
              </div>
            </fieldset>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                aria-invalid={!!fieldErrors.terms}
                aria-describedby={fieldErrors.terms ? 'terms-error' : undefined}
              />
              <span>{t('auth.activate.termsLabel')}</span>
            </label>
            {fieldErrors.terms && <p id="terms-error" className="field__error" role="alert"><AlertCircle size={14} aria-hidden="true" />{fieldErrors.terms}</p>}

            <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting}>
              {submitting ? t('common.loading') : t('auth.activate.activate')}
            </button>
          </form>
        </>
      )}

      {step === 3 && (
        <div className="auth-success">
          <CheckCircle2 size={40} color="var(--color-success)" aria-hidden="true" />
          <h1 className="auth-card__title">{t('auth.activate.successTitle')}</h1>
          <p className="auth-card__subtitle">{t('auth.activate.successDescription')}</p>
        </div>
      )}
    </AuthLayout>
  );
}
