import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileSearch, RefreshCw, ScanText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { DocumentImportControls } from '../../components/DocumentImportControls';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../state/AuthContext';
import type { DocumentImportBatch, DocumentImportItem, DocumentSourceMode } from '../../types/assessment';
import type { Assignment, StudentProfile, TeacherProfile } from '../../types/entities';
import { fetchAssignmentsForTeacher } from '../../services/assignmentData';
import {
  createAndGradeOcrWriting,
  createDocumentBatch,
  createDocumentItem,
  fetchDocumentBatches,
  fetchDocumentItems,
  processDocumentItem,
} from '../../services/assessmentData';
import { fetchSchoolScopeOptions, type SchoolScopeOption } from '../../services/schoolScopeData';
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

export function TeacherWritingOcrPage() {
  const { user } = useAuth();
  const teacher = user as TeacherProfile;
  const navigate = useNavigate();
  const [schools, setSchools] = useState<SchoolScopeOption[] | null>(null);
  const [schoolId, setSchoolId] = useState(teacher.schoolIds[0] ?? '');
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [students, setStudents] = useState<StudentProfile[] | null>(null);
  const [assignmentId, setAssignmentId] = useState('');
  const [batches, setBatches] = useState<DocumentImportBatch[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [items, setItems] = useState<DocumentImportItem[]>([]);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchSchoolScopeOptions(teacher.schoolIds).then((rows) => {
      if (cancelled) return;
      setSchools(rows);
      if (!schoolId && rows[0]) setSchoolId(rows[0].id);
    }).catch((error) => !cancelled && setMessage(error instanceof Error ? error.message : 'Okullar yüklenemedi.'));
    return () => { cancelled = true; };
  }, [teacher.schoolIds, schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    setAssignments(null);
    setStudents(null);
    setAssignmentId('');
    setBatches([]);
    setItems([]);
    setMatches({});
    void Promise.all([fetchAssignmentsForTeacher(teacher.id), fetchTeacherClasses(teacher.id)])
      .then(async ([assignmentRows, classRows]) => {
        const scopedClasses = classRows.filter((item) => item.schoolId === schoolId);
        const studentIds = [...new Set(scopedClasses.flatMap((item) => item.studentIds))];
        const studentRows = await fetchStudentsByIds(studentIds);
        const scopedAssignments = assignmentRows.filter((assignment) => assignment.schoolId === schoolId && assignment.status === 'published');
        setAssignments(scopedAssignments);
        setStudents(studentRows.filter((student) => student.schoolId === schoolId));
        setAssignmentId(scopedAssignments[0]?.id ?? '');
      })
      .catch((error) => {
        setAssignments([]);
        setStudents([]);
        setMessage(error instanceof Error ? error.message : 'Writing OCR yüklenemedi.');
      });
  }, [schoolId, teacher.id]);

  const assignment = assignments?.find((item) => item.id === assignmentId);
  const eligibleStudents = useMemo(() => {
    if (!assignment || !students) return [];
    return students.filter((student) => student.classIds.some((classId) => assignment.classIds.includes(classId)));
  }, [assignment, students]);

  const loadItems = useCallback(async (batchId: string) => {
    const rows = await fetchDocumentItems(batchId);
    setItems(rows);
    setMatches((current) => {
      const next = { ...current };
      for (const item of rows) {
        if (item.studentId) next[item.id] = item.studentId;
        else if (!next[item.id]) next[item.id] = guessStudent(item, eligibleStudents) ?? '';
      }
      return next;
    });
  }, [eligibleStudents]);

  const refreshBatches = useCallback(async (preferred?: string) => {
    if (!assignmentId) {
      setBatches([]);
      setActiveBatchId(null);
      setItems([]);
      return;
    }
    const rows = (await fetchDocumentBatches(schoolId, 'writing')).filter((batch) => batch.assignmentId === assignmentId).slice(0, 30);
    setBatches(rows);
    const target = preferred && rows.some((batch) => batch.id === preferred) ? preferred : rows[0]?.id;
    if (!target) {
      setActiveBatchId(null);
      setItems([]);
      return;
    }
    setActiveBatchId(target);
    setMatches({});
    await loadItems(target);
  }, [assignmentId, loadItems, schoolId]);

  useEffect(() => {
    if (!assignmentId) return;
    void refreshBatches().catch((error) => setMessage(error instanceof Error ? error.message : 'Yüklemeler açılamadı.'));
  }, [assignmentId, refreshBatches]);

  const importFiles = async (files: File[], mode: DocumentSourceMode) => {
    if (!assignment) throw new Error('Önce writing ödevini seç.');
    const batch = await createDocumentBatch({ schoolId, createdBy: teacher.id, kind: 'writing', assignmentId: assignment.id, title: `${assignment.title} · ${new Date().toLocaleString('tr-TR')}`, sourceMode: mode });
    for (const file of files) {
      const item = await createDocumentItem({ batchId: batch.id, filename: file.name, mimeType: file.type });
      try {
        await processDocumentItem({ itemId: item.id, dataBase64: await fileToBase64(file), mimeType: file.type });
      } catch {
        // Individual OCR failures are persisted and displayed after refresh.
      }
    }
    await refreshBatches(batch.id);
  };

  const importCloud = async (url: string) => {
    if (!assignment) throw new Error('Önce writing ödevini seç.');
    const batch = await createDocumentBatch({ schoolId, createdBy: teacher.id, kind: 'writing', assignmentId: assignment.id, title: `${assignment.title} · Cloud`, sourceMode: 'cloud_url' });
    const item = await createDocumentItem({ batchId: batch.id, filename: 'cloud-writing', mimeType: 'application/octet-stream', sourceUrl: url });
    try {
      await processDocumentItem({ itemId: item.id, sourceUrl: url });
    } finally {
      await refreshBatches(batch.id);
    }
  };

  const grade = async (item: DocumentImportItem) => {
    if (!assignment || !matches[item.id]) return;
    setBusyItem(item.id);
    setMessage(null);
    try {
      const submissionId = await createAndGradeOcrWriting(item.id, assignment.id, matches[item.id]!);
      navigate(`/teacher/submissions/${submissionId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Writing puanlandırılamadı.');
      if (activeBatchId) await loadItems(activeBatchId).catch(() => undefined);
    } finally {
      setBusyItem(null);
    }
  };

  if (!schools || assignments === null || students === null) return <LoadingSkeleton height="18rem" />;

  return (
    <>
      <PageHeader title="Writing OCR" subtitle="El yazısı veya basılı writing kağıtlarını OCR ile mevcut ödev puanlama akışına aktar." actions={<Link className="btn btn--secondary" to="/teacher/exams">Sınav Okuma</Link>} />

      {schools.length > 1 && <section className="card card--padded" style={{ marginBottom: 'var(--space-4)' }}><label className="field"><span className="field__label">Okul</span><select className="select-control" value={schoolId} onChange={(event) => setSchoolId(event.target.value)}>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select></label></section>}
      {message && <div className="exam-workflow-message">{message}</div>}

      <div className="writing-ocr-flow">
        <section className="card card--padded assessment-form-section">
          <div className="exam-section-heading"><span className="exam-step-number">1</span><div><h2>Writing ödevini seç</h2><p className="field__hint">OCR sonucu bu ödevin rubriği ve puan ölçeğiyle değerlendirilecek.</p></div></div>
          {assignments.length ? <select className="select-control" value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)}>{assignments.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.level}</option>)}</select> : <p className="field__hint">Bu okulda yayınlanmış writing ödevi yok.</p>}
        </section>

        <section className="card card--padded assessment-form-section">
          <div className="exam-section-heading"><span className="exam-step-number">2</span><div><h2>Kağıtları yükle</h2><p className="field__hint">Kamera, galeri, PDF, ZIP veya bulut bağlantısı kullanılabilir.</p></div></div>
          <DocumentImportControls disabled={!assignment} onFiles={importFiles} onCloudUrl={importCloud} />
        </section>

        {batches.length > 0 && <section className="card card--padded assessment-form-section"><label className="field"><span className="field__label">Son yüklemeler</span><select className="select-control" value={activeBatchId ?? ''} onChange={(event) => { setActiveBatchId(event.target.value); setMatches({}); void loadItems(event.target.value); }}>{batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.title}</option>)}</select></label></section>}

        {items.length > 0 && <section className="card card--padded assessment-form-section">
          <div className="exam-section-heading"><span className="exam-step-number">3</span><div><h2>Öğrenciyi doğrula ve puanlat</h2><p className="field__hint">OCR isim tahmini otomatik kesin eşleşme sayılmaz.</p></div></div>
          <div className="exam-paper-list">
            {items.map((item) => <article className="exam-paper-card" key={item.id}>
              <div className="exam-paper-card__top"><div><strong>{item.originalFilename}</strong><small>OCR: {item.ocrStatus} · {item.pageCount ?? 0} sayfa</small></div><span className={`badge ${item.reviewStatus === 'approved' ? 'badge--success' : item.reviewStatus === 'teacher_review_pending' ? 'badge--warning' : 'badge--neutral'}`}>{item.reviewStatus === 'teacher_review_pending' ? 'Onay bekliyor' : item.reviewStatus === 'approved' ? 'Onaylandı' : 'Eşleştirme'}</span></div>
              {item.suggestedStudentName && <div className="exam-ocr-suggestion">OCR isim önerisi: <strong>{item.suggestedStudentName}</strong></div>}
              {item.errorMessage && <p className="field__error">{item.errorMessage}</p>}
              <div className="exam-paper-card__actions">
                <select className="select-control" value={matches[item.id] ?? ''} disabled={item.ocrStatus !== 'ready' || Boolean(item.linkedSubmissionId)} onChange={(event) => setMatches((current) => ({ ...current, [item.id]: event.target.value }))}><option value="">Öğrenci seç…</option>{eligibleStudents.map((student) => <option key={student.id} value={student.id}>{student.displayName} · @{student.username}</option>)}</select>
                {item.linkedSubmissionId ? <Link className="btn btn--secondary" to={`/teacher/submissions/${item.linkedSubmissionId}`}>Puanı incele</Link> : <button type="button" className="btn btn--primary" disabled={item.ocrStatus !== 'ready' || !matches[item.id] || busyItem === item.id} onClick={() => grade(item)}><FileSearch size={16} /> {busyItem === item.id ? 'AI puanlıyor…' : 'AI puanla'}</button>}
              </div>
              {item.ocrText && <details><summary>OCR metnini kontrol et</summary><pre className="ocr-text-preview">{item.ocrText}</pre></details>}
            </article>)}
          </div>
          {activeBatchId && <button type="button" className="btn btn--secondary btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => void loadItems(activeBatchId)}><RefreshCw size={15} /> Yenile</button>}
        </section>}
      </div>
    </>
  );
}
