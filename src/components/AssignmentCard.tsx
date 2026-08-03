import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CalendarDays, User, Type } from 'lucide-react';
import type { Assignment, SubmissionStatus } from '../types/entities';
import { CefrLevelBadge } from './CefrLevelBadge';
import { WritingTypeBadge } from './WritingTypeBadge';
import { SubmissionStatusBadge } from './StatusBadge';
import { formatDate } from '../utils/format';

interface AssignmentCardProps {
  assignment: Assignment;
  status: SubmissionStatus;
  teacherName?: string;
  submissionId?: string;
}

export function AssignmentCard({ assignment, status, teacherName, submissionId }: AssignmentCardProps) {
  const { t, i18n } = useTranslation();

  const primaryAction = (() => {
    if (status === 'not_started' || status === 'in_progress') {
      return { label: status === 'in_progress' ? t('common.continue') : t('common.submit'), to: `/student/assignments/${assignment.id}/write` };
    }
    if (status === 'result_ready' || status === 'teacher_review_pending') {
      return submissionId ? { label: t('common.seeDetails'), to: `/student/submissions/${submissionId}/result` } : undefined;
    }
    return undefined;
  })();

  return (
    <div className="card card--padded assignment-card">
      <div className="assignment-card__header">
        <div className="assignment-card__badges">
          <WritingTypeBadge writingTypeId={assignment.writingTypeId} />
          <CefrLevelBadge level={assignment.level} />
        </div>
        <SubmissionStatusBadge status={status} />
      </div>
      <Link to={`/student/assignments/${assignment.id}`} className="assignment-card__title">
        {assignment.title}
      </Link>
      <div className="assignment-card__meta">
        {teacherName && (
          <span className="assignment-card__meta-item"><User size={13} aria-hidden="true" />{teacherName}</span>
        )}
        <span className="assignment-card__meta-item"><CalendarDays size={13} aria-hidden="true" />{formatDate(assignment.dueAt, i18n.resolvedLanguage ?? 'tr')}</span>
        <span className="assignment-card__meta-item"><Type size={13} aria-hidden="true" />{assignment.suggestedMinWords}–{assignment.suggestedMaxWords} {t('common.words')}</span>
      </div>
      {primaryAction && (
        <Link to={primaryAction.to} className="btn btn--primary btn--sm" style={{ alignSelf: 'flex-start' }}>
          {primaryAction.label}
        </Link>
      )}
    </div>
  );
}
