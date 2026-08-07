import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import { findErrorCategory } from '../../mock/errorCategories';
import type { Assignment, StudentProfile, Submission, TeacherProfile, WritingAnnotation } from '../../types/entities';
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
import { AuditTimeline } from '../../components/AuditTimeline';
import { useIsMobile } from '../../utils/useIsMobile';
import { formatDateTime } from '../../utils/format';
import { exportSubmissionResultPdf } from '../../utils/pdf';
import { formatScaledScore, scaleWritingScore } from '../../utils/scoringScale';
import { fetchAssignment } from '../../services/assignmentData';
import { fetchStudent } from '../../services/teacherData';
import { fetchSubmission, fetchSubmissionsForStudents, applyTeacherOverride, publishTeacherReview, saveSubmissionDraft, retryAiGrading } from '../../services/submissionData';

export function TeacherSubmissionReviewPage() {
  const { t, i18n } = useTranslation();
  const { submissionId } = useParams();
  const { user } = useAuth();
  const teacher = user as TeacherProfile;
  const isMobile = useIsMobile();
  const [selected, setSelected] = useState<WritingAnnotation | null>(null);
  const [feedback, setFeedback] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishedNow, setPublishedNow] = useState(false);
  const [submission, setSubmission] = useState<Submission | null | undefined>(undefined);
  const [assignment, setAssignment] = useState<Assignment | undefined>(undefined);
  const [student, setStudent] = useState<StudentProfile | undefined>(undefined);
  const [otherSubmissions, setOtherSubmissions] = useState<Submission[]>([]);

  const reload = useCallback(() => {
    if (!submissionId) return;
    fetchSubmission(submissionId).then(async (sub) => {
      setSubmission(sub);
      setFeedback(sub?.teacherFeedback ?? '');
      if (!sub) return;
      const [a, s, otherSubs] = await Promise.all([
        sub.assignmentId ? fetchAssignment(sub.assignmentId) : Promise.resolve(undefined),
        fetchStudent(sub.studentId),
        fetchSubmissionsForStudents([sub.studentId], { excludePractice: true }),
      ]);
      setAssignment(a ?? undefined);
      setStudent(s ?? undefined);
      setOtherSubmissions(otherSubs.filter((s2) => s2.id !== sub.id && s2.status === 'result_ready').sort((x, y) => (y.submittedAt ?? '').localeCompare(x.submittedAt ?? '')));
    });
  }, [submissionId]);

  useEffect(() => { reload(); }, [reload]);

  if (submission === null) return <Navigate to="/teacher/assignments" replace />;
  if (submission === undefined) return <LoadingSkeleton height="12rem" />;
  if (submission.isPractice) return <Navigate to="/teacher/assignments" replace />;

  const categoryGroupOf = (categoryId: string) => findErrorCategory(categoryId)?.group;
  const alreadyPublished = submission.status === 'result_ready' && submission.scoreVisibleToStudent;
  const maxPoints = assignment?.maxPoints ?? 100;
  const normalizedTotal = submission.finalScore ?? submission.aiScore ?? 0;
  const scaledTotal = scaleWritingScore(normalizedTotal, maxPoints) ?? 0;

  const handleOverride = async (criterionId: string, newScore: number, reason: string) => {
    await applyTeacherOverride({ submissionId: submission.id, criterionId, newScore, reason, teacherId: teacher.id, teacherName: teacher.displayName });
    reload();
  };

  const handlePublish = async () => {
    if (alreadyPublished || publishing) return;
    setPublishing(true);
    try {
      await publishTeacherReview(submission.id, feedback, teacher.id);
      setPublishedNow(true);
      reload();
    } finally { setPublishing(false); }
  };

  const handleSaveDraft = async () => {
    await saveSubmissionDraft(submission.id, submission.text);
    reload();
  };

  if (submission.status === 'submitted' || submission.status === 'analyzing') {
    return <><PageHeader title={student?.displayName ?? ''} /><EmptyState title={t('submissionStatus.analyzing')} /></>;
  }

  if (submission.status === 'grading_failed') {
    return (
      <>
        <PageHeader title={student?.displayName ?? ''} />
        <EmptyState icon={<AlertCircle size={36} strokeWidth={1.5} color="var(--color-error)" aria-hidden="true" />} title={t('submissionStatus.gradingFailed')} action={<button type="button" className="btn btn--primary" onClick={async () => { await retryAiGrading(submission.id); reload(); }}>{t('submissionStatus.retry')}</button>} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={student?.displayName ?? ''}
        subtitle={`${assignment?.title ?? submission.topicTitle} · ${maxPoints} üzerinden`}
        actions={<><Link to={`/teacher/students/${submission.studentId}/portfolio`} className="btn btn--secondary">{t('nav.student.portfolio')}</Link><PdfExportButton onExport={() => exportSubmissionResultPdf({ submission, studentName: student?.displayName ?? '', schoolName: undefined, assignmentTitle: assignment?.title, locale: i18n.resolvedLanguage ?? 'tr', criterionLabel: (c) => c.criterionKey === 'required_vocabulary' ? 'Ünite / konu kelimeleri' : c.criterionKey === 'required_patterns' ? 'Zorunlu yazma kalıpları' : t(`rubric.criterion.${c.criterionKey}.name`) })} /></>}
      />

      <div className="card card--padded" style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <ScoreRing score={scaledTotal} maxScore={maxPoints} label={`${scaledTotal} / ${maxPoints}`} />
        <div style={{ flex: 1, minWidth: '16rem', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}><WritingTypeBadge writingTypeId={submission.writingTypeId} /><CefrLevelBadge level={submission.level} />{!submission.scoreVisibleToStudent && <span className="badge badge--warning">{t('submissionStatus.teacher_review_pending')}</span>}</div>
          <p className="field__hint">{formatDateTime(submission.submittedAt, i18n.resolvedLanguage ?? 'tr')} · {submission.wordCount} {t('common.words')}</p>
          {submission.aiScore !== undefined && <p className="field__hint">{t('rubric.aiSuggestedScore')}: {formatScaledScore(submission.aiScore, maxPoints)}</p>}
          {assignment?.vocabularyRequirements && <p className="field__hint"><strong>Hedef kelimeler:</strong> {assignment.vocabularyRequirements}</p>}
          {assignment?.patternRequirements && <p className="field__hint"><strong>Hedef kalıplar:</strong> {assignment.patternRequirements}</p>}
        </div>
      </div>

      <FeedbackTabs tabs={[
        { key: 'annotated', label: t('annotatedText.tabs.annotated'), content: submission.annotations.length === 0 ? <EmptyState title={t('annotatedText.noAnnotations')} /> : <div className="writing-editor-layout"><div className="writing-editor-layout__main card card--padded"><AnnotatedText text={submission.text} annotations={submission.annotations} selectedId={selected?.id} onSelect={setSelected} categoryGroupOf={categoryGroupOf} /></div>{!isMobile && <div className="writing-editor-layout__prompt card card--padded">{selected ? <ErrorDetailPanel annotation={selected} /> : <p className="field__hint">{t('annotatedText.selectAnnotationHint')}</p>}</div>}</div> },
        { key: 'scores', label: t('annotatedText.tabs.scoreBreakdown'), content: <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>{submission.usesCustomRubric && <p className="field__hint">{t('rubric.customRubricWarning')}</p>}{submission.criterionScores.map((c) => <CriterionScoreCard key={c.criterionId} criterion={c} showAiVsTeacher editable={!alreadyPublished} onOverride={(newScore, reason) => handleOverride(c.criterionId, newScore, reason)} />)}</div> },
        { key: 'recommendations', label: t('annotatedText.tabs.studyRecommendations'), content: submission.studyRecommendations.length === 0 ? <EmptyState title={t('states.empty.generic')} /> : <div className="card-grid">{submission.studyRecommendations.map((r) => <RecommendationCard key={r.id} recommendation={r} />)}</div> },
        { key: 'history', label: t('teacher.review.previousWork'), content: otherSubmissions.length === 0 ? <EmptyState title={t('states.empty.generic')} /> : <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>{otherSubmissions.map((s) => <Link key={s.id} to={`/teacher/submissions/${s.id}`} className="card card--padded card--interactive" style={{ display: 'flex', justifyContent: 'space-between' }}><span>{s.topicTitle}</span><span>{s.finalScore}/100</span></Link>)}</div> },
      ]} />

      <section className="card card--padded" style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <label className="field__label" htmlFor="teacher-feedback">{t('teacher.review.teacherFeedback')}</label>
        <textarea id="teacher-feedback" className="textarea-control" rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={t('teacher.review.feedbackPlaceholder')} disabled={alreadyPublished} />
        <p className="field__hint">{alreadyPublished ? t('teacher.review.publishedNote') : t('teacher.review.draftNote')}</p>
        {(publishedNow || alreadyPublished) && <div className="publish-success-notice" role="status"><CheckCircle2 size={17} aria-hidden="true" /><span>{t('teacher.review.publishedNote')}</span></div>}
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}><button type="button" className="btn btn--secondary" onClick={handleSaveDraft} disabled={alreadyPublished}>{t('teacher.review.saveDraft')}</button><button type="button" className="btn btn--primary" onClick={handlePublish} disabled={alreadyPublished || publishing}>{alreadyPublished ? t('submissionStatus.result_ready') : publishing ? t('common.loading') : t('teacher.review.publish')}</button></div>
      </section>

      {submission.teacherOverrides.length > 0 && <section style={{ marginTop: 'var(--space-6)' }}><p className="field__label" style={{ marginBottom: 'var(--space-3)' }}>{t('common.actions')}</p><AuditTimeline events={submission.teacherOverrides.map((o) => ({ id: o.id, label: `${t(`rubric.criterion.${submission.criterionScores.find((c) => c.criterionId === o.criterionId)?.criterionKey}.name`)}: ${o.originalAiScore} → ${o.finalScore}`, detail: o.reason, timestamp: o.timestamp }))} /></section>}
      {isMobile && <MobileBottomSheet open={!!selected} onClose={() => setSelected(null)} title={t('annotatedText.tabs.annotated')}>{selected && <ErrorDetailPanel annotation={selected} />}</MobileBottomSheet>}
    </>
  );
}
