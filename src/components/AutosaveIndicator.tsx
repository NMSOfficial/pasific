import { useTranslation } from 'react-i18next';
import { Check, CloudOff, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import type { AutosaveStatus } from '../utils/useAutosave';

const META: Record<AutosaveStatus, { key: string; tone: string }> = {
  idle: { key: 'editor.autosave.saved', tone: 'neutral' },
  saving: { key: 'editor.autosave.saving', tone: 'info' },
  saved: { key: 'editor.autosave.saved', tone: 'success' },
  offline: { key: 'editor.autosave.offline', tone: 'warning' },
  retrying: { key: 'editor.autosave.retrying', tone: 'warning' },
  error: { key: 'editor.autosave.failed', tone: 'error' },
};

export function AutosaveIndicator({ status }: { status: AutosaveStatus }) {
  const { t } = useTranslation();
  const meta = META[status];
  const Icon = status === 'saving' ? Loader2 : status === 'saved' || status === 'idle' ? Check : status === 'offline' ? CloudOff : status === 'retrying' ? RefreshCw : AlertTriangle;
  return (
    <span className={`badge badge--${meta.tone}`} role="status" aria-live="polite">
      <Icon size={12} className={status === 'saving' || status === 'retrying' ? 'spin' : undefined} aria-hidden="true" />
      {t(meta.key)}
    </span>
  );
}
