import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import type { TeacherProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { fetchTeacherClasses, type ClassMeta } from '../../services/teacherData';
import { fetchSchools, type SchoolSummary } from '../../services/adminData';
import { fetchAssignmentsForTeacher } from '../../services/assignmentData';

export function ClassListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const teacher = user as TeacherProfile;
  const [classes, setClasses] = useState<ClassMeta[] | null>(null);
  const [schools, setSchools] = useState<SchoolSummary[]>([]);
  const [activeCountByClass, setActiveCountByClass] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    fetchTeacherClasses(teacher.id).then(setClasses);
    fetchSchools().then(setSchools);
    fetchAssignmentsForTeacher(teacher.id).then((assignments) => {
      const map = new Map<string, number>();
      for (const a of assignments) {
        if (a.status !== 'published') continue;
        for (const cid of a.classIds) map.set(cid, (map.get(cid) ?? 0) + 1);
      }
      setActiveCountByClass(map);
    });
  }, [teacher.id]);

  if (!classes) return <LoadingSkeleton height="12rem" />;

  return (
    <>
      <PageHeader title={t('nav.teacher.classes')} />
      {classes.length === 0 ? (
        <EmptyState title={t('states.empty.generic')} />
      ) : (
        <div className="card-grid">
          {classes.map((cls) => {
            const school = schools.find((s) => s.id === cls.schoolId);
            const activeAssignments = activeCountByClass.get(cls.id) ?? 0;
            return (
              <Link key={cls.id} to={`/teacher/classes/${cls.id}`} className="card card--padded card--interactive" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <p style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)' }}>{cls.name}</p>
                <p className="field__hint">{school?.name} · {cls.gradeLabel}</p>
                <div className="assignment-card__meta">
                  <span>{t('teacher.classes.studentCount', { count: cls.studentIds.length })}</span>
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
