import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/AuthContext';
import { useMockState, mockStore } from '../../mock/useMockStore';
import { getSchool } from '../../mock/selectors';
import type { AdminProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';

export function AdminStudentsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const state = useMockState();
  const admin = user as AdminProfile;
  const [query, setQuery] = useState('');

  const rows = state.students.filter((s) => !query.trim() || s.displayName.toLowerCase().includes(query.toLowerCase()) || s.username.includes(query.toLowerCase()));

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
            {rows.map((s) => {
              const school = getSchool(state, s.schoolId);
              return (
                <tr key={s.id}>
                  <td>{s.displayName}<div className="field__hint">@{s.username}</div></td>
                  <td>{school?.name}</td>
                  <td><span className={`badge badge--${s.status === 'active' ? 'success' : 'warning'}`}>{t(`accountStatus.${s.status}`)}</span></td>
                  <td>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => mockStore.setAccountStatus(s.id, s.status === 'active' ? 'suspended' : 'active', admin.id, admin.displayName)}
                    >
                      {s.status === 'active' ? t('admin.users.suspendAccount') : t('admin.users.reactivateAccount')}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
