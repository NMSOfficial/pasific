import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { useMockState } from '../../mock/useMockStore';
import { getAssignmentsForClass, getSchool } from '../../mock/selectors';
import type { TeacherProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';

export function ClassListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const state = useMockState();
  const teacher = user as TeacherProfile;

  const classes = teacher.classIds.map((id) => state.classes.find((c) => c.id === id)).filter(Boolean);

  return (
    <>
      <PageHeader title={t('nav.teacher.classes')} />
      {classes.length === 0 ? (
        <EmptyState title={t('states.empty.generic')} />
      ) : (
        <div className="card-grid">
          {classes.map((cls) => {
            const school = getSchool(state, cls!.schoolId);
            const activeAssignments = getAssignmentsForClass(state, cls!.id).filter((a) => a.status === 'published').length;
            return (
              <Link key={cls!.id} to={`/teacher/classes/${cls!.id}`} className="card card--padded card--interactive" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <p style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)' }}>{cls!.name}</p>
                <p className="field__hint">{school?.name} · {cls!.gradeLabel}</p>
                <div className="assignment-card__meta">
                  <span>{t('teacher.classes.studentCount', { count: cls!.studentIds.length })}</span>
                  <span>{t('teacher.dashboard.activeAssignmentsWeek', { count: activeAssignments })}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
