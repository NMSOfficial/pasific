import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import type { TeacherProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { useHasPermission } from '../../components/PermissionGuard';
import { fetchTeacherClasses, createClassForTeacher, type ClassMeta } from '../../services/teacherData';
import { fetchSchools, type SchoolSummary } from '../../services/adminData';
import { fetchAssignmentsForTeacher } from '../../services/assignmentData';

export function ClassListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const teacher = user as TeacherProfile;
  const canManageClasses = useHasPermission('manage_classes');
  const [classes, setClasses] = useState<ClassMeta[] | null>(null);
  const [schools, setSchools] = useState<SchoolSummary[]>([]);
  const [activeCountByClass, setActiveCountByClass] = useState<Map<string, number>>(new Map());

  const [creating, setCreating] = useState(false);
  const [schoolId, setSchoolId] = useState('');
  const [className, setClassName] = useState('');
  const [gradeLabel, setGradeLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    fetchTeacherClasses(teacher.id).then(setClasses);
    fetchAssignmentsForTeacher(teacher.id).then((assignments) => {
      const map = new Map<string, number>();
      for (const a of assignments) {
        if (a.status !== 'published') continue;
        for (const cid of a.classIds) map.set(cid, (map.get(cid) ?? 0) + 1);
      }
      setActiveCountByClass(map);
    });
  }, [teacher.id]);

  useEffect(() => {
    reload();
    fetchSchools().then((list) => {
      const teacherSchools = list.filter((s) => teacher.schoolIds.includes(s.id));
      setSchools(teacherSchools);
      setSchoolId((prev) => prev || teacherSchools[0]?.id || '');
    });
  }, [reload, teacher.schoolIds]);

  if (!classes) return <LoadingSkeleton height="12rem" />;

  const handleCreate = async () => {
    if (!className.trim() || !schoolId) return;
    setSaving(true);
    await createClassForTeacher({ schoolId, name: className.trim(), gradeLabel: gradeLabel.trim() });
    setSaving(false);
    setClassName('');
    setGradeLabel('');
    setCreating(false);
    reload();
  };

  return (
    <>
      <PageHeader
        title={t('nav.teacher.classes')}
        actions={canManageClasses ? (
          <button type="button" className="btn btn--primary" onClick={() => setCreating((v) => !v)}>
            <PlusCircle size={16} aria-hidden="true" /> {t('admin.schools.createClass')}
          </button>
        ) : undefined}
      />

      {creating && (
        <div className="card card--padded" style={{ marginBottom: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {schools.length > 1 && (
            <div className="field" style={{ flex: 1, minWidth: '10rem' }}>
              <label className="field__label" htmlFor="new-class-school">{t('settings.school')}</label>
              <select id="new-class-school" className="select-control" value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div className="field" style={{ flex: 1, minWidth: '10rem' }}>
            <label className="field__label" htmlFor="new-class-name">{t('admin.schools.className')}</label>
            <input id="new-class-name" className="input-control" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="10-A" />
          </div>
          <div className="field" style={{ flex: 1, minWidth: '10rem' }}>
            <label className="field__label" htmlFor="new-class-grade">{t('admin.schools.gradeLabel')}</label>
            <input id="new-class-grade" className="input-control" value={gradeLabel} onChange={(e) => setGradeLabel(e.target.value)} placeholder="10. Sınıf" />
          </div>
          <button type="button" className="btn btn--primary" onClick={handleCreate} disabled={!className.trim() || saving}>{t('common.save')}</button>
        </div>
      )}

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
