import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { Maximize2, Minimize2, WifiOff, CheckCircle2, HelpCircle } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import { useMockState, mockStore } from '../../mock/useMockStore';
import { getSubmission } from '../../mock/selectors';
import type { StudentProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { WritingPromptPanel } from '../../components/WritingPromptPanel';
import { WordCounter, countWords } from '../../components/WordCounter';
import { AutosaveIndicator } from '../../components/AutosaveIndicator';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { useAutosave } from '../../utils/useAutosave';
import { formatDateTime } from '../../utils/format';

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
  const state = useMockState();
  const student = user as StudentProfile;

  const submission = submissionId ? getSubmission(state, submissionId) : undefined;
  const navState = location.state as { topicId?: string; timerMinutes?: number } | null;
  const topic = navState?.topicId ? state.catalogTopics.find((t2) => t2.id === navState.topicId) : undefined;

  const [text, setText] = useState(submission?.text ?? '');
  const [fullscreen, setFullscreen] = useState(false);
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const { status, lastSavedAt } = useAutosave(text, (value) => submission && mockStore.saveSubmissionDraft(submission.id, value), { simulateOffline });

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
        <p className="field__hint">{formatDateTime(submission.submittedAt, i18n.resolvedLanguage ?? 'tr')}</p>
        <Link to="/student/practice" className="btn btn--primary">{t('nav.student.practice')}</Link>
      </div>
    );
  }

  const handleSubmit = () => {
    mockStore.saveSubmissionDraft(submission.id, text);
    mockStore.submitSubmission(submission.id);
    setConfirmOpen(false);
    setJustSubmitted(true);
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
              <button type="button" className="icon-btn" onClick={() => setSimulateOffline((v) => !v)} aria-pressed={simulateOffline} title={t('editor.simulateOffline')}>
                <WifiOff size={16} aria-hidden="true" color={simulateOffline ? 'var(--color-error)' : undefined} />
              </button>
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
