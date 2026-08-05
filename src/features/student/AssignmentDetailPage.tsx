import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router-dom';
import { CalendarDays, Clock, User } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import type { Assignment, StudentProfile, Submission } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { CefrLevelBadge } from '../../components/CefrLevelBadge';
import { WritingTypeBadge } from '../../components/WritingTypeBadge';
import { SubmissionStatusBadge, CustomRubricBadge } from '../../components/StatusBadge';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { formatDateTime } from '../../utils/format';
import { fetchAssignment } from '../../services/assignmentData';
import { fetchUserDisplayName } from '../../services/teacherData';
import { fetchSubmissionForAssignment } from '../../services/submissionData';

export function AssignmentDetailPage() {
  const { t, i18n } = useTranslation();
  const { assignmentId } = useParams();
  const { user } = useAuth();
  const student = user as StudentProfile;

  const [assignment, setAssignment] = useState<Assignment | null | undefined>(undefined);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [teacherName, setTeacherName] = useState<string | undefined>();

  useEffect(() => {
    if (!assignmentId) return;
    fetchAssignment(assignmentId).then(async (a) => {
      setAssignment(a);
      if (!a) return;
      const [sub, name] = await Promise.all([fetchSubmissionForAssignment(a.id, student.id), fetchUserDisplayName(a.createdBy)]);
      setSubmission(sub);
      setTeacherName(name);
    });
  }, [assignmentId, student.id]);

  if (assignment === null) return <Navigate to="/student/assignments" replace />;
  if (assignment === undefined) return <LoadingSkeleton height="12rem" />;

  const status = submission?.status ?? 'not_started';

  return (
    <>
      <PageHeader
        title={assignment.title}
        actions={
          status === 'result_ready' || status === 'teacher_review_pending'
            ? <Link to={`/student/submissions/${submission!.id}/result`} className="btn btn--primary">{t('student.assignment.viewResult')}</Link>
            : <Link to={`/student/assignments/${assignment.id}/write`} className="btn btn--primary">
                {status === 'in_progress' ? t('student.assignment.continueWriting') : t('student.assignment.startWriting')}
              </Link>
        }
      />

      <div className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <WritingTypeBadge writingTypeId={assignment.writingTypeId} />
          <CefrLevelBadge level={assignment.level} />
          <SubmissionStatusBadge status={status} />
          <CustomRubricBadge rubric={assignment.rubric} />
        </div>

        <div>
          <p className="field__label">{t('student.assignment.prompt')}</p>
          <p style={{ marginTop: 'var(--space-2)', lineHeight: 'var(--leading-relaxed)' }}>{assignment.prompt}</p>
        </div>

        {assignment.instructions && (
          <div>
            <p className="field__label">{t('student.assignment.instructions')}</p>
            <p style={{ marginTop: 'var(--space-2)', color: 'var(--color-text-muted)' }}>{assignment.instructions}</p>
          </div>
        )}

        {assignment.referenceText && (
          <div>
            <p className="field__label">{t('student.assignment.referenceText')}</p>
            <div className="card--padded" style={{ marginTop: 'var(--space-2)', background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap', fontSize: 'var(--text-sm)' }}>
              {assignment.referenceText}
            </div>
          </div>
        )}

        <div className="assignment-card__meta" style={{ fontSize: 'var(--text-sm)' }}>
          {teacherName && <span className="assignment-card__meta-item"><User size={14} aria-hidden="true" />{teacherName}</span>}
          <span className="assignment-card__meta-item"><CalendarDays size={14} aria-hidden="true" />{t('student.assignment.due')}: {formatDateTime(assignment.dueAt, i18n.resolvedLanguage ?? 'tr')}</span>
          <span className="assignment-card__meta-item">{assignment.suggestedMinWords}–{assignment.suggestedMaxWords} {t('common.words')}</span>
          {assignment.timeLimitMinutes && (
            <span className="assignment-card__meta-item"><Clock size={14} aria-hidden="true" />{assignment.timeLimitMinutes} {t('common.minutes')}</span>
          )}
        </div>

        <div>
          <p className="field__label" style={{ marginBottom: 'var(--space-2)' }}>{t('student.assignment.rubricPreview')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {assignment.rubric.criteria.filter((c) => c.enabled).map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-border)' }}>
                <span>{t(c.nameKey)}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>{c.weight}%</span>
              </div>
            ))}
          </div>
          {assignment.rubric.isCustom && (
            <p className="field__hint" style={{ marginTop: 'var(--space-2)' }}>{t('rubric.customRubricWarning')}</p>
          )}
        </div>
      </div>
    </>
  );
}
