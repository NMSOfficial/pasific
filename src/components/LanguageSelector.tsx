import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n';

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { t, i18n } = useTranslation();
  const current = (i18n.resolvedLanguage ?? 'tr') as SupportedLanguage;

  if (compact) {
    return (
      <label className="field-inline">
        <span className="visually-hidden">{t('language.label')}</span>
        <select
          value={current}
          onChange={(e) => i18n.changeLanguage(e.target.value)}
          className="select-control"
          aria-label={t('language.label')}
        >
          {SUPPORTED_LANGUAGES.map((lng) => (
            <option key={lng} value={lng}>
              {t(`language.${lng}`)}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div role="group" aria-label={t('language.label')} className="segmented-control">
      {SUPPORTED_LANGUAGES.map((lng) => (
        <button
          key={lng}
          type="button"
          className={`segmented-control__option ${current === lng ? 'is-active' : ''}`}
          aria-pressed={current === lng}
          onClick={() => i18n.changeLanguage(lng)}
        >
          {t(`language.${lng}`)}
        </button>
      ))}
    </div>
  );
}
