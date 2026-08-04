import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PenSquare } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import type { StudentProfile, Submission } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { WritingTypeBadge } from '../../components/WritingTypeBadge';
import { CefrLevelBadge } from '../../components/CefrLevelBadge';
import { SubmissionStatusBadge } from '../../components/StatusBadge';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { formatDate } from '../../utils/format';
import { fetchSubmissionsForStudents } from '../../services/submissionData';

export function PracticeHomePage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const student = user as StudentProfile;
  const [practiceSubs, setPracticeSubs] = useState<Submission[] | null>(null);

  useEffect(() => {
    fetchSubmissionsForStudents([student.id], { practiceOnly: true }).then((subs) =>
      setPracticeSubs(subs.sort((a, b) => (b.lastSavedAt ?? '').localeCompare(a.lastSavedAt ?? ''))),
    );
  }, [student.id]);

  if (!practiceSubs) return <LoadingSkeleton height="12rem" />;

  return (
    <>
      <PageHeader
        title={t('nav.student.practice')}
        actions={<Link to="/student/practice/new" className="btn btn--primary"><PenSquare size={16} aria-hidden="true" /> {t('student.home.newPractice')}</Link>}
      />

      {practiceSubs.length === 0 ? (
        <EmptyState title={t('practice.empty')} description={t('practice.emptyDescription')} />
      ) : (
        <div className="card-grid">
          {practiceSubs.map((sub) => (
            <div key={sub.id} className="card card--padded assignment-card">
              <div className="assignment-card__header">
                <div className="assignment-card__badges">
                  <WritingTypeBadge writingTypeId={sub.writingTypeId} />
                  <CefrLevelBadge level={sub.level} />
                </div>
                <SubmissionStatusBadge status={sub.status} />
              </div>
              <p className="assignment-card__title">{sub.topicTitle}</p>
              <p className="field__hint">{formatDate(sub.lastSavedAt, i18n.resolvedLanguage ?? 'tr')}</p>
              <Link
                to={sub.status === 'not_started' || sub.status === 'in_progress' ? `/student/practice/${sub.id}/write` : `/student/portfolio/${sub.id}`}
                className="btn btn--secondary btn--sm"
                style={{ alignSelf: 'flex-start' }}
              >
                {t('common.seeDetails')}
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
