import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../state/ThemeContext';

export function ThemeSelector({ compact = false }: { compact?: boolean }) {
  const { resolvedTheme, setPreference } = useTheme();
  const { t } = useTranslation();
  const dark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={`${t('theme.label')}: ${dark ? t('theme.dark') : t('theme.light')}`}
      title={`${t('theme.label')}: ${dark ? t('theme.dark') : t('theme.light')}`}
      className={`theme-switch ${dark ? 'is-dark' : 'is-light'} ${compact ? 'theme-switch--compact' : ''}`}
      onClick={() => setPreference(dark ? 'light' : 'dark')}
    >
      <Sun size={compact ? 14 : 16} aria-hidden="true" />
      <span className="theme-switch__track" aria-hidden="true">
        <span className="theme-switch__thumb" />
      </span>
      <Moon size={compact ? 14 : 16} aria-hidden="true" />
    </button>
  );
}
