import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, FileCheck2, KeyRound, Save, Sparkles } from 'lucide-react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DocumentImportControls } from '../../components/DocumentImportControls';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../state/AuthContext';
import type { DocumentImportItem, DocumentImportKind, DocumentSourceMode, ExamDefinition } from '../../types/assessment';
import type { TeacherProfile } from '../../types/entities';
import {
  createExamDefinition,
  createExamDocumentBatch,
  createExamDocumentItem,
  fetchExamDefinition,
  fetchExamDocumentBatches,
  fetchExamDocumentItems,
  processExamDocumentItem,
  updateExamDefinitionSettings,
} from '../../services/examWorkflowData';
import { fetchSchoolScopeOptions, type SchoolScopeOption } from '../../services/schoolScopeData';
import { fileToBase64 } from '../../utils/documentImport';

const EXAMPLE_RULES = [
  'Eş anlamlı veya anlamca eşdeğer doğru cevapları kabul et.',
  'Yöntem doğru fakat sonuçta küçük işlem hatası varsa kısmi puan ver.',
  'Yazım hatası anlamı değiştirmiyorsa sırf yazım nedeniyle puan kırma.',
  'Birden fazla doğru yaklaşım mümkünse hepsini eşit değerlendir.',
];

function ReferenceStatus({ label, item, ready }: { label: string; item?: DocumentImportItem; ready: boolean }) {
  return (
    <div className={`exam-reference-panel__status ${ready ? 'is-ready' : ''}`}>
      <div>
        {ready ? <CheckCircle2 size={18} /> : <span className="exam-reference-dot" />}
        <strong>{label}</strong>
      </div>
      <span className={`badge ${ready ? 'badge--success' : item?.ocrStatus === 'failed' ? 'badge--error' : 'badge--neutral'}`}>
        {ready ? 'OCR hazır' : item?.ocrStatus === 'processing' ? 'OCR işleniyor' : item?.ocrStatus === 'failed' ? 'OCR başarısız' : 'Belge bekleniyor'}
      </span>
      {item?.errorMessage && <p className="field__error">{item.errorMessage}</p>}
    </div>
  );
}

export function TeacherExamSetupPage() {
  const { examId } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = !examId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const teacher = user as TeacherProfile;

  const [schools, setSchools] = useState<SchoolScopeOption[] | null>(null);
  const [schoolId, setSchoolId] = useState(searchParams.get('school') || teacher.schoolIds[0] || '');
  const [exam, setExam] = useState<ExamDefinition | null | undefined>(isNew ? null : undefined);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [maxPoints, setMaxPoints] = useState(100);
  const [scoringNotes, setScoringNotes] = useState('');
  const [feedbackVisibleDefault, setFeedbackVisibleDefault] = useState(false);
  const [sharedWithSchool, setSharedWithSchool] = useState(true);
  const [referenceItems, setReferenceItems] = useState<Partial<Record<'exam_template' | 'exam_answer_key', DocumentImportItem>>>({});
  const [saving, setSaving] = useState(false);
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

  const loadReferences = useCallback(async (id: string) => {
    const batches = await fetchExamDocumentBatches(id);
    const next: Partial<Record<'exam_template' | 'exam_answer_key', DocumentImportItem>> = {};
    for (const kind of ['exam_template', 'exam_answer_key'] as const) {
      const batch = batches.find((candidate) => candidate.kind === kind);
      if (!batch) continue;
      const items = await fetchExamDocumentItems(batch.id);
      if (items[0]) next[kind] = items[items.length - 1];
    }
    setReferenceItems(next);
  }, []);

  const reloadExam = useCallback(async () => {
    if (!examId) return;
    const row = await fetchExamDefinition(examId);
    setExam(row);
    if (!row) return;
    setSchoolId(row.schoolId);
    setTitle(row.title);
    setSubject(row.subject ?? '');
    setMaxPoints(row.maxPoints);
    setScoringNotes(row.scoringNotes ?? '');
    setFeedbackVisibleDefault(row.feedbackVisibleDefault);
    setSharedWithSchool(row.sharedWithSchool);
    await loadReferences(row.id);
  }, [examId, loadReferences]);

  useEffect(() => {
    if (!examId) return;
    void reloadExam().catch((error) => {
      setExam(null);
      setMessage(error instanceof Error ? error.message : 'Sınav yüklenemedi.');
    });
  }, [examId, reloadExam]);

  const valid = title.trim().length > 0 && Number.isFinite(maxPoints) && maxPoints > 0 && maxPoints <= 1000 && Boolean(schoolId);

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    setMessage(null);
    try {
      if (!exam) {
        const created = await createExamDefinition({
          schoolId,
          title,
          subject: subject || undefined,
          maxPoints,
          scoringNotes: scoringNotes || undefined,
          sharedWithSchool,
          feedbackVisibleDefault,
          createdBy: teacher.id,
        });
        navigate(`/teacher/exams/${created.id}/setup`, { replace: true });
        return;
      }
      await updateExamDefinitionSettings({
        examId: exam.id,
        title,
        subject: subject || undefined,
        maxPoints,
        scoringNotes: scoringNotes || undefined,
        sharedWithSchool,
        feedbackVisibleDefault,
      });
      setMessage('Sınav ayarları kaydedildi.');
      await reloadExam();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sınav kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const uploadReferenceFiles = async (files: File[], mode: DocumentSourceMode, kind: 'exam_template' | 'exam_answer_key') => {
    if (!exam) throw new Error('Önce sınav bilgilerini kaydet.');
    if (files.length !== 1) throw new Error('Bu bölümde tek belge yükle. Çok sayfalıysa tek PDF kullan.');
    const file = files[0]!;
    const batch = await createExamDocumentBatch({
      schoolId: exam.schoolId,
      createdBy: teacher.id,
      examId: exam.id,
      kind,
      sourceMode: mode,
      title: `${exam.title} · ${kind === 'exam_template' ? 'boş sınav' : 'cevap anahtarı'}`,
    });
    const item = await createExamDocumentItem({ batchId: batch.id, filename: file.name, mimeType: file.type });
    setReferenceItems((current) => ({ ...current, [kind]: item }));
    await processExamDocumentItem({ itemId: item.id, dataBase64: await fileToBase64(file), mimeType: file.type });
    await reloadExam();
  };

  const uploadReferenceCloud = async (url: string, kind: 'exam_template' | 'exam_answer_key') => {
    if (!exam) throw new Error('Önce sınav bilgilerini kaydet.');
    const batch = await createExamDocumentBatch({
      schoolId: exam.schoolId,
      createdBy: teacher.id,
      examId: exam.id,
      kind,
      sourceMode: 'cloud_url',
      title: `${exam.title} · ${kind === 'exam_template' ? 'boş sınav' : 'cevap anahtarı'}`,
    });
    const item = await createExamDocumentItem({ batchId: batch.id, filename: kind === 'exam_template' ? 'blank-exam-cloud' : 'answer-key-cloud', mimeType: 'application/octet-stream' });
    setReferenceItems((current) => ({ ...current, [kind]: item }));
    await processExamDocumentItem({ itemId: item.id, sourceUrl: url });
    await reloadExam();
  };

  const addExampleRules = () => {
    const missing = EXAMPLE_RULES.filter((rule) => !scoringNotes.includes(rule));
    setScoringNotes((current) => [current.trim(), ...missing.map((rule) => `• ${rule}`)].filter(Boolean).join('\n'));
  };

  const blankReady = Boolean(exam?.masterOcrText);
  const keyReady = Boolean(exam?.answerKeyOcrText);
  const pageTitle = isNew ? 'Yeni sınav tanımla' : (exam?.title || 'Sınav kurulumu');
  const schoolLocked = Boolean(exam);
  const selectedSchoolName = useMemo(() => schools?.find((item) => item.id === schoolId)?.name, [schools, schoolId]);

  if (!schools || exam === undefined) return <LoadingSkeleton height="20rem" />;
  if (!isNew && exam === null) return <Navigate to="/teacher/exams" replace />;

  return (
    <>
      <PageHeader
        title={pageTitle}
        subtitle="Aşama 1/3 · Sınav bilgilerini ve AI'nın karşılaştıracağı referans belgelerini hazırla."
        actions={<Link className="btn btn--secondary" to="/teacher/exams">Sınavlara dön</Link>}
      />

      <div className="exam-setup-layout">
        <main className="exam-setup-main">
          <section className="card card--padded assessment-form-section">
            <div className="exam-section-heading"><span className="exam-step-number">1</span><div><h2>Sınav bilgileri</h2><p className="field__hint">Temel bilgiler ve toplam puan.</p></div></div>
            <div className="assessment-field-grid">
              <label className="field assessment-field-span-2"><span className="field__label">Sınav adı</span><input className="input-control" maxLength={500} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Örn. 8. Sınıf İngilizce 1. Yazılı" /></label>
              <label className="field"><span className="field__label">Ders / konu</span><input className="input-control" maxLength={500} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="İngilizce · Unit 3–4" /></label>
              <label className="field"><span className="field__label">Toplam puan</span><input className="input-control" type="number" min={1} max={1000} step={0.01} value={maxPoints} onChange={(event) => setMaxPoints(Number(event.target.value))} /></label>
              {schools.length > 1 && <label className="field assessment-field-span-2"><span className="field__label">Okul</span><select className="select-control" value={schoolId} disabled={schoolLocked} onChange={(event) => setSchoolId(event.target.value)}>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select></label>}
            </div>
          </section>

          <section className="card card--padded assessment-form-section">
            <div className="exam-section-heading"><span className="exam-step-number">2</span><div><h2>Genel puanlama kuralları</h2><p className="field__hint">Opsiyonel. AI'nın cevapları nasıl kabul edeceğini genel kurallarla belirt.</p></div></div>
            <textarea className="textarea-control" rows={6} maxLength={12000} value={scoringNotes} onChange={(event) => setScoringNotes(event.target.value)} placeholder="Örn. eş anlamlı cevapları kabul et; doğru yöntem varsa kısmi puan ver; anlamı bozmayan küçük yazım hatalarında puan kırma…" />
            <button type="button" className="btn btn--secondary btn--sm" style={{ alignSelf: 'flex-start' }} onClick={addExampleRules}><Sparkles size={15} /> Genel örnek kuralları ekle</button>
            <div className="exam-rule-examples">{EXAMPLE_RULES.map((rule) => <span key={rule}>{rule}</span>)}</div>
          </section>

          <section className="card card--padded assessment-form-section">
            <div className="exam-section-heading"><span className="exam-step-number">3</span><div><h2>Paylaşım ve öğrenci görünürlüğü</h2><p className="field__hint">AI sonucu her durumda önce öğretmen onayına gelir.</p></div></div>
            <label className="checkbox-row"><input type="checkbox" checked={sharedWithSchool} onChange={(event) => setSharedWithSchool(event.target.checked)} /><span>Aynı okuldaki öğretmenler bu sınav tanımını kullanabilsin.</span></label>
            <label className="checkbox-row"><input type="checkbox" checked={feedbackVisibleDefault} onChange={(event) => setFeedbackVisibleDefault(event.target.checked)} /><span>Öğretmen onayından sonra AI geri bildirimini öğrenciye varsayılan olarak aç.</span></label>
          </section>

          <div className="exam-save-row">
            <button type="button" className="btn btn--primary btn--lg" disabled={!valid || saving} onClick={save}><Save size={17} /> {exam ? 'Ayarları kaydet' : 'Sınavı oluştur ve belgelere geç'}</button>
          </div>

          {exam && (
            <>
              <section className="card card--padded exam-reference-panel">
                <div className="exam-section-heading"><FileCheck2 size={21} /><div><h2>Boş sınav kağıdı <span className="badge badge--warning">Zorunlu</span></h2><p className="field__hint">Soruların basılı ve cevaplanmamış hali. AI soru sınırlarını ve yönergeleri buradan öğrenir.</p></div></div>
                <ReferenceStatus label="Boş sınav" item={referenceItems.exam_template} ready={blankReady} />
                <DocumentImportControls onFiles={(files, mode) => uploadReferenceFiles(files, mode, 'exam_template')} onCloudUrl={(url) => uploadReferenceCloud(url, 'exam_template')} />
                {exam.masterOcrText && <details><summary>Okunan boş sınav metnini kontrol et</summary><pre className="ocr-text-preview">{exam.masterOcrText}</pre></details>}
              </section>

              <section className="card card--padded exam-reference-panel">
                <div className="exam-section-heading"><KeyRound size={21} /><div><h2>Cevap anahtarı <span className="badge badge--neutral">Opsiyonel</span></h2><p className="field__hint">Öğretmenin doldurduğu doğru cevap kağıdı veya resmi cevap anahtarı. AI bunu anlam referansı olarak kullanır; kelimesi kelimesine eşleşme zorunlu değildir.</p></div></div>
                <ReferenceStatus label="Cevap anahtarı" item={referenceItems.exam_answer_key} ready={keyReady} />
                <DocumentImportControls onFiles={(files, mode) => uploadReferenceFiles(files, mode, 'exam_answer_key')} onCloudUrl={(url) => uploadReferenceCloud(url, 'exam_answer_key')} />
                {exam.answerKeyOcrText && <details><summary>Okunan cevap anahtarını kontrol et</summary><pre className="ocr-text-preview">{exam.answerKeyOcrText}</pre></details>}
              </section>

              <section className={`exam-ready-callout ${blankReady ? 'is-ready' : ''}`}>
                <div>{blankReady ? <CheckCircle2 size={22} /> : <FileCheck2 size={22} />}<div><strong>{blankReady ? 'Sınav puanlamaya hazır' : 'Boş sınav belgesi gerekli'}</strong><small>{selectedSchoolName ? `${selectedSchoolName} · ` : ''}{keyReady ? 'Cevap anahtarı kullanılacak.' : 'Cevap anahtarı olmadan da puanlanabilir.'}</small></div></div>
                {blankReady && <Link className="btn btn--primary" to={`/teacher/exams/${exam.id}/grade`}>Öğrenci kağıtlarına geç <ArrowRight size={16} /></Link>}
              </section>
            </>
          )}
        </main>
      </div>

      {message && <div className="assessment-success-notice" style={{ marginTop: 'var(--space-4)' }}>{message}</div>}
    </>
  );
}
