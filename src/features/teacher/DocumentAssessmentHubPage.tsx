import { useCallback, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, FileCheck2, FileSearch, RefreshCw, ScanText } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import type { Assignment, StudentProfile, TeacherProfile } from '../../types/entities';
import type { DocumentImportBatch, DocumentImportItem, DocumentSourceMode, ExamDefinition } from '../../types/assessment';
import { PageHeader } from '../../components/PageHeader';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { DocumentImportControls } from '../../components/DocumentImportControls';
import { fetchAssignmentsForTeacher } from '../../services/assignmentData';
import { fetchTeacherClasses, fetchStudentsByIds } from '../../services/teacherData';
import { fetchSchoolScopeOptions, type SchoolScopeOption } from '../../services/schoolScopeData';
import {
  createAndGradeOcrWriting,
  createDocumentBatch,
  createDocumentItem,
  createExamAttemptFromItem,
  createExamDefinition,
  fetchDocumentBatches,
  fetchDocumentItems,
  fetchExamDefinitions,
  gradeExamAttempt,
  processDocumentItem,
} from '../../services/assessmentData';
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
    return name === suggestion || username === suggestion || name.includes(suggestion) || suggestion.includes(name);
  });
  return candidates.length === 1 ? candidates[0].id : undefined;
}

function batchLabel(batch: DocumentImportBatch): string {
  const created = new Date(batch.createdAt);
  const date = Number.isNaN(created.getTime()) ? '' : ` · ${created.toLocaleString('tr-TR')}`;
  return `${batch.title}${date}`;
}

export function DocumentAssessmentHubPage() {
  const { user } = useAuth();
  const teacher = user as TeacherProfile;
  const [schoolId, setSchoolId] = useState(teacher.schoolIds[0] ?? '');
  const [schoolOptions, setSchoolOptions] = useState<SchoolScopeOption[] | null>(null);
  const [tab, setTab] = useState<'writing' | 'exam'>('writing');
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [students, setStudents] = useState<StudentProfile[] | null>(null);
  const [exams, setExams] = useState<ExamDefinition[] | null>(null);
  const [baseError, setBaseError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchSchoolScopeOptions(teacher.schoolIds)
      .then((rows) => {
        if (cancelled) return;
        setSchoolOptions(rows);
        if (!schoolId && rows[0]) setSchoolId(rows[0].id);
      })
      .catch((error) => {
        if (!cancelled) setBaseError(error instanceof Error ? error.message : 'Okullar yüklenemedi.');
      });
    return () => { cancelled = true; };
  }, [teacher.schoolIds, schoolId]);

  const reloadBase = useCallback(async () => {
    if (!schoolId) return;
    setBaseError(null);
    const [assignmentRows, classRows, examRows] = await Promise.all([
      fetchAssignmentsForTeacher(teacher.id),
      fetchTeacherClasses(teacher.id),
      fetchExamDefinitions(schoolId),
    ]);
    const scopedClasses = classRows.filter((item) => item.schoolId === schoolId);
    const ids = [...new Set(scopedClasses.flatMap((item) => item.studentIds))];
    const studentRows = await fetchStudentsByIds(ids);
    setAssignments(assignmentRows.filter((assignment) => assignment.schoolId === schoolId && assignment.status === 'published'));
    setStudents(studentRows.filter((student) => student.schoolId === schoolId));
    setExams(examRows.filter((exam) => exam.schoolId === schoolId));
  }, [schoolId, teacher.id]);

  useEffect(() => {
    setAssignments(null);
    setStudents(null);
    setExams(null);
    if (!schoolId) return;
    void reloadBase().catch((error) => {
      setBaseError(error instanceof Error ? error.message : 'Belge merkezi yüklenemedi.');
      setAssignments([]);
      setStudents([]);
      setExams([]);
    });
  }, [reloadBase, schoolId]);

  if (!schoolId && schoolOptions?.length === 0) {
    return <div className="card card--padded"><p>Bu öğretmen hesabına bağlı bir okul bulunamadı.</p></div>;
  }
  if (!assignments || !students || !exams || !schoolOptions) return <LoadingSkeleton height="16rem" />;

  return (
    <>
      <PageHeader title="Belge & Sınav Okuma" subtitle="El yazısı writingleri ve genel sınavları OCR + AI + öğretmen onayı akışında işle." />

      {schoolOptions.length > 1 && (
        <section className="card card--padded" style={{ marginBottom: 'var(--space-4)' }}>
          <label className="field">
            <span className="field__label">Aktif okul</span>
            <select className="select-control" value={schoolId} onChange={(event) => setSchoolId(event.target.value)}>
              {schoolOptions.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
            </select>
          </label>
        </section>
      )}

      {baseError && <p className="field__error" style={{ marginBottom: 'var(--space-4)' }}>{baseError}</p>}

      <div className="segmented-control" style={{ marginBottom: 'var(--space-6)' }}>
        <button type="button" className={`segmented-control__option ${tab === 'writing' ? 'is-active' : ''}`} onClick={() => setTab('writing')}><ScanText size={15} /> Writing OCR</button>
        <button type="button" className={`segmented-control__option ${tab === 'exam' ? 'is-active' : ''}`} onClick={() => setTab('exam')}><FileCheck2 size={15} /> Genel sınav</button>
      </div>

      {tab === 'writing'
        ? <WritingOcrWorkspace key={`writing-${schoolId}`} schoolId={schoolId} teacher={teacher} assignments={assignments} allStudents={students} />
        : <ExamWorkspace key={`exam-${schoolId}`} schoolId={schoolId} teacher={teacher} exams={exams} allStudents={students} onExamCreated={reloadBase} />}
    </>
  );
}

function WritingOcrWorkspace({ schoolId, teacher, assignments, allStudents }: {
  schoolId: string;
  teacher: TeacherProfile;
  assignments: Assignment[];
  allStudents: StudentProfile[];
}) {
  const navigate = useNavigate();
  const [assignmentId, setAssignmentId] = useState(assignments[0]?.id ?? '');
  const [batches, setBatches] = useState<DocumentImportBatch[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [items, setItems] = useState<DocumentImportItem[]>([]);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const assignment = assignments.find((item) => item.id === assignmentId);

  useEffect(() => {
    if (!assignmentId && assignments[0]) setAssignmentId(assignments[0].id);
  }, [assignmentId, assignments]);

  const eligibleStudents = useMemo(() => {
    if (!assignment) return [];
    return allStudents.filter((student) => student.classIds.some((classId) => assignment.classIds.includes(classId)));
  }, [assignment, allStudents]);

  const loadItems = useCallback(async (batchId: string) => {
    const rows = await fetchDocumentItems(batchId);
    setItems(rows);
    setMatches((current) => {
      const next = { ...current };
      for (const item of rows) next[item.id] ||= guessStudent(item, eligibleStudents) ?? '';
      return next;
    });
  }, [eligibleStudents]);

  const refreshBatches = useCallback(async (preferredBatchId?: string) => {
    if (!assignmentId) {
      setBatches([]);
      setActiveBatchId(null);
      setItems([]);
      return;
    }
    const rows = await fetchDocumentBatches(schoolId, 'writing');
    const relevant = rows.filter((batch) => batch.assignmentId === assignmentId).slice(0, 30);
    setBatches(relevant);
    const targetId = preferredBatchId && relevant.some((batch) => batch.id === preferredBatchId)
      ? preferredBatchId
      : relevant[0]?.id;
    if (!targetId) {
      setActiveBatchId(null);
      setItems([]);
      setMatches({});
      return;
    }
    setActiveBatchId(targetId);
    setMatches({});
    await loadItems(targetId);
  }, [assignmentId, loadItems, schoolId]);

  useEffect(() => {
    setMessage(null);
    setMatches({});
    void refreshBatches().catch((error) => setMessage(error instanceof Error ? error.message : 'Önceki yüklemeler alınamadı.'));
  }, [refreshBatches]);

  const importFiles = async (files: File[], mode: DocumentSourceMode) => {
    if (!assignment) throw new Error('Önce bir writing ödevi seç.');
    setMessage(null);
    const batch = await createDocumentBatch({
      schoolId,
      createdBy: teacher.id,
      kind: 'writing',
      assignmentId: assignment.id,
      title: `${assignment.title} · ${new Date().toLocaleString('tr-TR')}`,
      sourceMode: mode,
    });
    for (const file of files) {
      const item = await createDocumentItem({ batchId: batch.id, filename: file.name, mimeType: file.type });
      try {
        await processDocumentItem({ itemId: item.id, dataBase64: await fileToBase64(file), mimeType: file.type });
      } catch {
        // Failure state is persisted on the item and shown after refresh.
      }
      await loadItems(batch.id);
    }
    await refreshBatches(batch.id);
  };

  const importCloud = async (url: string) => {
    if (!assignment) throw new Error('Önce bir writing ödevi seç.');
    setMessage(null);
    const batch = await createDocumentBatch({
      schoolId,
      createdBy: teacher.id,
      kind: 'writing',
      assignmentId: assignment.id,
      title: `${assignment.title} · Cloud import`,
      sourceMode: 'cloud_url',
    });
    const item = await createDocumentItem({ batchId: batch.id, filename: 'cloud-document', mimeType: 'application/octet-stream', sourceUrl: url });
    try {
      await processDocumentItem({ itemId: item.id, sourceUrl: url });
    } finally {
      await refreshBatches(batch.id);
    }
  };

  const gradeItem = async (item: DocumentImportItem) => {
    const studentId = matches[item.id];
    if (!assignment || !studentId) return;
    setBusyItem(item.id);
    setMessage(null);
    try {
      const submissionId = await createAndGradeOcrWriting(item.id, assignment.id, studentId);
      await loadItems(item.batchId);
      navigate(`/teacher/submissions/${submissionId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Writing puanlandırılamadı.');
      if (activeBatchId) await loadItems(activeBatchId).catch(() => undefined);
    } finally {
      setBusyItem(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <section className="card card--padded assessment-form-section">
        <h2>1. Writing ödevini seç</h2>
        {assignments.length === 0 ? (
          <p className="field__hint">Bu okulda yayınlanmış bir writing ödevi yok.</p>
        ) : (
          <select className="select-control" value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)}>
            {assignments.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.level}</option>)}
          </select>
        )}
        {assignment && <p className="field__hint">Sadece bu ödevin bağlı olduğu sınıflardaki öğrenciler eşleştirilebilir.</p>}
      </section>

      <section className="card card--padded assessment-form-section">
        <h2>2. Kağıtları içeri al</h2>
        <p className="field__hint">Her fotoğraf/PDF ayrı bir öğrenci belgesi olmalı. Çok sayfalı bir öğrenciyi tek PDF olarak vermek en güvenli yöntemdir.</p>
        <DocumentImportControls disabled={!assignment} onFiles={importFiles} onCloudUrl={importCloud} />
      </section>

      {batches.length > 0 && (
        <section className="card card--padded assessment-form-section">
          <label className="field">
            <span className="field__label">Son OCR yüklemeleri</span>
            <select
              className="select-control"
              value={activeBatchId ?? ''}
              onChange={(event) => {
                const nextId = event.target.value;
                setActiveBatchId(nextId);
                setMatches({});
                void loadItems(nextId).catch((error) => setMessage(error instanceof Error ? error.message : 'Yükleme açılamadı.'));
              }}
            >
              {batches.map((batch) => <option key={batch.id} value={batch.id}>{batchLabel(batch)}</option>)}
            </select>
          </label>
          <p className="field__hint">Sayfayı yenilesen veya daha sonra geri gelsen de son 30 yükleme buradan devam ettirilebilir.</p>
        </section>
      )}

      {message && <p className="field__error">{message}</p>}
      {items.length > 0 && (
        <OcrReviewList
          title="3. Öğrenciyi doğrula ve AI'ya gönder"
          description="OCR isim önerisi yalnızca yardımcıdır; son eşleştirme öğretmene aittir."
          items={items}
          students={eligibleStudents}
          matches={matches}
          setMatches={setMatches}
          activeBatchId={activeBatchId}
          loadItems={loadItems}
          busyItem={busyItem}
          action={(item) => item.linkedSubmissionId
            ? <Link className="btn btn--secondary" to={`/teacher/submissions/${item.linkedSubmissionId}`}>Puanı incele</Link>
            : <button type="button" className="btn btn--primary" disabled={item.ocrStatus !== 'ready' || !matches[item.id] || busyItem === item.id} onClick={() => gradeItem(item)}><FileSearch size={16} /> AI puanla</button>}
        />
      )}
    </div>
  );
}

function ExamWorkspace({ schoolId, teacher, exams, allStudents, onExamCreated }: {
  schoolId: string;
  teacher: TeacherProfile;
  exams: ExamDefinition[];
  allStudents: StudentProfile[];
  onExamCreated: () => Promise<void>;
}) {
  const [examId, setExamId] = useState(exams[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [maxPoints, setMaxPoints] = useState(100);
  const [scoringNotes, setScoringNotes] = useState('');
  const [feedbackVisibleDefault, setFeedbackVisibleDefault] = useState(false);
  const [creating, setCreating] = useState(false);
  const [batches, setBatches] = useState<DocumentImportBatch[]>([]);
  const [items, setItems] = useState<DocumentImportItem[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const exam = exams.find((item) => item.id === examId);

  useEffect(() => {
    if (!examId && exams[0]) setExamId(exams[0].id);
    if (examId && !exams.some((candidate) => candidate.id === examId)) setExamId(exams[0]?.id ?? '');
  }, [exams, examId]);

  const loadItems = useCallback(async (batchId: string) => {
    const rows = await fetchDocumentItems(batchId);
    setItems(rows);
    setMatches((current) => {
      const next = { ...current };
      for (const item of rows) next[item.id] ||= guessStudent(item, allStudents) ?? '';
      return next;
    });
  }, [allStudents]);

  const refreshBatches = useCallback(async (preferredBatchId?: string) => {
    if (!exam) {
      setBatches([]);
      setActiveBatchId(null);
      setItems([]);
      return;
    }
    const rows = await fetchDocumentBatches(schoolId);
    const desiredKind = exam.masterOcrText ? 'exam_attempt' : 'exam_template';
    const relevant = rows.filter((batch) => batch.examId === exam.id && batch.kind === desiredKind).slice(0, 30);
    setBatches(relevant);
    const targetId = preferredBatchId && relevant.some((batch) => batch.id === preferredBatchId)
      ? preferredBatchId
      : relevant[0]?.id;
    if (!targetId) {
      setActiveBatchId(null);
      setItems([]);
      setMatches({});
      return;
    }
    setActiveBatchId(targetId);
    setMatches({});
    await loadItems(targetId);
  }, [exam, loadItems, schoolId]);

  useEffect(() => {
    setMessage(null);
    setMatches({});
    void refreshBatches().catch((error) => setMessage(error instanceof Error ? error.message : 'Önceki yüklemeler alınamadı.'));
  }, [refreshBatches]);

  const createExam = async () => {
    if (!title.trim() || !Number.isFinite(maxPoints) || maxPoints < 1 || maxPoints > 1000) return;
    setCreating(true);
    setMessage(null);
    try {
      const created = await createExamDefinition({
        schoolId,
        title: title.trim(),
        subject: subject.trim() || undefined,
        maxPoints,
        scoringNotes: scoringNotes.trim() || undefined,
        sharedWithSchool: true,
        feedbackVisibleDefault,
        createdBy: teacher.id,
      });
      await onExamCreated();
      setExamId(created.id);
      setTitle('');
      setSubject('');
      setScoringNotes('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sınav oluşturulamadı.');
    } finally {
      setCreating(false);
    }
  };

  const importForExam = async (files: File[], mode: DocumentSourceMode, kind: 'exam_template' | 'exam_attempt') => {
    if (!exam) throw new Error('Önce sınav seç.');
    setMessage(null);
    const batch = await createDocumentBatch({
      schoolId,
      createdBy: teacher.id,
      kind,
      examId: exam.id,
      title: `${exam.title} · ${kind === 'exam_template' ? 'boş sınav' : 'öğrenci sınavları'}`,
      sourceMode: mode,
    });
    for (const file of files) {
      const item = await createDocumentItem({ batchId: batch.id, filename: file.name, mimeType: file.type });
      try {
        await processDocumentItem({ itemId: item.id, dataBase64: await fileToBase64(file), mimeType: file.type });
      } catch {
        // Failure state is persisted on the item and shown after refresh.
      }
      await loadItems(batch.id);
      if (kind === 'exam_template') await onExamCreated();
    }
    await refreshBatches(batch.id);
  };

  const cloudForExam = async (url: string, kind: 'exam_template' | 'exam_attempt') => {
    if (!exam) throw new Error('Önce sınav seç.');
    setMessage(null);
    const batch = await createDocumentBatch({
      schoolId,
      createdBy: teacher.id,
      kind,
      examId: exam.id,
      title: `${exam.title} · Cloud`,
      sourceMode: 'cloud_url',
    });
    const item = await createDocumentItem({ batchId: batch.id, filename: 'cloud-document', mimeType: 'application/octet-stream', sourceUrl: url });
    try {
      await processDocumentItem({ itemId: item.id, sourceUrl: url });
      if (kind === 'exam_template') await onExamCreated();
    } finally {
      await refreshBatches(batch.id);
    }
  };

  const createAttemptAndGrade = async (item: DocumentImportItem) => {
    const studentId = matches[item.id];
    if (!exam || !studentId) return;
    setBusyItem(item.id);
    setMessage(null);
    try {
      const attempt = await createExamAttemptFromItem(item.id, exam.id, studentId);
      await gradeExamAttempt(attempt.id);
      await loadItems(item.batchId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sınav puanlandırılamadı.');
      if (activeBatchId) await loadItems(activeBatchId).catch(() => undefined);
    } finally {
      setBusyItem(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <section className="assessment-two-column">
        <div className="card card--padded assessment-form-section">
          <h2>Yeni sınav tanımla</h2>
          <input className="input-control" placeholder="Sınav adı" value={title} onChange={(event) => setTitle(event.target.value)} />
          <input className="input-control" placeholder="Ders / konu (opsiyonel)" value={subject} onChange={(event) => setSubject(event.target.value)} />
          <label className="field"><span className="field__label">Toplam puan</span><input type="number" min={1} max={1000} className="input-control" value={maxPoints} onChange={(event) => setMaxPoints(Number(event.target.value))} /></label>
          <textarea className="textarea-control" rows={3} placeholder="Puanlama notları / cevap anahtarı ipuçları (opsiyonel)" value={scoringNotes} onChange={(event) => setScoringNotes(event.target.value)} />
          <label className="checkbox-row"><input type="checkbox" checked={feedbackVisibleDefault} onChange={(event) => setFeedbackVisibleDefault(event.target.checked)} /><span>Onay sonrası öğrenci feedbackini varsayılan olarak görebilsin.</span></label>
          <button type="button" className="btn btn--primary" disabled={!title.trim() || creating || !Number.isFinite(maxPoints) || maxPoints < 1 || maxPoints > 1000} onClick={createExam}>Sınav oluştur</button>
        </div>

        <div className="card card--padded assessment-form-section">
          <h2>Sınav seç</h2>
          <select className="select-control" value={examId} onChange={(event) => setExamId(event.target.value)}>
            <option value="">Sınav seç…</option>
            {exams.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.maxPoints} puan · {item.status}</option>)}
          </select>
          {exam && <div className="assessment-exam-summary"><span className={`badge ${exam.status === 'ready' ? 'badge--success' : 'badge--warning'}`}>{exam.status === 'ready' ? 'Boş sınav okundu' : 'Boş sınav bekleniyor'}</span><span>{exam.subject}</span></div>}
        </div>
      </section>

      {exam && !exam.masterOcrText && (
        <section className="card card--padded assessment-form-section">
          <h2>1. Boş sınavı yükle</h2>
          <p className="field__hint">AI önce soru ve basılı metni bu belgeden öğrenecek. Mümkünse temiz, işaretlenmemiş sınav kullan.</p>
          <DocumentImportControls onFiles={(files, mode) => importForExam(files, mode, 'exam_template')} onCloudUrl={(url) => cloudForExam(url, 'exam_template')} />
        </section>
      )}

      {exam?.masterOcrText && (
        <>
          <section className="card card--padded assessment-form-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><CheckCircle2 color="var(--color-success)" size={18} /><h2>Boş sınav hazır</h2></div>
            <details><summary>Okunan boş sınav metnini kontrol et</summary><pre className="ocr-text-preview">{exam.masterOcrText}</pre></details>
          </section>
          <section className="card card--padded assessment-form-section">
            <h2>2. Dolu öğrenci sınavlarını yükle</h2>
            <DocumentImportControls onFiles={(files, mode) => importForExam(files, mode, 'exam_attempt')} onCloudUrl={(url) => cloudForExam(url, 'exam_attempt')} />
          </section>
        </>
      )}

      {batches.length > 0 && (
        <section className="card card--padded assessment-form-section">
          <label className="field">
            <span className="field__label">Son belge yüklemeleri</span>
            <select
              className="select-control"
              value={activeBatchId ?? ''}
              onChange={(event) => {
                const nextId = event.target.value;
                setActiveBatchId(nextId);
                setMatches({});
                void loadItems(nextId).catch((error) => setMessage(error instanceof Error ? error.message : 'Yükleme açılamadı.'));
              }}
            >
              {batches.map((batch) => <option key={batch.id} value={batch.id}>{batchLabel(batch)}</option>)}
            </select>
          </label>
          <p className="field__hint">Yenileme veya yeniden giriş sonrasında son 30 yükleme otomatik geri yüklenir.</p>
        </section>
      )}

      {message && <p className="field__error">{message}</p>}
      {items.length > 0 && exam?.masterOcrText && (
        <OcrReviewList
          title="3. Öğrenci eşleştir ve puanlat"
          description="AI sonucu doğrudan yayınlanmaz; her sınav Onay bekliyor durumunda öğretmene gelir."
          items={items}
          students={allStudents}
          matches={matches}
          setMatches={setMatches}
          activeBatchId={activeBatchId}
          loadItems={loadItems}
          busyItem={busyItem}
          action={(item) => item.linkedExamAttemptId
            ? <Link className="btn btn--secondary" to={`/teacher/exams/${exam.id}/attempts/${item.linkedExamAttemptId}`}>Puanı incele</Link>
            : <button type="button" className="btn btn--primary" disabled={item.ocrStatus !== 'ready' || !matches[item.id] || busyItem === item.id} onClick={() => createAttemptAndGrade(item)}><FileSearch size={16} /> AI puanla</button>}
        />
      )}
    </div>
  );
}

function OcrReviewList({ title, description, items, students, matches, setMatches, activeBatchId, loadItems, busyItem, action }: {
  title: string;
  description: string;
  items: DocumentImportItem[];
  students: StudentProfile[];
  matches: Record<string, string>;
  setMatches: Dispatch<SetStateAction<Record<string, string>>>;
  activeBatchId: string | null;
  loadItems: (batchId: string) => Promise<void>;
  busyItem: string | null;
  action: (item: DocumentImportItem) => ReactNode;
}) {
  return (
    <section className="card card--padded assessment-form-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', alignItems: 'center' }}>
        <div><h2>{title}</h2><p className="field__hint">{description}</p></div>
        {activeBatchId && <button type="button" className="icon-btn" disabled={Boolean(busyItem)} onClick={() => void loadItems(activeBatchId)} aria-label="Yenile"><RefreshCw size={17} /></button>}
      </div>
      <div className="ocr-item-list">
        {items.map((item) => (
          <article key={item.id} className="ocr-item-card">
            <div className="ocr-item-card__header">
              <div>
                <strong>{item.originalFilename}</strong>
                <div className="field__hint">OCR: {item.ocrStatus} · {item.pageCount ?? 0} sayfa {item.confidence !== undefined ? `· güven ${Math.round(item.confidence * 100)}%` : ''}</div>
              </div>
              <StatusBadge status={item.reviewStatus} />
            </div>
            {item.suggestedStudentName && <p className="field__hint">OCR isim önerisi: <strong>{item.suggestedStudentName}</strong></p>}
            {item.ocrText && <details><summary>OCR metnini kontrol et</summary><pre className="ocr-text-preview">{item.ocrText}</pre></details>}
            {item.errorMessage && <p className="field__error">{item.errorMessage}</p>}
            <div className="ocr-item-card__actions">
              <select
                className="select-control"
                value={matches[item.id] ?? ''}
                onChange={(event) => setMatches((current) => ({ ...current, [item.id]: event.target.value }))}
                disabled={item.ocrStatus !== 'ready' || Boolean(item.linkedSubmissionId || item.linkedExamAttemptId)}
              >
                <option value="">Öğrenci seç…</option>
                {students.map((student) => <option key={student.id} value={student.id}>{student.displayName} · @{student.username}</option>)}
              </select>
              {action(item)}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: DocumentImportItem['reviewStatus'] }) {
  const label = status === 'teacher_review_pending'
    ? 'Onay bekliyor'
    : status === 'approved'
      ? 'Onaylandı'
      : status === 'returned'
        ? 'Geri gönderildi'
        : status === 'ready_for_grading'
          ? 'Puanlamaya hazır'
          : 'Eşleştirme bekliyor';
  const variant = status === 'approved' ? 'success' : status === 'teacher_review_pending' ? 'warning' : 'neutral';
  return <span className={`badge badge--${variant}`}>{label}</span>;
}
