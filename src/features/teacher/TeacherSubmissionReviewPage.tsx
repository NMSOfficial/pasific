import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { useMockState, mockStore } from '../../mock/useMockStore';
import { getAssignment, getSubmission } from '../../mock/selectors';
import { findErrorCategory } from '../../mock/errorCategories';
import type { TeacherProfile, WritingAnnotation } from '../../types/entities';
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
import { PdfExportButton } from '../../components/PdfExportButton';
import { AuditTimeline } from '../../components/AuditTimeline';
import { useIsMobile } from '../../utils/useIsMobile';
import { formatDateTime } from '../../utils/format';
import { exportSubmissionResultPdf } from '../../utils/pdf';

export function TeacherSubmissionReviewPage() {
  const { t, i18n } = useTranslation();
  const { submissionId } = useParams();
  const { user } = useAuth();
  const state = useMockState();
  const teacher = user as TeacherProfile;
  const isMobile = useIsMobile();
  const [selected, setSelected] = useState<WritingAnnotation | null>(null);
  const [feedback, setFeedback] = useState('');

  const submission = submissionId ? getSubmission(state, submissionId) : undefined;

  useEffect(() => {
    setFeedback(submission?.teacherFeedback ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission?.id]);

  if (!submission || submission.isPractice) return <Navigate to="/teacher/assignments" replace />;

  const assignment = submission.assignmentId ? getAssignment(state, submission.assignmentId) : undefined;
  const student = state.students.find((s) => s.id === submission.studentId);
  const otherSubmissions = state.submissions
    .filter((s) => s.studentId === submission.studentId && s.id !== submission.id && s.status === 'result_ready')
    .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''));

  const categoryGroupOf = (categoryId: string) => findErrorCategory(categoryId)?.group;

  const handleOverride = (criterionId: string, newScore: number, reason: string) => {
    mockStore.applyTeacherOverride({ submissionId: submission.id, criterionId, newScore, reason, teacherId: teacher.id, teacherName: teacher.displayName });
  };

  const handlePublish = () => {
    mockStore.publishTeacherReview(submission.id, feedback, teacher.id);
  };

  const handleSaveDraft = () => {
    mockStore.saveSubmissionDraft(submission.id, submission.text);
  };

  if (submission.status === 'submitted' || submission.status === 'analyzing') {
    return (
      <>
        <PageHeader title={student?.displayName ?? ''} />
        <EmptyState title={t('submissionStatus.analyzing')} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={student?.displayName ?? ''}
        subtitle={assignment?.title ?? submission.topicTitle}
        actions={
          <>
            <Link to={`/teacher/students/${submission.studentId}/portfolio`} className="btn btn--secondary">{t('nav.student.portfolio')}</Link>
            <PdfExportButton
              onExport={() => exportSubmissionResultPdf({
                submission,
                studentName: student?.displayName ?? '',
                schoolName: undefined,
                assignmentTitle: assignment?.title,
                locale: i18n.resolvedLanguage ?? 'tr',
                criterionLabel: (c) => t(`rubric.criterion.${c.criterionKey}.name`),
              })}
            />
          </>
        }
      />

      <div className="card card--padded" style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <ScoreRing score={submission.finalScore ?? submission.aiScore ?? 0} />
        <div style={{ flex: 1, minWidth: '16rem', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <WritingTypeBadge writingTypeId={submission.writingTypeId} />
            <CefrLevelBadge level={submission.level} />
            {!submission.scoreVisibleToStudent && <span className="badge badge--warning">{t('submissionStatus.teacher_review_pending')}</span>}
          </div>
          <p className="field__hint">{formatDateTime(submission.submittedAt, i18n.resolvedLanguage ?? 'tr')} · {submission.wordCount} {t('common.words')}</p>
          {submission.aiScore !== undefined && <p className="field__hint">{t('rubric.aiSuggestedScore')}: {submission.aiScore}</p>}
        </div>
      </div>

      <FeedbackTabs
        tabs={[
          {
            key: 'annotated',
            label: t('annotatedText.tabs.annotated'),
            content: submission.annotations.length === 0 ? <EmptyState title={t('annotatedText.noAnnotations')} /> : (
              <div className="writing-editor-layout">
                <div className="writing-editor-layout__main card card--padded">
                  <AnnotatedText text={submission.text} annotations={submission.annotations} selectedId={selected?.id} onSelect={setSelected} categoryGroupOf={categoryGroupOf} />
                </div>
                {!isMobile && (
                  <div className="writing-editor-layout__prompt card card--padded">
                    {selected ? <ErrorDetailPanel annotation={selected} /> : <p className="field__hint">{t('annotatedText.selectAnnotationHint')}</p>}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'scores',
            label: t('annotatedText.tabs.scoreBreakdown'),
            content: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {submission.usesCustomRubric && <p className="field__hint">{t('rubric.customRubricWarning')}</p>}
                {submission.criterionScores.map((c) => (
                  <CriterionScoreCard
                    key={c.criterionId}
                    criterion={c}
                    showAiVsTeacher
                    editable
                    onOverride={(newScore, reason) => handleOverride(c.criterionId, newScore, reason)}
                  />
                ))}
              </div>
            ),
          },
          {
            key: 'recommendations',
            label: t('annotatedText.tabs.studyRecommendations'),
            content: submission.studyRecommendations.length === 0 ? <EmptyState title={t('states.empty.generic')} /> : (
              <div className="card-grid">{submission.studyRecommendations.map((r) => <RecommendationCard key={r.id} recommendation={r} />)}</div>
            ),
          },
          {
            key: 'history',
            label: t('teacher.review.previousWork'),
            content: otherSubmissions.length === 0 ? <EmptyState title={t('states.empty.generic')} /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {otherSubmissions.map((s) => (
                  <Link key={s.id} to={`/teacher/submissions/${s.id}`} className="card card--padded card--interactive" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{s.topicTitle}</span>
                    <span>{s.finalScore}/100</span>
                  </Link>
                ))}
              </div>
            ),
          },
        ]}
      />

      <section className="card card--padded" style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <label className="field__label" htmlFor="teacher-feedback">{t('teacher.review.teacherFeedback')}</label>
        <textarea
          id="teacher-feedback"
          className="textarea-control"
          rows={4}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder={t('teacher.review.feedbackPlaceholder')}
        />
        <p className="field__hint">{submission.scoreVisibleToStudent && submission.status === 'result_ready' ? t('teacher.review.publishedNote') : t('teacher.review.draftNote')}</p>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button type="button" className="btn btn--secondary" onClick={handleSaveDraft}>{t('teacher.review.saveDraft')}</button>
          <button type="button" className="btn btn--primary" onClick={handlePublish}>{t('teacher.review.publish')}</button>
        </div>
      </section>

      {submission.teacherOverrides.length > 0 && (
        <section style={{ marginTop: 'var(--space-6)' }}>
          <p className="field__label" style={{ marginBottom: 'var(--space-3)' }}>{t('common.actions')}</p>
          <AuditTimeline
            events={submission.teacherOverrides.map((o) => ({
              id: o.id,
              label: `${t(`rubric.criterion.${submission.criterionScores.find((c) => c.criterionId === o.criterionId)?.criterionKey}.name`)}: ${o.originalAiScore} → ${o.finalScore}`,
              detail: o.reason,
              timestamp: o.timestamp,
            }))}
          />
        </section>
      )}

      {isMobile && (
        <MobileBottomSheet open={!!selected} onClose={() => setSelected(null)} title={t('annotatedText.tabs.annotated')}>
          {selected && <ErrorDetailPanel annotation={selected} />}
        </MobileBottomSheet>
      )}
    </>
  );
}
