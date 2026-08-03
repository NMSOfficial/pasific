import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { useMockState, mockStore } from '../../mock/useMockStore';
import { getClassesForSchool } from '../../mock/selectors';
import type { AdminProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { formatDate } from '../../utils/format';

export function AdminSchoolDetailPage() {
  const { t, i18n } = useTranslation();
  const { schoolId } = useParams();
  const { user } = useAuth();
  const state = useMockState();
  const admin = user as AdminProfile;
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  const school = schoolId ? state.schools.find((s) => s.id === schoolId) : undefined;
  if (!school) return <Navigate to="/admin/schools" replace />;

  const classes = getClassesForSchool(state, school.id);
  const teachers = state.teachers.filter((t2) => t2.schoolIds.includes(school.id));
  const students = state.students.filter((s) => s.schoolId === school.id);

  const toggleStatus = () => {
    mockStore.setSchoolStatus(school.id, school.status === 'active' ? 'suspended' : 'active', admin.id, admin.displayName);
    setConfirmSuspend(false);
  };

  return (
    <>
      <PageHeader
        title={school.name}
        subtitle={`${school.city} · ${t(`accountStatus.${school.status === 'active' ? 'active' : 'suspended'}`)}`}
        actions={
          <button type="button" className={`btn ${school.status === 'active' ? 'btn--danger' : 'btn--primary'}`} onClick={() => (school.status === 'active' ? setConfirmSuspend(true) : toggleStatus())}>
            {school.status === 'active' ? t('admin.schools.suspend') : t('admin.schools.reactivate')}
          </button>
        }
      />

      <div className="stat-row" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="stat-tile"><span className="stat-tile__value">{teachers.length}</span><span className="stat-tile__label">{t('admin.schools.teachers')}</span></div>
        <div className="stat-tile"><span className="stat-tile__value">{students.length}</span><span className="stat-tile__label">{t('admin.schools.students')}</span></div>
        <div className="stat-tile"><span className="stat-tile__value">{classes.length}</span><span className="stat-tile__label">{t('admin.schools.classes')}</span></div>
        <div className="stat-tile"><span className="stat-tile__value">{school.activeAssignmentCount}</span><span className="stat-tile__label">{t('admin.dashboard.activeAssignments')}</span></div>
      </div>

      <section className="section-block">
        <div className="section-block__title"><h2>{t('admin.schools.classes')}</h2></div>
        <div className="card-grid">
          {classes.map((c) => (
            <div key={c.id} className="card card--padded">
              <p style={{ fontWeight: 'var(--weight-medium)' }}>{c.name}</p>
              <p className="field__hint">{c.gradeLabel} · {c.studentIds.length} {t('common.student').toLowerCase()}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-block__title"><h2>{t('admin.schools.teachers')}</h2></div>
        <div className="card-grid">
          {teachers.map((tch) => (
            <div key={tch.id} className="card card--padded">
              <p style={{ fontWeight: 'var(--weight-medium)' }}>{tch.displayName}</p>
              <p className="field__hint">@{tch.username} · {formatDate(tch.lastLoginAt, i18n.resolvedLanguage ?? 'tr')}</p>
            </div>
          ))}
        </div>
      </section>

      <ConfirmationDialog
        open={confirmSuspend}
        title={t('admin.schools.suspendConfirmTitle')}
        description={t('admin.schools.suspendConfirmDescription')}
        destructive
        onConfirm={toggleStatus}
        onCancel={() => setConfirmSuspend(false)}
      />
    </>
  );
}
