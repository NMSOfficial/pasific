import { useTranslation } from 'react-i18next';
import { History } from 'lucide-react';
import { formatDateTime } from '../utils/format';

export interface AuditTimelineEvent {
  id: string;
  label: string;
  detail?: string;
  timestamp: string;
}

export function AuditTimeline({ events }: { events: AuditTimelineEvent[] }) {
  const { i18n } = useTranslation();
  return (
    <ol style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {events.map((e) => (
        <li key={e.id} className="card card--padded" style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <History size={16} color="var(--color-text-faint)" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <div>
            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>{e.label}</p>
            {e.detail && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{e.detail}</p>}
            <p className="field__hint">{formatDateTime(e.timestamp, i18n.resolvedLanguage ?? 'tr')}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
