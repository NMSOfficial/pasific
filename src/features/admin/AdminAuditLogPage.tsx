import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMockState } from '../../mock/useMockStore';
import type { AuditEvent } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { AuditTimeline } from '../../components/AuditTimeline';
import { EmptyState } from '../../components/EmptyState';

const TYPES: AuditEvent['type'][] = [
  'score_override', 'password_reset', 'account_suspended', 'account_reactivated',
  'catalog_hidden', 'catalog_restored', 'activation_code_created', 'activation_code_revoked',
  'teacher_permission_changed',
];

export function AdminAuditLogPage() {
  const { t } = useTranslation();
  const state = useMockState();
  const [type, setType] = useState<AuditEvent['type'] | 'all'>('all');

  const events = state.auditEvents
    .filter((e) => type === 'all' || e.type === type)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <>
      <PageHeader title={t('nav.admin.auditLog')} />

      <select className="select-control" style={{ width: 'auto', marginBottom: 'var(--space-5)' }} value={type} onChange={(e) => setType(e.target.value as AuditEvent['type'] | 'all')}>
        <option value="all">{t('admin.auditLog.allTypes')}</option>
        {TYPES.map((ty) => <option key={ty} value={ty}>{ty}</option>)}
      </select>

      {events.length === 0 ? (
        <EmptyState title={t('states.empty.generic')} />
      ) : (
        <AuditTimeline events={events.map((e) => ({ id: e.id, label: `${e.actorName} — ${e.targetLabel}`, detail: e.detail, timestamp: e.timestamp }))} />
      )}
    </>
  );
}
