import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { formatDate } from '../../utils/format';
import { fetchDashboardStats, type DashboardStats } from '../../services/adminData';

export function AdminDashboardPage() {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetchDashboardStats().then(setStats);
  }, []);

  if (!stats) return <LoadingSkeleton height="12rem" />;

  return (
    <>
      <PageHeader title={t('nav.admin.dashboard')} />

      <div className="stat-row" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="stat-tile"><span className="stat-tile__value">{stats.schoolCount}</span><span className="stat-tile__label">{t('admin.dashboard.totalSchools')}</span></div>
        <div className="stat-tile"><span className="stat-tile__value">{stats.teacherCount}</span><span className="stat-tile__label">{t('admin.dashboard.totalTeachers')}</span></div>
        <div className="stat-tile"><span className="stat-tile__value">{stats.studentCount}</span><span className="stat-tile__label">{t('admin.dashboard.totalStudents')}</span></div>
        <div className="stat-tile"><span className="stat-tile__value">{stats.activeAssignmentCount}</span><span className="stat-tile__label">{t('admin.dashboard.activeAssignments')}</span></div>
      </div>

      <section className="section-block">
        <div className="section-block__title">
          <h2>{t('admin.dashboard.recentSchools')}</h2>
          <Link to="/admin/schools" className="btn btn--ghost btn--sm">{t('common.viewAll')}</Link>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>{t('admin.schools.name')}</th><th>{t('common.status')}</th><th>{t('admin.schools.teachers')}</th><th>{t('admin.schools.students')}</th><th><span className="visually-hidden">{t('common.actions')}</span></th></tr></thead>
            <tbody>
              {stats.recentSchools.map((school) => (
                <tr key={school.id}>
                  <td>{school.name}<div className="field__hint">{school.city} · {formatDate(school.createdAt, i18n.resolvedLanguage ?? 'tr')}</div></td>
                  <td><span className={`badge badge--${school.status === 'active' ? 'success' : 'error'}`}>{t(`accountStatus.${school.status === 'active' ? 'active' : 'suspended'}`)}</span></td>
                  <td>{school.teacherCount}</td>
                  <td>{school.studentCount}</td>
                  <td><Link to={`/admin/schools/${school.id}`} className="btn btn--ghost btn--sm">{t('admin.schools.openSchool')}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
