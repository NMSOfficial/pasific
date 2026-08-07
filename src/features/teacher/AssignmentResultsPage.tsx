import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router-dom';
import { FileSpreadsheet } from 'lucide-react';
import type { Assignment, StudentProfile, Submission } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { SubmissionStatusBadge } from '../../components/StatusBadge';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { PdfExportButton } from '../../components/PdfExportButton';
import { formatDate } from '../../utils/format';
import { exportClassReportPdf } from '../../utils/pdf';
import { exportXlsx } from '../../utils/excel';
import { fetchAssignment } from '../../services/assignmentData';
import { fetchClass, fetchStudentsByIds } from '../../services/teacherData';
import { fetchSubmissionsForAssignment } from '../../services/submissionData';
import { fetchSchool } from '../../services/adminData';

export function AssignmentResultsPage() {
  const { t, i18n } = useTranslation();
  const { assignmentId } = useParams();
  const [assignment, setAssignment] = useState<Assignment | null | undefined>(undefined);
  const [rows, setRows] = useState<{ student: StudentProfile | undefined; sub: Submission | undefined }[]>([]);
  const [classNames, setClassNames] = useState<string[]>([]);
  const [schoolName, setSchoolName] = useState<string | undefined>();

  useEffect(() => {
    if (!assignmentId) return;
    fetchAssignment(assignmentId).then(async (a) => {
      setAssignment(a);
      if (!a) return;
      const [classResults, school] = await Promise.all([
        Promise.all(a.classIds.map((id) => fetchClass(id))),
        fetchSchool(a.schoolId),
      ]);
      const validClasses = classResults.filter((c) => c !== null);
      setClassNames(validClasses.map((c) => c!.name));
      setSchoolName(school?.name);
      const studentIds = [...new Set(validClasses.flatMap((c) => c!.studentIds))];
      const [students, submissions] = await Promise.all([
        fetchStudentsByIds(studentIds),
        fetchSubmissionsForAssignment(a.id),
      ]);
      setRows(studentIds.map((studentId) => ({
        student: students.find((s) => s.id === studentId),
        sub: submissions.find((s) => s.studentId === studentId),
      })));
    });
  }, [assignmentId]);

  if (assignment === null) return <Navigate to="/teacher/assignments" replace />;
  if (assignment === undefined) return <LoadingSkeleton height="12rem" />;

  const scored = rows.filter((r) => r.sub?.finalScore !== undefined);
  const avgScore = scored.length ? Math.round(scored.reduce((sum, r) => sum + (r.sub!.finalScore ?? 0), 0) / scored.length) : undefined;
  const submittedCount = rows.filter((r) => r.sub && r.sub.status !== 'not_started' && r.sub.status !== 'in_progress').length;
  const notStartedCount = rows.filter((r) => !r.sub || r.sub.status === 'not_started').length;
  const classLabel = classNames.join(', ') || t('nav.teacher.classes');
  const reportRows = rows.map(({ student, sub }) => ({
    studentName: student?.displayName ?? '',
    username: student?.username ?? '',
    status: t(`submissionStatus.${sub?.status ?? 'not_started'}`),
    score: sub?.finalScore ?? sub?.aiScore,
    submittedAt: sub?.submittedAt ? formatDate(sub.submittedAt, i18n.resolvedLanguage ?? 'tr') : '',
  }));

  const exportPdf = () => exportClassReportPdf({
    className: classLabel,
    schoolName,
    assignmentTitle: assignment.title,
    locale: i18n.resolvedLanguage ?? 'tr',
    rows: reportRows.map((row) => ({ studentName: row.studentName, status: row.status, score: row.score })),
    averageScore: avgScore,
  });

  const exportExcel = () => exportXlsx({
    fileName: `pasific-${assignment.title}-submissions`,
    sheetName: assignment.title,
    columns: [t('common.student'), t('settings.username'), t('common.status'), t('common.score'), t('teacher.classes.lastSubmission')],
    rows: reportRows.map((row) => [row.studentName, row.username, row.status, row.score, row.submittedAt]),
  });

  return (
    <>
      <PageHeader
        title={assignment.title}
        subtitle={t('teacher.assignments.resultsTitle')}
        actions={
          <>
            <PdfExportButton onExport={exportPdf} />
            <button type="button" className="btn btn--secondary" onClick={exportExcel}>
              <FileSpreadsheet size={16} aria-hidden="true" /> Excel
            </button>
          </>
        }
      />

      <div className="stat-row" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="stat-tile"><span className="stat-tile__value">{avgScore ?? '—'}</span><span className="stat-tile__label">{t('teacher.assignments.avgScore')}</span></div>
        <div className="stat-tile"><span className="stat-tile__value">{submittedCount}</span><span className="stat-tile__label">{t('teacher.assignments.submittedCount')}</span></div>
        <div className="stat-tile"><span className="stat-tile__value">{notStartedCount}</span><span className="stat-tile__label">{t('teacher.assignments.notStartedCount')}</span></div>
      </div>

      <div className="data-table-wrap desktop-only-block">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('common.student')}</th>
              <th>{t('common.status')}</th>
              <th>{t('common.score')}</th>
              <th>{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ student, sub }) => (
              <tr key={student?.id}>
                <td>
                  <span>{student?.displayName}</span>
                  {student?.username && <div className="field__hint">@{student.username}</div>}
                </td>
                <td><SubmissionStatusBadge status={sub?.status ?? 'not_started'} /></td>
                <td>{sub?.finalScore !== undefined ? `${sub.finalScore}/100` : sub?.aiScore !== undefined ? `${t('rubric.aiSuggestedScore')}: ${sub.aiScore}` : '—'}</td>
                <td>{sub && sub.status !== 'not_started' && sub.status !== 'in_progress' && (
                  <Link to={`/teacher/submissions/${sub.id}`} className="btn btn--ghost btn--sm">{t('common.seeDetails')}</Link>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mobile-student-list">
        {rows.map(({ student, sub }) => (
          <div key={student?.id} className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'var(--weight-medium)' }}>{student?.displayName}</span>
              <SubmissionStatusBadge status={sub?.status ?? 'not_started'} />
            </div>
            {student?.username && <span className="field__hint">@{student.username}</span>}
            <span className="field__hint">{sub?.finalScore !== undefined ? `${sub.finalScore}/100` : '—'} {sub?.submittedAt ? `· ${formatDate(sub.submittedAt, i18n.resolvedLanguage ?? 'tr')}` : ''}</span>
            {sub && sub.status !== 'not_started' && sub.status !== 'in_progress' && (
              <Link to={`/teacher/submissions/${sub.id}`} className="btn btn--secondary btn--sm" style={{ alignSelf: 'flex-start' }}>{t('common.seeDetails')}</Link>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
