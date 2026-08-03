import { useTranslation } from 'react-i18next';
import { useTheme, type ThemePreference } from '../state/ThemeContext';

const OPTIONS: ThemePreference[] = ['light', 'dark', 'system'];

export function ThemeSelector({ compact = false }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme();
  const { t } = useTranslation();

  if (compact) {
    return (
      <label className="field-inline">
        <span className="visually-hidden">{t('theme.label')}</span>
        <select
          value={preference}
          onChange={(e) => setPreference(e.target.value as ThemePreference)}
          className="select-control"
          aria-label={t('theme.label')}
        >
          {OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {t(`theme.${opt}`)}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div role="group" aria-label={t('theme.label')} className="segmented-control">
      {OPTIONS.map((opt) => (
        <button
          key={opt}
          type="button"
          className={`segmented-control__option ${preference === opt ? 'is-active' : ''}`}
          aria-pressed={preference === opt}
          onClick={() => setPreference(opt)}
        >
          {t(`theme.${opt}`)}
        </button>
      ))}
    </div>
  );
}
