import { ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function PermissionDenied() {
  const { t } = useTranslation();
  return (
    <div className="state-panel" role="alert">
      <div className="state-panel__icon">
        <ShieldAlert size={36} strokeWidth={1.5} aria-hidden="true" />
      </div>
      <h1 className="state-panel__title">{t('permission.denied.title')}</h1>
      <p>{t('permission.denied.description')}</p>
    </div>
  );
}
