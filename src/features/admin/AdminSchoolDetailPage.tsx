import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import type { AdminProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { formatDate } from '../../utils/format';
import {
  fetchSchool, fetchClassesForSchool, fetchTeachersForSchool, fetchStudentsForSchool, setSchoolStatus, createClass,
  type SchoolSummary, type ClassRow, type TeacherRow, type StudentRow,
} from '../../services/adminData';

export function AdminSchoolDetailPage() {
  const { t, i18n } = useTranslation();
  const { schoolId } = useParams();
  const { user } = useAuth();
  const admin = user as AdminProfile;
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [creatingClass, setCreatingClass] = useState(false);
  const [className, setClassName] = useState('');
  const [gradeLabel, setGradeLabel] = useState('');
  const [savingClass, setSavingClass] = useState(false);

  const [school, setSchool] = useState<SchoolSummary | null | undefined>(undefined);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);

  const reload = useCallback(() => {
    if (!schoolId) return;
    fetchSchool(schoolId).then(setSchool);
    fetchClassesForSchool(schoolId).then(setClasses);
    fetchTeachersForSchool(schoolId).then(setTeachers);
    fetchStudentsForSchool(schoolId).then(setStudents);
  }, [schoolId]);

  useEffect(() => { reload(); }, [reload]);

  if (school === null) return <Navigate to="/admin/schools" replace />;
  if (school === undefined) return <LoadingSkeleton height="12rem" />;

  const toggleStatus = async () => {
    await setSchoolStatus(school.id, school.status === 'active' ? 'suspended' : 'active', { id: admin.id, displayName: admin.displayName });
    setConfirmSuspend(false);
    reload();
  };

  const handleCreateClass = async () => {
    if (!className.trim()) return;
    setSavingClass(true);
    await createClass({ schoolId: school.id, name: className.trim(), gradeLabel: gradeLabel.trim() });
    setSavingClass(false);
    setClassName('');
    setGradeLabel('');
    setCreatingClass(false);
    reload();
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
        <div className="section-block__title">
          <h2>{t('admin.schools.classes')}</h2>
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => setCreatingClass((v) => !v)}>
            <PlusCircle size={16} aria-hidden="true" /> {t('admin.schools.createClass')}
          </button>
        </div>

        {creatingClass && (
          <div className="card card--padded" style={{ marginBottom: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: 1, minWidth: '10rem' }}>
              <label className="field__label" htmlFor="class-name">{t('admin.schools.className')}</label>
              <input id="class-name" className="input-control" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="10-A" />
            </div>
            <div className="field" style={{ flex: 1, minWidth: '10rem' }}>
              <label className="field__label" htmlFor="class-grade">{t('admin.schools.gradeLabel')}</label>
              <input id="class-grade" className="input-control" value={gradeLabel} onChange={(e) => setGradeLabel(e.target.value)} placeholder="10. Sınıf" />
            </div>
            <button type="button" className="btn btn--primary" onClick={handleCreateClass} disabled={!className.trim() || savingClass}>{t('common.save')}</button>
          </div>
        )}

        <div className="card-grid">
          {classes.map((c) => (
            <div key={c.id} className="card card--padded">
              <p style={{ fontWeight: 'var(--weight-medium)' }}>{c.name}</p>
              <p className="field__hint">{c.gradeLabel} · {c.studentCount} {t('common.student').toLowerCase()}</p>
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
              <p className="field__hint">@{tch.username} · {formatDate(tch.lastLoginAt ?? undefined, i18n.resolvedLanguage ?? 'tr')}</p>
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
