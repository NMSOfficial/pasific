import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ title, description, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <div className="state-panel" role="alert">
      <div className="state-panel__icon">
        <AlertTriangle size={36} strokeWidth={1.5} aria-hidden="true" />
      </div>
      <p className="state-panel__title">{title ?? t('states.error.generic')}</p>
      {description && <p>{description}</p>}
      {onRetry && (
        <button type="button" className="btn btn--secondary" onClick={onRetry}>
          {t('states.error.retry')}
        </button>
      )}
    </div>
  );
}
