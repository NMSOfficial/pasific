import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AlertCircle, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import { findErrorCategory } from '../../mock/errorCategories';
import type { Assignment, StudentProfile, Submission, WritingAnnotation } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { CefrLevelBadge } from '../../components/CefrLevelBadge';
import { WritingTypeBadge } from '../../components/WritingTypeBadge';
import { ScoreRing } from '../../components/ScoreRing';
import { CriterionScoreCard } from '../../components/CriterionScoreCard';
import { AnnotatedText } from '../../components/AnnotatedText';
import { ErrorDetailPanel } from '../../components/ErrorDetailPanel';
import { RecommendationCard } from '../../components/RecommendationCard';
import { FeedbackTabs } from '../../components/FeedbackTabs';
import { MobileBottomSheet } from '../../components/MobileBottomSheet';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { PdfExportButton } from '../../components/PdfExportButton';
import { useIsMobile } from '../../utils/useIsMobile';
import { formatDateTime } from '../../utils/format';
import { exportSubmissionResultPdf } from '../../utils/pdf';
import { fetchAssignment } from '../../services/assignmentData';
import { fetchSubmission, retryAiGrading } from '../../services/submissionData';

export function SubmissionResultPage({ portfolioContext = false }: { portfolioContext?: boolean } = {}) {
  const { t, i18n } = useTranslation();
  const { submissionId } = useParams();
  const { user } = useAuth();
  const student = user as StudentProfile;
  const isMobile = useIsMobile();
  const [selected, setSelected] = useState<WritingAnnotation | null>(null);

  const [submission, setSubmission] = useState<Submission | null | undefined>(undefined);
  const [assignment, setAssignment] = useState<Assignment | undefined>(undefined);

  const reload = useCallback(() => {
    if (!submissionId) return;
    fetchSubmission(submissionId).then(async (sub) => {
      setSubmission(sub);
      if (sub?.assignmentId) setAssignment((await fetchAssignment(sub.assignmentId)) ?? undefined);
    });
  }, [submissionId]);

  useEffect(() => { reload(); }, [reload]);

  if (submission === undefined) return <LoadingSkeleton height="12rem" />;
  if (!submission || submission.studentId !== student.id) {
    return <Navigate to={portfolioContext ? '/student/portfolio' : '/student/assignments'} replace />;
  }

  const backTo = portfolioContext ? '/student/portfolio' : '/student/assignments';
  const backLabel = portfolioContext ? t('nav.student.portfolio') : t('nav.student.assignments');

  if (submission.status === 'submitted' || submission.status === 'analyzing') {
    return (
      <>
        <PageHeader title={submission.topicTitle} />
        <div className="state-panel">
          <Loader2 size={36} className="spin" color="var(--color-primary)" aria-hidden="true" />
          <p className="state-panel__title">{t('submissionStatus.analyzing')}</p>
          <Link to={backTo} className="btn btn--secondary">{backLabel}</Link>
        </div>
      </>
    );
  }

  if (submission.status === 'grading_failed') {
    return (
      <>
        <PageHeader title={submission.topicTitle} />
        <div className="state-panel">
          <AlertCircle size={36} color="var(--color-error)" aria-hidden="true" />
          <p className="state-panel__title">{t('submissionStatus.gradingFailed')}</p>
          <button type="button" className="btn btn--primary" onClick={async () => { await retryAiGrading(submission.id); reload(); }}>
            {t('submissionStatus.retry')}
          </button>
          <Link to={backTo} className="btn btn--secondary">{backLabel}</Link>
        </div>
      </>
    );
  }

  if (submission.status === 'teacher_review_pending' && !submission.scoreVisibleToStudent) {
    return (
      <>
        <PageHeader title={submission.topicTitle} />
        <div className="state-panel">
          <Clock size={36} color="var(--color-warning)" aria-hidden="true" />
          <p className="state-panel__title">{t('submissionStatus.teacher_review_pending')}</p>
          <p>{formatDateTime(submission.submittedAt, i18n.resolvedLanguage ?? 'tr')} · {submission.wordCount} {t('common.words')}</p>
          <Link to={backTo} className="btn btn--secondary">{backLabel}</Link>
        </div>
      </>
    );
  }

  const categoryGroupOf = (categoryId: string) => findErrorCategory(categoryId)?.group;

  const annotatedTab = submission.annotations.length === 0 ? (
    <EmptyState title={t('annotatedText.noAnnotations')} />
  ) : (
    <div className="writing-editor-layout">
      <div className="writing-editor-layout__main card card--padded">
        <AnnotatedText
          text={submission.text}
          annotations={submission.annotations}
          selectedId={selected?.id}
          onSelect={setSelected}
          categoryGroupOf={categoryGroupOf}
        />
      </div>
      {!isMobile && (
        <div className="writing-editor-layout__prompt card card--padded">
          {selected ? <ErrorDetailPanel annotation={selected} /> : <p className="field__hint">{t('annotatedText.selectAnnotationHint')}</p>}
        </div>
      )}
    </div>
  );

  const scoreTab = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {submission.usesCustomRubric && <p className="field__hint">{t('rubric.customRubricWarning')}</p>}
      {submission.criterionScores.map((c) => (
        <CriterionScoreCard key={c.criterionId} criterion={c} />
      ))}
    </div>
  );

  const recommendationsTab = submission.studyRecommendations.length === 0 ? (
    <EmptyState title={t('states.empty.generic')} />
  ) : (
    <div className="card-grid">
      {submission.studyRecommendations.map((r) => <RecommendationCard key={r.id} recommendation={r} />)}
    </div>
  );

  const feedbackTab = submission.teacherFeedback ? (
    <div className="card card--padded">
      <p style={{ lineHeight: 'var(--leading-relaxed)' }}>{submission.teacherFeedback}</p>
      {submission.reviewedAt && <p className="field__hint" style={{ marginTop: 'var(--space-3)' }}>{formatDateTime(submission.reviewedAt, i18n.resolvedLanguage ?? 'tr')}</p>}
    </div>
  ) : (
    <EmptyState title={t('states.empty.generic')} />
  );

  return (
    <>
      <PageHeader
        title={assignment?.title ?? submission.topicTitle}
        actions={
          <>
            {!submission.isPractice && (
              <Link
                to={assignment?.topicId ? `/student/practice/new?topicId=${assignment.topicId}` : '/student/practice/new'}
                className="btn btn--secondary"
              >
                {t('editor.practiseAgain')}
              </Link>
            )}
            <PdfExportButton
              onExport={() => exportSubmissionResultPdf({
                submission,
                studentName: student.displayName,
                assignmentTitle: assignment?.title,
                locale: i18n.resolvedLanguage ?? 'tr',
                criterionLabel: (c) => t(`rubric.criterion.${c.criterionKey}.name`),
              })}
            />
          </>
        }
      />

      <div className="card card--padded" style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <ScoreRing score={submission.finalScore ?? 0} />
        <div style={{ flex: 1, minWidth: '16rem', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <WritingTypeBadge writingTypeId={submission.writingTypeId} />
            <CefrLevelBadge level={submission.level} />
            {submission.teacherOverrides.length > 0 && <span className="badge badge--primary">{t('rubric.teacherFinalScore')}</span>}
          </div>
          <p className="field__hint">
            {formatDateTime(submission.submittedAt, i18n.resolvedLanguage ?? 'tr')} · {submission.wordCount} {t('common.words')}
          </p>
          {submission.teacherOverrides.length > 0 && submission.aiScore !== undefined && (
            <p className="field__hint">{t('rubric.aiSuggestedScore')}: {submission.aiScore}</p>
          )}
        </div>
      </div>

      <FeedbackTabs
        tabs={[
          { key: 'annotated', label: t('annotatedText.tabs.annotated'), content: annotatedTab },
          { key: 'scores', label: t('annotatedText.tabs.scoreBreakdown'), content: scoreTab },
          { key: 'recommendations', label: t('annotatedText.tabs.studyRecommendations'), content: recommendationsTab },
          { key: 'feedback', label: t('annotatedText.tabs.teacherFeedback'), content: feedbackTab },
        ]}
      />

      {isMobile && (
        <MobileBottomSheet open={!!selected} onClose={() => setSelected(null)} title={t('annotatedText.tabs.annotated')}>
          {selected && <ErrorDetailPanel annotation={selected} />}
        </MobileBottomSheet>
      )}
    </>
  );
}
