import { useTranslation } from 'react-i18next';

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function WordCounter({ count, min, max }: { count: number; min: number; max: number }) {
  const { t } = useTranslation();
  const tone = count === 0 ? 'neutral' : count < min ? 'warning' : count > max ? 'warning' : 'success';
  return (
    <span className={`badge badge--${tone}`} aria-live="polite">
      {count} / {min}–{max} {t('common.words')}
    </span>
  );
}
