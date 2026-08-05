import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/AuthContext';
import type { AdminProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { fetchStudents, setAccountStatus, type StudentRow } from '../../services/adminData';

export function AdminStudentsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const admin = user as AdminProfile;
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [query, setQuery] = useState('');

  const reload = useCallback(() => {
    fetchStudents().then(setStudents);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  if (!students) return <LoadingSkeleton height="12rem" />;

  const rows = students.filter((s) => !query.trim() || s.displayName.toLowerCase().includes(query.toLowerCase()) || s.username.toLowerCase().includes(query.toLowerCase()));

  const toggleStatus = async (s: StudentRow) => {
    await setAccountStatus(s.id, s.status === 'active' ? 'suspended' : 'active', { id: admin.id, displayName: admin.displayName });
    reload();
  };

  return (
    <>
      <PageHeader title={t('nav.admin.students')} />

      <input
        className="input-control"
        style={{ maxWidth: '18rem', marginBottom: 'var(--space-4)' }}
        placeholder={t('teacher.classes.searchStudents')}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>{t('common.student')}</th><th>{t('settings.school')}</th><th>{t('common.status')}</th><th><span className="visually-hidden">{t('common.actions')}</span></th></tr></thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td>{s.displayName}<div className="field__hint">@{s.username}</div></td>
                <td>{s.schoolName}</td>
                <td><span className={`badge badge--${s.status === 'active' ? 'success' : 'warning'}`}>{t(`accountStatus.${s.status}`)}</span></td>
                <td>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => toggleStatus(s)}>
                    {s.status === 'active' ? t('admin.users.suspendAccount') : t('admin.users.reactivateAccount')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
