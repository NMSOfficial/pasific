import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusCircle } from 'lucide-react';
import { WRITING_TYPES } from '../../mock/writingTypes';
import { PageHeader } from '../../components/PageHeader';

export function AdminWritingTypesPage() {
  const { t } = useTranslation();
  const [extra, setExtra] = useState<string[]>([]);
  const [draft, setDraft] = useState('');

  return (
    <>
      <PageHeader title={t('nav.admin.writingTypes')} />

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', maxWidth: '24rem' }}>
        <input className="input-control" placeholder={t('admin.writingTypes.namePlaceholder')} value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => { if (draft.trim()) { setExtra((prev) => [...prev, draft.trim()]); setDraft(''); } }}
        >
          <PlusCircle size={16} aria-hidden="true" /> {t('admin.writingTypes.addNew')}
        </button>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>{t('teacher.assignments.writingType')}</th><th>{t('common.status')}</th></tr></thead>
          <tbody>
            {WRITING_TYPES.map((wt) => (
              <tr key={wt.id}><td>{t(wt.labelKey)}</td><td><span className="badge badge--success">{t('assignmentStatus.published')}</span></td></tr>
            ))}
            {extra.map((name) => (
              <tr key={name}><td>{name}</td><td><span className="badge badge--neutral">{t('assignmentStatus.draft')}</span></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
