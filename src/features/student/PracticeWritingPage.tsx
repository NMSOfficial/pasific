import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { Maximize2, Minimize2, CheckCircle2, HelpCircle } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import type { CatalogTopic, StudentProfile, Submission } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { WritingPromptPanel } from '../../components/WritingPromptPanel';
import { WordCounter, countWords } from '../../components/WordCounter';
import { AutosaveIndicator } from '../../components/AutosaveIndicator';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { useAutosave } from '../../utils/useAutosave';
import { formatDateTime } from '../../utils/format';
import { fetchCatalogTopic } from '../../services/contentData';
import { fetchSubmission, saveSubmissionDraft, submitSubmission } from '../../services/submissionData';

const GUIDED_QUESTIONS = [
  'Your opening does not clearly introduce both sides of the topic. What two effects will your essay discuss?',
  'Which sentence in this paragraph best supports your main idea? Could you add a specific example?',
  'How does this sentence connect back to your thesis? Try linking it more explicitly.',
  'Is there a more precise word you could use here instead of a very general one?',
];

export function PracticeWritingPage() {
  const { t, i18n } = useTranslation();
  const { submissionId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const student = user as StudentProfile;

  const navState = location.state as { topicId?: string; timerMinutes?: number } | null;

  const [submission, setSubmission] = useState<Submission | null | undefined>(undefined);
  const [topic, setTopic] = useState<CatalogTopic | undefined>(undefined);
  const [text, setText] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (!submissionId) return;
    fetchSubmission(submissionId).then((sub) => {
      setSubmission(sub);
      setText(sub?.text ?? '');
    });
    if (navState?.topicId) fetchCatalogTopic(navState.topicId).then((t2) => setTopic(t2 ?? undefined));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submissionId]);

  const { status, lastSavedAt } = useAutosave(text, (value) => { if (submission) void saveSubmissionDraft(submission.id, value); });

  if (submission === undefined) return <LoadingSkeleton height="12rem" />;
  if (!submission || submission.studentId !== student.id) return <Navigate to="/student/practice" replace />;

  const locked = !justSubmitted && submission.status !== 'not_started' && submission.status !== 'in_progress';
  if (locked) return <Navigate to={`/student/portfolio/${submission.id}`} replace />;

  const wordCount = countWords(text);

  if (justSubmitted) {
    return (
      <div className="card card--padded auth-success" style={{ maxWidth: '32rem', margin: '0 auto', textAlign: 'center' }}>
        <CheckCircle2 size={40} color="var(--color-success)" aria-hidden="true" />
        <h1 style={{ fontSize: 'var(--text-xl)' }}>{t('editor.submittedTitle')}</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>{t('editor.submittedDescription')}</p>
        <p className="field__hint">{formatDateTime(new Date().toISOString(), i18n.resolvedLanguage ?? 'tr')}</p>
        <Link to="/student/practice" className="btn btn--primary">{t('nav.student.practice')}</Link>
      </div>
    );
  }

  const handleSubmit = async () => {
    await saveSubmissionDraft(submission.id, text);
    setConfirmOpen(false);
    setJustSubmitted(true);
    void submitSubmission(submission.id);
  };

  const askForHint = () => {
    setHint(GUIDED_QUESTIONS[Math.floor(Math.random() * GUIDED_QUESTIONS.length)]);
  };

  return (
    <div className={fullscreen ? 'writing-editor--fullscreen' : ''}>
      {!fullscreen && <PageHeader title={submission.topicTitle} />}

      <div className="writing-editor-layout">
        <div className="writing-editor-layout__prompt">
          {topic ? (
            <WritingPromptPanel
              title={t('student.assignment.prompt')}
              prompt={topic.prompt}
              writingTypeId={topic.writingTypeId}
              level={topic.level}
              minWords={topic.minWords}
              maxWords={topic.maxWords}
              extra={
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <p className="field__hint">{t('practice.guidedAssistanceHint')}</p>
                  <button type="button" className="btn btn--secondary btn--sm" onClick={askForHint} style={{ alignSelf: 'flex-start' }}>
                    <HelpCircle size={14} aria-hidden="true" /> {t('practice.askForHint')}
                  </button>
                  {hint && <p style={{ fontSize: 'var(--text-sm)', fontStyle: 'italic', background: 'var(--color-primary-soft)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)' }}>{hint}</p>}
                </div>
              }
            />
          ) : (
            <div className="card card--padded">
              <p style={{ fontWeight: 'var(--weight-medium)' }}>{submission.topicTitle}</p>
            </div>
          )}
        </div>

        <div className="writing-editor-layout__main">
          <div className="writing-editor__toolbar">
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
              <WordCounter count={wordCount} min={topic?.minWords ?? 0} max={topic?.maxWords ?? 999} />
              <AutosaveIndicator status={status} />
              {lastSavedAt && <span className="field__hint">{t('editor.lastSaved', { time: formatDateTime(lastSavedAt, i18n.resolvedLanguage ?? 'tr') })}</span>}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button type="button" className="icon-btn" onClick={() => setFullscreen((v) => !v)} aria-label={fullscreen ? t('editor.exitFullscreen') : t('editor.fullscreen')}>
                {fullscreen ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
              </button>
            </div>
          </div>

          <label htmlFor="practice-textarea" className="visually-hidden">{submission.topicTitle}</label>
          <textarea
            id="practice-textarea"
            className="writing-editor__textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('editor.placeholder')}
            style={fullscreen ? { minHeight: 0 } : undefined}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
            <button type="button" className="btn btn--primary btn--lg" onClick={() => setConfirmOpen(true)}>
              {t('editor.submit')}
            </button>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        open={confirmOpen}
        title={t('editor.confirmTitle')}
        description={<p>{t('editor.confirmPoint3')}</p>}
        confirmLabel={t('editor.confirmSubmit')}
        onConfirm={handleSubmit}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
