import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PenSquare, ArrowRight, TrendingUp } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import { computePortfolioMetrics } from '../../utils/portfolio';
import type { Assignment, StudentProfile, Submission } from '../../types/entities';
import { AssignmentCard } from '../../components/AssignmentCard';
import { EmptyState } from '../../components/EmptyState';
import { ScoreRing } from '../../components/ScoreRing';
import { CriterionScoreBar } from '../../components/CriterionScoreBar';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { fetchAssignmentsForClasses } from '../../services/assignmentData';
import { fetchUserDisplayName } from '../../services/teacherData';
import { fetchSubmissionsForStudents, fetchSubmissionForAssignment } from '../../services/submissionData';

export function StudentHomePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const student = user as StudentProfile;

  const [assignments, setAssignments] = useState<{ assignment: Assignment; status: Submission['status']; teacherName?: string; submissionId?: string }[] | null>(null);
  const [allSubs, setAllSubs] = useState<Submission[]>([]);

  useEffect(() => {
    fetchAssignmentsForClasses(student.classIds).then(async (list) => {
      const upcoming = list
        .filter((a) => a.status === 'published')
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
        .slice(0, 4);
      const rows = await Promise.all(upcoming.map(async (a) => {
        const [sub, teacherName] = await Promise.all([fetchSubmissionForAssignment(a.id, student.id), fetchUserDisplayName(a.createdBy)]);
        return { assignment: a, status: sub?.status ?? ('not_started' as Submission['status']), teacherName, submissionId: sub?.id };
      }));
      setAssignments(rows);
    });
    fetchSubmissionsForStudents([student.id]).then(setAllSubs);
  }, [student.id, student.classIds]);

  if (!assignments) return <LoadingSkeleton height="12rem" />;

  const recentResult = allSubs
    .filter((s) => s.status === 'result_ready' && s.finalScore !== undefined)
    .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))[0];

  const weakestCriterion = recentResult
    ? [...recentResult.criterionScores].sort((a, b) => (a.teacherScore ?? a.aiScore) - (b.teacherScore ?? b.aiScore))[0]
    : undefined;

  const portfolio = computePortfolioMetrics(student.id, allSubs);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">{t('student.home.greeting', { name: student.displayName.split(' ')[0] })}</h1>
        </div>
        <div className="page-header__actions">
          <Link to="/student/practice/new" className="btn btn--primary">
            <PenSquare size={16} aria-hidden="true" /> {t('student.home.newPractice')}
          </Link>
        </div>
      </div>

      <section className="section-block">
        <div className="section-block__title">
          <h2>{t('student.home.assignedTasks')}</h2>
          <Link to="/student/assignments" className="btn btn--ghost btn--sm">{t('common.viewAll')} <ArrowRight size={14} aria-hidden="true" /></Link>
        </div>
        {assignments.length === 0 ? (
          <EmptyState title={t('student.home.noAssignedTasks')} description={t('student.home.noAssignedTasksDescription')} />
        ) : (
          <div className="card-grid">
            {assignments.map(({ assignment, status, teacherName, submissionId }) => (
              <AssignmentCard key={assignment.id} assignment={assignment} status={status} teacherName={teacherName} submissionId={submissionId} />
            ))}
          </div>
        )}
      </section>

      <section className="section-block">
        <div className="section-block__title">
          <h2>{t('student.home.recentPerformance')}</h2>
        </div>
        {!recentResult ? (
          <EmptyState title={t('student.home.noRecentPerformance')} description={t('student.home.noRecentPerformanceDescription')} />
        ) : (
          <div className="card card--padded" style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'center' }}>
            <ScoreRing score={recentResult.finalScore ?? 0} />
            <div style={{ flex: 1, minWidth: '14rem', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <p style={{ fontWeight: 'var(--weight-medium)' }}>{recentResult.topicTitle}</p>
              {weakestCriterion && (
                <div>
                  <p className="field__hint" style={{ marginBottom: 'var(--space-1)' }}>{t('student.home.mainDevelopmentArea')}</p>
                  <CriterionScoreBar criterion={weakestCriterion} />
                </div>
              )}
              {recentResult.teacherFeedback && (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>&ldquo;{recentResult.teacherFeedback}&rdquo;</p>
              )}
              <Link to={`/student/submissions/${recentResult.id}/result`} className="btn btn--secondary btn--sm" style={{ alignSelf: 'flex-start' }}>
                {t('common.seeDetails')}
              </Link>
            </div>
          </div>
        )}
      </section>

      <section className="section-block">
        <div className="section-block__title">
          <h2>{t('student.home.portfolioSummary')}</h2>
          <Link to="/student/portfolio" className="btn btn--ghost btn--sm">{t('student.home.viewPortfolio')} <ArrowRight size={14} aria-hidden="true" /></Link>
        </div>
        <div className="stat-row">
          <div className="stat-tile">
            <span className="stat-tile__value">{portfolio.totalCompleted}</span>
            <span className="stat-tile__label">{t('student.portfolio.totalCompleted')}</span>
          </div>
          <div className="stat-tile">
            <span className="stat-tile__value">{portfolio.writingTypesPractised.length}</span>
            <span className="stat-tile__label">{t('student.portfolio.typesPractised')}</span>
          </div>
          <div className="stat-tile">
            <span className="stat-tile__value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {portfolio.scoreTrend.length > 0 ? portfolio.scoreTrend[portfolio.scoreTrend.length - 1].score : '—'}
              {portfolio.scoreTrend.length > 1 && <TrendingUp size={16} color="var(--color-success)" aria-hidden="true" />}
            </span>
            <span className="stat-tile__label">{t('common.score')}</span>
          </div>
          <div className="stat-tile">
            <span className="stat-tile__value" style={{ fontSize: 'var(--text-md)' }}>
              {portfolio.topErrorCategories[0] ? t(`errorCategory.${portfolio.topErrorCategories[0].categoryId}`) : '—'}
            </span>
            <span className="stat-tile__label">{t('student.portfolio.topErrors')}</span>
          </div>
        </div>
      </section>
    </>
  );
}
