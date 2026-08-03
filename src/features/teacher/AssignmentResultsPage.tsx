import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useMockState } from '../../mock/useMockStore';
import { getAssignment, getSubmissionsForAssignment } from '../../mock/selectors';
import { PageHeader } from '../../components/PageHeader';
import { SubmissionStatusBadge } from '../../components/StatusBadge';
import { formatDate } from '../../utils/format';

export function AssignmentResultsPage() {
  const { t, i18n } = useTranslation();
  const { assignmentId } = useParams();
  const state = useMockState();

  const assignment = assignmentId ? getAssignment(state, assignmentId) : undefined;
  if (!assignment) return <Navigate to="/teacher/assignments" replace />;

  const classStudents = assignment.classIds.flatMap((cid) => state.classes.find((c) => c.id === cid)?.studentIds ?? []);
  const submissions = getSubmissionsForAssignment(state, assignment.id);

  const rows = classStudents.map((studentId) => {
    const student = state.students.find((s) => s.id === studentId);
    const sub = submissions.find((s) => s.studentId === studentId);
    return { student, sub };
  });

  const scored = rows.filter((r) => r.sub?.finalScore !== undefined);
  const avgScore = scored.length ? Math.round(scored.reduce((sum, r) => sum + (r.sub!.finalScore ?? 0), 0) / scored.length) : undefined;
  const submittedCount = rows.filter((r) => r.sub && r.sub.status !== 'not_started' && r.sub.status !== 'in_progress').length;
  const notStartedCount = rows.filter((r) => !r.sub || r.sub.status === 'not_started').length;

  return (
    <>
      <PageHeader title={assignment.title} subtitle={t('teacher.assignments.resultsTitle')} />

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
                <td>{student?.displayName}</td>
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
