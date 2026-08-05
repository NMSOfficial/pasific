import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Maximize2, Minimize2, WifiOff, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import type { Assignment, StudentProfile, Submission } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { WritingPromptPanel } from '../../components/WritingPromptPanel';
import { WordCounter, countWords } from '../../components/WordCounter';
import { AutosaveIndicator } from '../../components/AutosaveIndicator';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { useAutosave } from '../../utils/useAutosave';
import { formatDate, formatDateTime } from '../../utils/format';
import { fetchAssignment } from '../../services/assignmentData';
import { fetchSubmissionForAssignment, createDraftSubmission, saveSubmissionDraft, submitSubmission } from '../../services/submissionData';

export function WritingEditorPage() {
  const { t, i18n } = useTranslation();
  const { assignmentId } = useParams();
  const { user } = useAuth();
  const student = user as StudentProfile;

  const [assignment, setAssignment] = useState<Assignment | null | undefined>(undefined);
  const [submission, setSubmission] = useState<Submission | null | undefined>(undefined);
  const [text, setText] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  useEffect(() => {
    if (!assignmentId) return;
    fetchAssignment(assignmentId).then(async (a) => {
      setAssignment(a);
      if (!a) return;
      let sub = await fetchSubmissionForAssignment(a.id, student.id);
      if (!sub) {
        sub = await createDraftSubmission({
          assignmentId: a.id,
          isPractice: false,
          studentId: student.id,
          schoolId: student.schoolId,
          writingTypeId: a.writingTypeId,
          level: a.level,
          topicTitle: a.title,
          scoreVisibleToStudent: a.showAiScoreImmediately,
        });
      }
      setSubmission(sub);
      setText(sub.text);
    });
  }, [assignmentId, student.id, student.schoolId]);

  const { status, lastSavedAt } = useAutosave(text, (value) => { if (submission) void saveSubmissionDraft(submission.id, value); }, { simulateOffline });

  if (assignment === undefined || submission === undefined) return <LoadingSkeleton height="12rem" />;
  if (!assignment || !submission) return <Navigate to="/student/assignments" replace />;

  const locked = !justSubmitted && submission.status !== 'not_started' && submission.status !== 'in_progress';
  if (locked) return <Navigate to={`/student/submissions/${submission.id}/result`} replace />;

  const wordCount = countWords(text);

  if (justSubmitted) {
    return (
      <div className="card card--padded auth-success" style={{ maxWidth: '32rem', margin: '0 auto', textAlign: 'center' }}>
        <CheckCircle2 size={40} color="var(--color-success)" aria-hidden="true" />
        <h1 style={{ fontSize: 'var(--text-xl)' }}>{t('editor.submittedTitle')}</h1>
        <p style={{ color: 'var(--color-text-muted)' }}>{t('editor.submittedDescription')}</p>
        <p className="field__hint">{formatDateTime(new Date().toISOString(), i18n.resolvedLanguage ?? 'tr')}</p>
        <Link to="/student/assignments" className="btn btn--primary">{t('editor.backToAssignments')}</Link>
      </div>
    );
  }

  const handleSubmit = async () => {
    await saveSubmissionDraft(submission.id, text);
    setConfirmOpen(false);
    setJustSubmitted(true);
    void submitSubmission(submission.id);
  };

  return (
    <div className={fullscreen ? 'writing-editor--fullscreen' : ''}>
      {!fullscreen && <PageHeader title={assignment.title} />}

      <div className="writing-editor-layout">
        <div className="writing-editor-layout__prompt">
          <WritingPromptPanel
            title={t('student.assignment.prompt')}
            prompt={assignment.prompt}
            writingTypeId={assignment.writingTypeId}
            level={assignment.level}
            minWords={assignment.minWords}
            maxWords={assignment.maxWords}
            timeLimitMinutes={assignment.timeLimitMinutes}
            dueLabel={`${t('student.assignment.due')}: ${formatDate(assignment.dueAt, i18n.resolvedLanguage ?? 'tr')}`}
            rubric={assignment.rubric}
            extra={assignment.aiSupportMode !== 'none' && (
              <p className="field__hint">{t('aiSupportMode.' + assignment.aiSupportMode)}</p>
            )}
          />
        </div>

        <div className="writing-editor-layout__main">
          <div className="writing-editor__toolbar">
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
              <WordCounter count={wordCount} min={assignment.minWords} max={assignment.maxWords} />
              <AutosaveIndicator status={status} />
              {lastSavedAt && <span className="field__hint">{t('editor.lastSaved', { time: formatDateTime(lastSavedAt, i18n.resolvedLanguage ?? 'tr') })}</span>}
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setSimulateOffline((v) => !v)}
                aria-pressed={simulateOffline}
                title={t('editor.simulateOffline')}
              >
                <WifiOff size={16} aria-hidden="true" color={simulateOffline ? 'var(--color-error)' : undefined} />
              </button>
              <button type="button" className="icon-btn" onClick={() => setFullscreen((v) => !v)} aria-label={fullscreen ? t('editor.exitFullscreen') : t('editor.fullscreen')}>
                {fullscreen ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
              </button>
            </div>
          </div>

          <label htmlFor="writing-textarea" className="visually-hidden">{assignment.title}</label>
          <textarea
            id="writing-textarea"
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
        description={
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', listStyle: 'disc', paddingLeft: '1.25rem' }}>
            <li>{t('editor.confirmPoint1')}</li>
            <li>{t('editor.confirmPoint2')}</li>
            <li>{t('editor.confirmPoint3')}</li>
          </ul>
        }
        confirmLabel={t('editor.confirmSubmit')}
        onConfirm={handleSubmit}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
