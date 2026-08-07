import { useCallback, useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { CheckCircle2, RefreshCw, RotateCcw } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import type { StudentProfile, TeacherProfile } from '../../types/entities';
import type { ExamAppeal, ExamAttempt, ExamDefinition } from '../../types/assessment';
import { PageHeader } from '../../components/PageHeader';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { fetchStudent } from '../../services/teacherData';
import {
  approveExamAttempt,
  fetchExamAppeals,
  fetchExamAttempt,
  fetchExamDefinition,
  gradeExamAttempt,
  resolveExamAppeal,
  returnExamAttempt,
  setExamQuestionTeacherScore,
} from '../../services/assessmentData';

export function TeacherExamReviewPage() {
  const { examId, attemptId } = useParams();
  const { user } = useAuth();
  const teacher = user as TeacherProfile;
  const [attempt, setAttempt] = useState<ExamAttempt | null | undefined>(undefined);
  const [exam, setExam] = useState<ExamDefinition | null | undefined>(undefined);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [appeals, setAppeals] = useState<ExamAppeal[]>([]);
  const [feedback, setFeedback] = useState('');
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!attemptId || !examId) return;
    const [attemptRow, examRow, appealRows] = await Promise.all([
      fetchExamAttempt(attemptId),
      fetchExamDefinition(examId),
      fetchExamAppeals(attemptId),
    ]);
    setAttempt(attemptRow);
    setExam(examRow);
    setAppeals(appealRows);
    if (attemptRow) {
      setStudent(await fetchStudent(attemptRow.studentId));
      setFeedback(attemptRow.teacherFeedback ?? '');
      setFeedbackVisible(attemptRow.feedbackVisible || examRow?.feedbackVisibleDefault || false);
    }
  }, [attemptId, examId]);

  useEffect(() => { void reload(); }, [reload]);

  if (attempt === undefined || exam === undefined) return <LoadingSkeleton height="16rem" />;
  if (!attempt || !exam || attempt.examId !== exam.id) return <Navigate to="/teacher/assessment-hub" replace />;

  const finalScore = attempt.finalScore ?? attempt.aiScore ?? 0;
  const summary = typeof attempt.aiFeedback.summary === 'string' ? attempt.aiFeedback.summary : '';

  const overrideQuestion = async (questionId: string, score: number) => {
    setBusy(true);
    try {
      await setExamQuestionTeacherScore(questionId, score);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await approveExamAttempt({ attemptId: attempt.id, teacherId: teacher.id, feedback, feedbackVisible });
      setMessage('Sonuç onaylandı.');
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sonuç onaylanamadı.');
    } finally {
      setBusy(false);
    }
  };

  const sendBack = async () => {
    if (!returnReason.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      await returnExamAttempt(attempt.id, teacher.id, returnReason.trim());
      setMessage('Sınav geri gönderildi; öğrenciye sonuç açılmadı.');
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const retry = async () => {
    setBusy(true);
    try {
      await gradeExamAttempt(attempt.id);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const resolveAppeal = async (appeal: ExamAppeal, status: 'accepted' | 'rejected') => {
    const response = window.prompt('Öğrenciye gönderilecek kısa açıklama:')?.trim();
    if (!response) return;
    await resolveExamAppeal({ appealId: appeal.id, status, response, teacherId: teacher.id });
    await reload();
  };

  return (
    <>
      <PageHeader
        title={student?.displayName || 'Sınav sonucu'}
        subtitle={`${exam.title} · ${finalScore.toFixed(2).replace(/\.00$/, '')}/${exam.maxPoints}`}
        actions={<button type="button" className="btn btn--secondary" onClick={() => void reload()}><RefreshCw size={16} /> Yenile</button>}
      />

      {message && <div className="assessment-success-notice"><CheckCircle2 size={17} /> {message}</div>}

      <section className="card card--padded assessment-review-summary">
        <div>
          <span className={`badge ${attempt.status === 'approved' ? 'badge--success' : attempt.status === 'teacher_review_pending' ? 'badge--warning' : 'badge--neutral'}`}>
            {attempt.status === 'teacher_review_pending' ? 'Onay bekliyor' : attempt.status === 'approved' ? 'Onaylandı' : attempt.status}
          </span>
          <h2>{finalScore.toFixed(2).replace(/\.00$/, '')} / {exam.maxPoints}</h2>
          {attempt.aiScore !== undefined && <p className="field__hint">AI önerisi: {attempt.aiScore.toFixed(2).replace(/\.00$/, '')}/{exam.maxPoints}</p>}
        </div>
        <div style={{ flex: 1 }}>
          <strong>AI genel değerlendirmesi</strong>
          <p style={{ marginTop: 'var(--space-2)' }}>{summary || 'Genel özet üretilmedi.'}</p>
        </div>
      </section>

      {attempt.status === 'grading_failed' && (
        <button type="button" className="btn btn--primary" disabled={busy} onClick={retry}><RefreshCw size={16} /> AI puanlamayı tekrar dene</button>
      )}

      <section className="assessment-question-list">
        {attempt.questionScores.map((question, index) => (
          <article key={question.id} className="card card--padded assessment-question-card">
            <div className="assessment-question-card__head">
              <div><span className="field__hint">Soru {index + 1}</span><h3>{question.questionLabel}</h3></div>
              <div className="assessment-score-editor">
                <label htmlFor={`question-score-${question.id}`}>Puan</label>
                <input
                  id={`question-score-${question.id}`}
                  type="number"
                  className="input-control"
                  min={0}
                  max={question.maxScore}
                  step={0.25}
                  defaultValue={question.teacherScore ?? question.aiScore}
                  disabled={busy || attempt.status === 'approved'}
                  onBlur={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isFinite(value) && value !== (question.teacherScore ?? question.aiScore)) void overrideQuestion(question.id, value);
                  }}
                />
                <span>/ {question.maxScore.toFixed(2).replace(/\.00$/, '')}</span>
              </div>
            </div>
            <p>{question.explanation}</p>
            {question.evidenceQuote && <blockquote className="assessment-evidence-quote">“{question.evidenceQuote}”</blockquote>}
            {question.feedback && <div className="assessment-question-feedback"><strong>Öğrenci feedbacki:</strong> {question.feedback}</div>}
          </article>
        ))}
      </section>

      <section className="card card--padded assessment-form-section">
        <h2>OCR metni</h2>
        <p className="field__hint">AI'nın değerlendirdiği dolu sınav metni. OCR hatası görürsen puanı manuel düzelt veya sınavı yeniden tarat.</p>
        <pre className="ocr-text-preview">{attempt.ocrText}</pre>
      </section>

      <section className="card card--padded assessment-form-section">
        <h2>Öğretmen kararı</h2>
        <textarea className="textarea-control" rows={4} placeholder="Öğretmen geri bildirimi…" value={feedback} onChange={(event) => setFeedback(event.target.value)} disabled={attempt.status === 'approved'} />
        <label className="checkbox-row"><input type="checkbox" checked={feedbackVisible} onChange={(event) => setFeedbackVisible(event.target.checked)} disabled={attempt.status === 'approved'} /><span>Onaylandıktan sonra öğrenci AI açıklamalarını ve soru bazlı feedbacki görebilsin.</span></label>
        {attempt.status !== 'approved' && (
          <div className="assessment-review-actions">
            <button type="button" className="btn btn--primary btn--lg" disabled={busy || attempt.status === 'analyzing'} onClick={approve}><CheckCircle2 size={17} /> Sonucu onayla</button>
            <div className="assessment-return-group">
              <input className="input-control" value={returnReason} onChange={(event) => setReturnReason(event.target.value)} placeholder="Geri gönderme nedeni" />
              <button type="button" className="btn btn--secondary" disabled={busy || !returnReason.trim()} onClick={sendBack}><RotateCcw size={16} /> Geri gönder</button>
            </div>
          </div>
        )}
        {attempt.status === 'approved' && <div className="assessment-success-notice"><CheckCircle2 size={17} /> Sonuç yayınlandı. Öğrenci erişimi: {attempt.feedbackVisible ? 'açık' : 'kapalı'}.</div>}
      </section>

      {appeals.length > 0 && (
        <section className="card card--padded assessment-form-section">
          <h2>Öğrenci itirazları</h2>
          {appeals.map((appeal) => (
            <article key={appeal.id} className="assessment-appeal-card">
              <div><strong>{appeal.status === 'submitted' ? 'Yeni itiraz' : appeal.status}</strong><p>{appeal.reason}</p>{appeal.teacherResponse && <p className="field__hint">Yanıt: {appeal.teacherResponse}</p>}</div>
              {appeal.status === 'submitted' && <div style={{ display: 'flex', gap: 'var(--space-2)' }}><button type="button" className="btn btn--secondary btn--sm" onClick={() => resolveAppeal(appeal, 'rejected')}>Reddet</button><button type="button" className="btn btn--primary btn--sm" onClick={() => resolveAppeal(appeal, 'accepted')}>Kabul et</button></div>}
            </article>
          ))}
        </section>
      )}
    </>
  );
}
