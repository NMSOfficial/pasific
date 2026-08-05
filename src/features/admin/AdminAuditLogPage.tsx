import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AuditEvent } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { AuditTimeline } from '../../components/AuditTimeline';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { fetchAuditEvents, type AuditEventRow } from '../../services/contentData';

const TYPES: AuditEvent['type'][] = [
  'score_override', 'password_reset', 'account_suspended', 'account_reactivated',
  'catalog_hidden', 'catalog_restored', 'activation_code_created', 'activation_code_revoked',
  'teacher_permission_changed',
];

export function AdminAuditLogPage() {
  const { t } = useTranslation();
  const [events, setEvents] = useState<AuditEventRow[] | null>(null);
  const [type, setType] = useState<AuditEvent['type'] | 'all'>('all');

  useEffect(() => { fetchAuditEvents().then(setEvents); }, []);

  if (!events) return <LoadingSkeleton height="12rem" />;

  const filtered = events.filter((e) => type === 'all' || e.type === type);

  return (
    <>
      <PageHeader title={t('nav.admin.auditLog')} />

      <select className="select-control" style={{ width: 'auto', marginBottom: 'var(--space-5)' }} value={type} onChange={(e) => setType(e.target.value as AuditEvent['type'] | 'all')}>
        <option value="all">{t('admin.auditLog.allTypes')}</option>
        {TYPES.map((ty) => <option key={ty} value={ty}>{ty}</option>)}
      </select>

      {filtered.length === 0 ? (
        <EmptyState title={t('states.empty.generic')} />
      ) : (
        <AuditTimeline events={filtered.map((e) => ({ id: e.id, label: `${e.actorName} — ${e.targetLabel}`, detail: e.detail, timestamp: e.timestamp }))} />
      )}
    </>
  );
}
