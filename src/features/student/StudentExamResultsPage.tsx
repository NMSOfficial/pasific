import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquareText, Send } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import type { StudentProfile } from '../../types/entities';
import type { ExamAppeal, ExamAttempt, ExamDefinition } from '../../types/assessment';
import { PageHeader } from '../../components/PageHeader';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import {
  createExamAppeal,
  fetchExamAppeals,
  fetchExamDefinition,
  fetchStudentVisibleExamAttempts,
} from '../../services/assessmentData';

interface Row {
  attempt: ExamAttempt;
  exam: ExamDefinition | null;
  appeals: ExamAppeal[];
}

export function StudentExamResultsPage() {
  const { user } = useAuth();
  const student = user as StudentProfile;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [appealText, setAppealText] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = async () => {
    const attempts = await fetchStudentVisibleExamAttempts(student.id);
    const enriched = await Promise.all(attempts.map(async (attempt) => ({
      attempt,
      exam: await fetchExamDefinition(attempt.examId),
      appeals: await fetchExamAppeals(attempt.id),
    })));
    setRows(enriched);
  };

  useEffect(() => { void reload(); }, [student.id]);

  if (!rows) return <LoadingSkeleton height="14rem" />;

  const submitAppeal = async (attempt: ExamAttempt) => {
    const reason = appealText[attempt.id]?.trim();
    if (!reason || reason.length < 5) return;
    setSendingId(attempt.id);
    setMessage(null);
    try {
      await createExamAppeal(attempt.id, student.id, reason);
      setAppealText((current) => ({ ...current, [attempt.id]: '' }));
      setMessage('İtirazın öğretmene gönderildi.');
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'İtiraz gönderilemedi.');
    } finally {
      setSendingId(null);
    }
  };

  return (
    <>
      <PageHeader title="Sınav Sonuçları" subtitle="Öğretmenin yayınladığı sınav feedbacklerini ve soru bazlı değerlendirmeyi burada görebilirsin." />
      {message && <div className="card card--padded" style={{ marginBottom: 'var(--space-4)' }}>{message}</div>}

      {rows.length === 0 ? (
        <div className="card card--padded"><p>Henüz yayınlanmış bir sınav sonucun yok.</p><p className="field__hint">Öğretmen sonucu onaylayıp feedback erişimini açtığında burada görünecek.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {rows.map(({ attempt, exam, appeals }) => {
            const open = openId === attempt.id;
            const maxPoints = exam?.maxPoints ?? 100;
            const finalScore = attempt.finalScore ?? attempt.aiScore ?? 0;
            const hasOpenAppeal = appeals.some((appeal) => appeal.status === 'submitted' || appeal.status === 'reviewing');
            return (
              <article key={attempt.id} className="card student-exam-card">
                <button type="button" className="student-exam-card__head" onClick={() => setOpenId(open ? null : attempt.id)} aria-expanded={open}>
                  <div>
                    <strong>{exam?.title ?? 'Sınav'}</strong>
                    <span className="field__hint">{exam?.subject || 'Genel değerlendirme'}</span>
                  </div>
                  <div className="student-exam-card__score">
                    <strong>{finalScore.toFixed(2).replace(/\.00$/, '')}/{maxPoints}</strong>
                    {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {open && (
                  <div className="student-exam-card__body">
                    {attempt.teacherFeedback && <div className="assessment-question-feedback"><strong>Öğretmen feedbacki:</strong> {attempt.teacherFeedback}</div>}
                    {typeof attempt.aiFeedback.summary === 'string' && <div><h3>Genel değerlendirme</h3><p>{attempt.aiFeedback.summary}</p></div>}

                    <div className="assessment-question-list">
                      {attempt.questionScores.map((question, index) => (
                        <div key={question.id} className="assessment-question-card">
                          <div className="assessment-question-card__head"><div><span className="field__hint">Soru {index + 1}</span><strong>{question.questionLabel}</strong></div><strong>{(question.teacherScore ?? question.aiScore).toFixed(2).replace(/\.00$/, '')}/{question.maxScore.toFixed(2).replace(/\.00$/, '')}</strong></div>
                          <p>{question.explanation}</p>
                          {question.feedback && <p className="assessment-question-feedback">{question.feedback}</p>}
                          {question.evidenceQuote && <blockquote className="assessment-evidence-quote">“{question.evidenceQuote}”</blockquote>}
                        </div>
                      ))}
                    </div>

                    <section className="student-appeal-section">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><MessageSquareText size={17} /><h3>Sonuca itiraz</h3></div>
                      {appeals.map((appeal) => <div key={appeal.id} className="assessment-appeal-card"><div><strong>{appeal.status}</strong><p>{appeal.reason}</p>{appeal.teacherResponse && <p className="field__hint">Öğretmen yanıtı: {appeal.teacherResponse}</p>}</div></div>)}
                      {!hasOpenAppeal && (
                        <>
                          <textarea className="textarea-control" rows={3} value={appealText[attempt.id] ?? ''} onChange={(event) => setAppealText((current) => ({ ...current, [attempt.id]: event.target.value }))} placeholder="Hangi soru veya puanla ilgili neden yeniden inceleme istediğini açıkla…" />
                          <button type="button" className="btn btn--secondary" style={{ alignSelf: 'flex-start' }} disabled={(appealText[attempt.id]?.trim().length ?? 0) < 5 || sendingId === attempt.id} onClick={() => submitAppeal(attempt)}><Send size={15} /> İtirazı gönder</button>
                        </>
                      )}
                    </section>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
