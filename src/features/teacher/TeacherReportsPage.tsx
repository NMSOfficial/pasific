import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/AuthContext';
import { useMockState } from '../../mock/useMockStore';
import { getAssignmentsForClass, getSchool, getSubmissionsForAssignment } from '../../mock/selectors';
import type { TeacherProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { PdfExportButton } from '../../components/PdfExportButton';
import { EmptyState } from '../../components/EmptyState';
import { exportClassReportPdf } from '../../utils/pdf';

export function TeacherReportsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const state = useMockState();
  const teacher = user as TeacherProfile;

  const classes = teacher.classIds.map((id) => state.classes.find((c) => c.id === id)).filter(Boolean);
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const assignments = classId ? getAssignmentsForClass(state, classId) : [];
  const [assignmentId, setAssignmentId] = useState(assignments[0]?.id ?? '');

  const assignment = assignments.find((a) => a.id === assignmentId) ?? assignments[0];

  const rows = useMemo(() => {
    if (!assignment) return [];
    const cls = classes.find((c) => c!.id === classId);
    const subs = getSubmissionsForAssignment(state, assignment.id);
    return (cls?.studentIds ?? []).map((studentId) => {
      const student = state.students.find((s) => s.id === studentId);
      const sub = subs.find((s) => s.studentId === studentId);
      return { studentName: student?.displayName ?? '', status: sub ? t(`submissionStatus.${sub.status}`) : t('submissionStatus.not_started'), score: sub?.finalScore };
    });
  }, [assignment, classId, classes, state, t]);

  const scored = rows.filter((r) => r.score !== undefined);
  const avg = scored.length ? Math.round(scored.reduce((sum, r) => sum + (r.score ?? 0), 0) / scored.length) : undefined;

  return (
    <>
      <PageHeader title={t('nav.teacher.reports')} />

      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
        <select className="select-control" style={{ width: 'auto' }} value={classId} onChange={(e) => { setClassId(e.target.value); setAssignmentId(''); }} aria-label={t('teacher.reports.selectClass')}>
          {classes.map((c) => <option key={c!.id} value={c!.id}>{c!.name}</option>)}
        </select>
        <select className="select-control" style={{ width: 'auto' }} value={assignment?.id ?? ''} onChange={(e) => setAssignmentId(e.target.value)} aria-label={t('teacher.reports.selectAssignment')}>
          {assignments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
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
                className: classes.find((c) => c!.id === classId)?.name ?? '',
                schoolName: getSchool(state, teacher.schoolIds[0])?.name,
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
