import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/AuthContext';
import type { TeacherProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { PermissionGuard } from '../../components/PermissionGuard';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { fetchTeachersForSchool, type TeacherRow } from '../../services/adminData';

export function TeamPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const teacher = user as TeacherProfile;
  const [colleagues, setColleagues] = useState<TeacherRow[] | null>(null);

  useEffect(() => {
    if (teacher.schoolIds[0]) fetchTeachersForSchool(teacher.schoolIds[0]).then(setColleagues);
  }, [teacher.schoolIds]);

  if (!colleagues) return <LoadingSkeleton height="12rem" />;

  return (
    <PermissionGuard permission="manage_teachers">
      <PageHeader title={t('nav.teacher.team')} />
      <div className="data-table-wrap desktop-only-block">
        <table className="data-table">
          <thead><tr><th>{t('common.teacher')}</th><th>{t('common.status')}</th><th>{t('teacher.team.permissions')}</th></tr></thead>
          <tbody>
            {colleagues.map((c) => (
              <tr key={c.id}>
                <td>{c.displayName}<div className="field__hint">@{c.username}</div></td>
                <td><span className={`badge badge--${c.status === 'active' ? 'success' : 'warning'}`}>{t(`accountStatus.${c.status}`)}</span></td>
                <td style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {c.permissions.map((p) => <span key={p} className="badge badge--neutral">{p}</span>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mobile-student-list">
        {colleagues.map((c) => (
          <div key={c.id} className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'var(--weight-medium)' }}>{c.displayName}</span>
              <span className={`badge badge--${c.status === 'active' ? 'success' : 'warning'}`}>{t(`accountStatus.${c.status}`)}</span>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {c.permissions.map((p) => <span key={p} className="badge badge--neutral">{p}</span>)}
            </div>
          </div>
        ))}
      </div>
    </PermissionGuard>
  );
}
