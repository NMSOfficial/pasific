import { useTranslation } from 'react-i18next';
import { WRITING_TYPES } from '../../mock/writingTypes';
import { PageHeader } from '../../components/PageHeader';

/**
 * Read-only. Writing types are a fixed set of standard ELT/CEFR genres
 * (opinion essay, formal email, report, ...) — not something a school adds
 * to, so there's no "create new type" form here (there used to be one, but
 * it only wrote to local state and never persisted or connected to
 * anything, so a new "type" would vanish on refresh and never actually be
 * usable anywhere else in the app).
 */
export function AdminWritingTypesPage() {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader title={t('nav.admin.writingTypes')} />

      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>{t('teacher.assignments.writingType')}</th><th>{t('common.status')}</th></tr></thead>
          <tbody>
            {WRITING_TYPES.map((wt) => (
              <tr key={wt.id}><td>{t(wt.labelKey)}</td><td><span className="badge badge--success">{t('assignmentStatus.published')}</span></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
