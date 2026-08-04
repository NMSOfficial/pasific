import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/AuthContext';
import type { Assignment, TeacherProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { PdfExportButton } from '../../components/PdfExportButton';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { exportClassReportPdf } from '../../utils/pdf';
import { fetchTeacherClasses, fetchStudentsByIds, type ClassMeta } from '../../services/teacherData';
import { fetchAssignmentsForTeacher } from '../../services/assignmentData';
import { fetchSubmissionsForAssignment } from '../../services/submissionData';
import { fetchSchool, type SchoolSummary } from '../../services/adminData';

export function TeacherReportsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const teacher = user as TeacherProfile;

  const [classes, setClasses] = useState<ClassMeta[] | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classId, setClassId] = useState('');
  const [assignmentId, setAssignmentId] = useState('');
  const [school, setSchool] = useState<SchoolSummary | null>(null);
  const [rows, setRows] = useState<{ studentName: string; status: string; score: number | undefined }[]>([]);

  useEffect(() => {
    fetchTeacherClasses(teacher.id).then((list) => {
      setClasses(list);
      setClassId((prev) => prev || list[0]?.id || '');
    });
    fetchAssignmentsForTeacher(teacher.id).then(setAssignments);
    if (teacher.schoolIds[0]) fetchSchool(teacher.schoolIds[0]).then(setSchool);
  }, [teacher.id, teacher.schoolIds]);

  const classAssignments = useMemo(() => assignments.filter((a) => a.classIds.includes(classId)), [assignments, classId]);
  const assignment = classAssignments.find((a) => a.id === assignmentId) ?? classAssignments[0];

  useEffect(() => {
    if (!assignment) { setRows([]); return; }
    const cls = classes?.find((c) => c.id === classId);
    Promise.all([fetchSubmissionsForAssignment(assignment.id), cls ? fetchStudentsByIds(cls.studentIds) : Promise.resolve([])]).then(([subs, students]) => {
      setRows((cls?.studentIds ?? []).map((studentId) => {
        const student = students.find((s) => s.id === studentId);
        const sub = subs.find((s) => s.studentId === studentId);
        return { studentName: student?.displayName ?? '', status: sub ? t(`submissionStatus.${sub.status}`) : t('submissionStatus.not_started'), score: sub?.finalScore };
      }));
    });
  }, [assignment, classId, classes, t]);

  if (!classes) return <LoadingSkeleton height="12rem" />;

  const scored = rows.filter((r) => r.score !== undefined);
  const avg = scored.length ? Math.round(scored.reduce((sum, r) => sum + (r.score ?? 0), 0) / scored.length) : undefined;

  return (
    <>
      <PageHeader title={t('nav.teacher.reports')} />

      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
        <select className="select-control" style={{ width: 'auto' }} value={classId} onChange={(e) => { setClassId(e.target.value); setAssignmentId(''); }} aria-label={t('teacher.reports.selectClass')}>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="select-control" style={{ width: 'auto' }} value={assignment?.id ?? ''} onChange={(e) => setAssignmentId(e.target.value)} aria-label={t('teacher.reports.selectAssignment')}>
          {classAssignments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
      </div>

      {!assignment ? (
        <EmptyState title={t('teacher.assignments.noAssignments')} />
      ) : (
        <div className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 'var(--weight-semibold)' }}>{assignment.title}</p>
              <p className="field__hint">{t('teacher.assignments.avgScore')}: {avg ?? '—'}</p>
            </div>
            <PdfExportButton
              label={t('teacher.reports.classReport')}
              onExport={() => exportClassReportPdf({
                className: classes.find((c) => c.id === classId)?.name ?? '',
                schoolName: school?.name,
                assignmentTitle: assignment.title,
                locale: i18n.resolvedLanguage ?? 'tr',
                rows,
                averageScore: avg,
              })}
            />
          </div>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>{t('common.student')}</th><th>{t('common.status')}</th><th>{t('common.score')}</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}><td>{r.studentName}</td><td>{r.status}</td><td>{r.score !== undefined ? `${r.score}/100` : '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
