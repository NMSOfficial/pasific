import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSearch, RefreshCw, Sparkles, UsersRound } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { DocumentImportControls } from '../../components/DocumentImportControls';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../state/AuthContext';
import type { DocumentImportItem, DocumentSourceMode, ExamAttempt, ExamDefinition } from '../../types/assessment';
import type { StudentProfile, TeacherProfile } from '../../types/entities';
import {
  createAndGradeExamItem,
  createExamDocumentBatch,
  createExamDocumentItem,
  fetchExamDefinition,
  fetchExamDocumentBatches,
  fetchExamDocumentItems,
  processExamDocumentItem,
  retryExamAttemptGrading,
} from '../../services/examWorkflowData';
import { fetchExamAttempts } from '../../services/assessmentData';
import { fetchStudentsByIds, fetchTeacherClasses } from '../../services/teacherData';
import { fileToBase64 } from '../../utils/documentImport';

function normalized(value?: string): string {
  return (value ?? '').toLocaleLowerCase('tr-TR').replace(/[^a-zçğıöşü0-9]+/gi, ' ').trim();
}

function guessStudent(item: DocumentImportItem, students: StudentProfile[]): string | undefined {
  const suggestion = normalized(item.suggestedStudentName || item.suggestedStudentIdentifier);
  if (!suggestion) return undefined;
  const candidates = students.filter((student) => {
    const name = normalized(student.displayName);
    const username = normalized(student.username);
    return name === suggestion || username === suggestion || (suggestion.length >= 4 && (name.includes(suggestion) || suggestion.includes(name)));
  });
  return candidates.length === 1 ? candidates[0]!.id : undefined;
}

function attemptLabel(status: ExamAttempt['status']): string {
  switch (status) {
    case 'grading_pending': return 'AI bekliyor';
    case 'analyzing': return 'AI puanlıyor';
    case 'teacher_review_pending': return 'Öğretmen onayı';
    case 'approved': return 'Onaylandı';
    case 'returned': return 'Geri gönderildi';
    case 'grading_failed': return 'Puanlama başarısız';
  }
}

function attemptBadge(status: ExamAttempt['status']): string {
  if (status === 'approved') return 'success';
  if (status === 'teacher_review_pending' || status === 'grading_pending' || status === 'analyzing') return 'warning';
  if (status === 'grading_failed') return 'error';
  return 'neutral';
}

export function TeacherExamGradingPage() {
  const { examId } = useParams();
  const { user } = useAuth();
  const teacher = user as TeacherProfile;
  const [exam, setExam] = useState<ExamDefinition | null | undefined>(undefined);
  const [students, setStudents] = useState<StudentProfile[] | null>(null);
  const [attempts, setAttempts] = useState<ExamAttempt[] | null>(null);
  const [batches, setBatches] = useState<Awaited<ReturnType<typeof fetchExamDocumentBatches>>>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [items, setItems] = useState<DocumentImportItem[]>([]);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadItems = useCallback(async (batchId: string, studentRows: StudentProfile[] = students ?? []) => {
    const rows = await fetchExamDocumentItems(batchId);
    setItems(rows);
    setMatches((current) => {
      const next = { ...current };
      for (const item of rows) {
        if (item.studentId) next[item.id] = item.studentId;
        else if (!next[item.id]) next[item.id] = guessStudent(item, studentRows) ?? '';
      }
      return next;
    });
  }, [students]);

  const reload = useCallback(async (preferredBatchId?: string) => {
    if (!examId) return;
    setMessage(null);
    const examRow = await fetchExamDefinition(examId);
    setExam(examRow);
    if (!examRow) {
      setStudents([]);
      setAttempts([]);
      return;
    }

    const [classRows, attemptRows, batchRows] = await Promise.all([
      fetchTeacherClasses(teacher.id),
      fetchExamAttempts(examId),
      fetchExamDocumentBatches(examId),
    ]);
    const scopedClasses = classRows.filter((item) => item.schoolId === examRow.schoolId);
    const studentIds = [...new Set(scopedClasses.flatMap((item) => item.studentIds))];
    const studentRows = (await fetchStudentsByIds(studentIds)).filter((student) => student.schoolId === examRow.schoolId);
    const attemptBatches = batchRows.filter((batch) => batch.kind === 'exam_attempt');

    setStudents(studentRows);
    setAttempts(attemptRows);
    setBatches(attemptBatches);

    const target = preferredBatchId && attemptBatches.some((batch) => batch.id === preferredBatchId)
      ? preferredBatchId
      : activeBatchId && attemptBatches.some((batch) => batch.id === activeBatchId)
        ? activeBatchId
        : attemptBatches[0]?.id;

    if (target) {
      setActiveBatchId(target);
      await loadItems(target, studentRows);
    } else {
      setActiveBatchId(null);
      setItems([]);
      setMatches({});
    }
  }, [activeBatchId, examId, loadItems, teacher.id]);

  useEffect(() => {
    void reload().catch((error) => {
      setExam(null);
      setStudents([]);
      setAttempts([]);
      setMessage(error instanceof Error ? error.message : 'Sınav çalışma alanı yüklenemedi.');
    });
    // reload intentionally owns the initial data load; active batch changes are handled explicitly below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId, teacher.id]);

  const importFiles = async (files: File[], mode: DocumentSourceMode) => {
    if (!exam) throw new Error('Sınav bulunamadı.');
    if (!exam.masterOcrText) throw new Error('Önce boş sınav kağıdını kurulum ekranında yükle.');
    const batch = await createExamDocumentBatch({
      schoolId: exam.schoolId,
      createdBy: teacher.id,
      examId: exam.id,
      kind: 'exam_attempt',
      sourceMode: mode,
      title: `${exam.title} · öğrenci kağıtları · ${new Date().toLocaleString('tr-TR')}`,
    });

    for (const file of files) {
      const item = await createExamDocumentItem({ batchId: batch.id, filename: file.name, mimeType: file.type });
      try {
        await processExamDocumentItem({ itemId: item.id, dataBase64: await fileToBase64(file), mimeType: file.type });
      } catch {
        // Server persists a safe failure state on the individual OCR item.
      }
    }
    setMatches({});
    await reload(batch.id);
  };

  const importCloud = async (url: string) => {
    if (!exam) throw new Error('Sınav bulunamadı.');
    if (!exam.masterOcrText) throw new Error('Önce boş sınav kağıdını kurulum ekranında yükle.');
    const batch = await createExamDocumentBatch({
      schoolId: exam.schoolId,
      createdBy: teacher.id,
      examId: exam.id,
      kind: 'exam_attempt',
      sourceMode: 'cloud_url',
      title: `${exam.title} · bulut öğrenci kağıdı`,
    });
    const item = await createExamDocumentItem({ batchId: batch.id, filename: 'student-exam-cloud', mimeType: 'application/octet-stream' });
    await processExamDocumentItem({ itemId: item.id, sourceUrl: url });
    setMatches({});
    await reload(batch.id);
  };

  const attemptsById = useMemo(() => new Map((attempts ?? []).map((attempt) => [attempt.id, attempt])), [attempts]);

  const gradeItem = async (item: DocumentImportItem) => {
    if (!exam) return;
    const studentId = matches[item.id];
    if (!studentId) return;
    setBusyItem(item.id);
    setMessage(null);
    try {
      const linked = item.linkedExamAttemptId ? attemptsById.get(item.linkedExamAttemptId) : undefined;
      if (linked) {
        if (!['grading_pending', 'grading_failed'].includes(linked.status)) return;
        await retryExamAttemptGrading(linked.id);
      } else {
        await createAndGradeExamItem({ itemId: item.id, examId: exam.id, studentId });
      }
      setMessage('AI puanlaması tamamlandı. Sonuç öğretmen onayına gönderildi.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'AI puanlaması tamamlanamadı.');
    } finally {
      await reload(activeBatchId ?? undefined).catch(() => undefined);
      setBusyItem(null);
    }
  };

  const bulkGrade = async () => {
    if (!exam) return;
    const candidates = items.filter((item) => {
      if (item.ocrStatus !== 'ready' || !matches[item.id]) return false;
      const attempt = item.linkedExamAttemptId ? attemptsById.get(item.linkedExamAttemptId) : undefined;
      return !attempt || attempt.status === 'grading_pending' || attempt.status === 'grading_failed';
    });
    if (!candidates.length) return;

    setBulkBusy(true);
    setMessage(null);
    let succeeded = 0;
    let failed = 0;
    for (const item of candidates) {
      setBusyItem(item.id);
      try {
        const attempt = item.linkedExamAttemptId ? attemptsById.get(item.linkedExamAttemptId) : undefined;
        if (attempt) await retryExamAttemptGrading(attempt.id);
        else await createAndGradeExamItem({ itemId: item.id, examId: exam.id, studentId: matches[item.id]! });
        succeeded += 1;
      } catch {
        failed += 1;
      }
      await reload(activeBatchId ?? undefined).catch(() => undefined);
    }
    setBusyItem(null);
    setBulkBusy(false);
    setMessage(`${succeeded} kağıt AI ile puanlandı${failed ? `, ${failed} kağıtta hata oluştu` : ''}.`);
  };

  if (exam === undefined || students === null || attempts === null) return <LoadingSkeleton height="20rem" />;
  if (!exam || !examId) return <Navigate to="/teacher/exams" replace />;
  if (!exam.masterOcrText) return <Navigate to={`/teacher/exams/${exam.id}/setup`} replace />;

  const stats = {
    review: attempts.filter((attempt) => attempt.status === 'teacher_review_pending').length,
    approved: attempts.filter((attempt) => attempt.status === 'approved').length,
    failed: attempts.filter((attempt) => attempt.status === 'grading_failed').length,
    analyzing: attempts.filter((attempt) => attempt.status === 'analyzing' || attempt.status === 'grading_pending').length,
  };
  const bulkCount = items.filter((item) => {
    if (item.ocrStatus !== 'ready' || !matches[item.id]) return false;
    const attempt = item.linkedExamAttemptId ? attemptsById.get(item.linkedExamAttemptId) : undefined;
    return !attempt || attempt.status === 'grading_pending' || attempt.status === 'grading_failed';
  }).length;

  return (
    <>
      <PageHeader
        title={exam.title}
        subtitle={`Aşama 2/3 · Öğrenci kağıtlarını OCR ile oku, öğrenciyle eşleştir ve AI'ya puanlat. ${exam.maxPoints} üzerinden.`}
        actions={<div className="exam-page-actions"><Link className="btn btn--secondary" to={`/teacher/exams/${exam.id}/setup`}>Sınav kurulumu</Link><Link className="btn btn--secondary" to="/teacher/exams">Tüm sınavlar</Link></div>}
      />

      <section className="exam-grading-summary">
        <div><CheckCircle2 size={18} /><span><strong>Boş sınav hazır</strong><small>AI soru yapısını buradan alır</small></span></div>
        <div className={exam.answerKeyOcrText ? 'is-ready' : ''}><Sparkles size={18} /><span><strong>Cevap anahtarı</strong><small>{exam.answerKeyOcrText ? 'Karşılaştırmaya dahil' : 'Yüklenmedi · opsiyonel'}</small></span></div>
        <div><UsersRound size={18} /><span><strong>{students.length} öğrenci</strong><small>Öğretmenin bu okuldaki sınıflarında</small></span></div>
      </section>

      <section className="exam-stat-grid">
        <div className="card card--padded"><strong>{stats.analyzing}</strong><span>AI sırasında</span></div>
        <div className="card card--padded"><strong>{stats.review}</strong><span>Onay bekliyor</span></div>
        <div className="card card--padded"><strong>{stats.approved}</strong><span>Onaylandı</span></div>
        <div className="card card--padded"><strong>{stats.failed}</strong><span>Tekrar denenmeli</span></div>
      </section>

      <section className="card card--padded assessment-form-section">
        <div className="exam-section-heading"><span className="exam-step-number">1</span><div><h2>Dolu öğrenci kağıtlarını yükle</h2><p className="field__hint">Her öğrenci için tek fotoğraf/PDF ya da çok sayfalı tek PDF kullan. Birden fazla öğrenciyi toplu seçebilirsin.</p></div></div>
        <DocumentImportControls onFiles={importFiles} onCloudUrl={importCloud} />
      </section>

      {batches.length > 0 && (
        <section className="card card--padded assessment-form-section">
          <div className="exam-section-heading"><span className="exam-step-number">2</span><div><h2>Yükleme grubunu seç</h2><p className="field__hint">Sayfa yenilense de önceki yüklemeler burada kalır.</p></div></div>
          <select className="select-control" value={activeBatchId ?? ''} onChange={(event) => {
            const id = event.target.value;
            setActiveBatchId(id);
            setMatches({});
            void loadItems(id).catch((error) => setMessage(error instanceof Error ? error.message : 'Belgeler yüklenemedi.'));
          }}>
            {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.title} · {new Date(batch.createdAt).toLocaleString('tr-TR')}</option>)}
          </select>
        </section>
      )}

      {message && <div className="exam-workflow-message">{message}</div>}

      {items.length > 0 && (
        <section className="card card--padded assessment-form-section">
          <div className="exam-paper-list-heading">
            <div className="exam-section-heading"><span className="exam-step-number">3</span><div><h2>Öğrenciyi doğrula ve AI puanlamasını başlat</h2><p className="field__hint">OCR isim tahmini yalnızca öneridir. Puanlama öncesi öğrenciyi öğretmen doğrular.</p></div></div>
            <button type="button" className="btn btn--primary" disabled={!bulkCount || bulkBusy || Boolean(busyItem)} onClick={bulkGrade}><Sparkles size={16} /> Hazır {bulkCount} kağıdı AI ile puanla</button>
          </div>

          <div className="exam-paper-list">
            {items.map((item) => {
              const attempt = item.linkedExamAttemptId ? attemptsById.get(item.linkedExamAttemptId) : undefined;
              const isBusy = busyItem === item.id;
              const canSelect = item.ocrStatus === 'ready' && !item.linkedExamAttemptId;
              return (
                <article key={item.id} className={`exam-paper-card ${attempt?.status === 'grading_failed' ? 'has-error' : ''}`}>
                  <div className="exam-paper-card__top">
                    <div><strong>{item.originalFilename}</strong><small>OCR: {item.ocrStatus === 'ready' ? 'hazır' : item.ocrStatus} · {item.pageCount ?? 0} sayfa {item.confidence !== undefined ? `· güven %${Math.round(item.confidence * 100)}` : ''}</small></div>
                    {attempt ? <span className={`badge badge--${attemptBadge(attempt.status)}`}>{attemptLabel(attempt.status)}</span> : <span className={`badge ${item.ocrStatus === 'ready' ? 'badge--neutral' : item.ocrStatus === 'failed' ? 'badge--error' : 'badge--warning'}`}>{item.ocrStatus === 'ready' ? 'Eşleştirme bekliyor' : item.ocrStatus}</span>}
                  </div>

                  {item.suggestedStudentName && <div className="exam-ocr-suggestion">OCR isim önerisi: <strong>{item.suggestedStudentName}</strong></div>}
                  {item.errorMessage && <div className="field__error"><AlertTriangle size={15} /> {item.errorMessage}</div>}

                  <div className="exam-paper-card__actions">
                    <select className="select-control" value={matches[item.id] ?? item.studentId ?? ''} disabled={!canSelect || isBusy || bulkBusy} onChange={(event) => setMatches((current) => ({ ...current, [item.id]: event.target.value }))}>
                      <option value="">Öğrenci seç…</option>
                      {students.map((student) => <option key={student.id} value={student.id}>{student.displayName} · @{student.username}</option>)}
                    </select>

                    {!attempt && <button type="button" className="btn btn--primary" disabled={item.ocrStatus !== 'ready' || !matches[item.id] || isBusy || bulkBusy} onClick={() => gradeItem(item)}><FileSearch size={16} /> {isBusy ? 'AI puanlıyor…' : 'Eşleştir ve AI puanla'}</button>}
                    {attempt && ['grading_pending', 'grading_failed'].includes(attempt.status) && <button type="button" className="btn btn--primary" disabled={isBusy || bulkBusy} onClick={() => gradeItem(item)}><RefreshCw size={16} /> {isBusy ? 'AI puanlıyor…' : attempt.status === 'grading_failed' ? 'AI puanlamayı tekrar dene' : 'AI puanlamayı başlat'}</button>}
                    {attempt?.status === 'analyzing' && <button type="button" className="btn btn--secondary" disabled><RefreshCw className="spin" size={16} /> AI puanlıyor…</button>}
                    {attempt && ['teacher_review_pending', 'approved', 'returned'].includes(attempt.status) && <Link className="btn btn--secondary" to={`/teacher/exams/${exam.id}/attempts/${attempt.id}`}>{attempt.status === 'teacher_review_pending' ? 'Puanı incele ve onayla' : 'Sonucu aç'}</Link>}
                  </div>

                  {attempt?.status === 'teacher_review_pending' && <div className="exam-paper-score-preview"><strong>AI önerisi: {attempt.aiScore?.toFixed(2).replace(/\.00$/, '') ?? '—'} / {exam.maxPoints}</strong><span>Öğrenci bu sonucu henüz görmüyor.</span></div>}
                  {item.ocrText && <details><summary>OCR metnini kontrol et</summary><pre className="ocr-text-preview">{item.ocrText}</pre></details>}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {stats.review > 0 && (
        <section className="exam-review-callout">
          <div><CheckCircle2 size={21} /><div><strong>{stats.review} sonuç öğretmen onayı bekliyor</strong><small>AI puanları öğrenciye yayınlanmadan önce soru soru inceleyebilirsin.</small></div></div>
        </section>
      )}
    </>
  );
}
