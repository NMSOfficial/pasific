import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, FileCheck2, FilePlus2, KeyRound, ScanLine } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { useAuth } from '../../state/AuthContext';
import type { TeacherProfile } from '../../types/entities';
import type { ExamDefinition } from '../../types/assessment';
import { fetchSchoolScopeOptions, type SchoolScopeOption } from '../../services/schoolScopeData';
import { fetchExamDefinitions } from '../../services/examWorkflowData';

export function TeacherExamListPage() {
  const { user } = useAuth();
  const teacher = user as TeacherProfile;
  const [schools, setSchools] = useState<SchoolScopeOption[] | null>(null);
  const [schoolId, setSchoolId] = useState(teacher.schoolIds[0] ?? '');
  const [exams, setExams] = useState<ExamDefinition[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchSchoolScopeOptions(teacher.schoolIds)
      .then((rows) => {
        if (cancelled) return;
        setSchools(rows);
        if (!schoolId && rows[0]) setSchoolId(rows[0].id);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Okullar yüklenemedi.'));
    return () => { cancelled = true; };
  }, [teacher.schoolIds, schoolId]);

  const reload = useCallback(async () => {
    if (!schoolId) return;
    setError(null);
    try {
      setExams(await fetchExamDefinitions(schoolId));
    } catch (err) {
      setExams([]);
      setError(err instanceof Error ? err.message : 'Sınavlar yüklenemedi.');
    }
  }, [schoolId]);

  useEffect(() => {
    setExams(null);
    void reload();
  }, [reload]);

  if (!schools || !exams) return <LoadingSkeleton height="18rem" />;

  return (
    <>
      <PageHeader
        title="Sınav Okuma"
        subtitle="Sınavı tanımla, referans belgeleri hazırla, öğrenci kağıtlarını AI ile puanlat ve sonuçları onayla."
        actions={<Link className="btn btn--primary" to={`/teacher/exams/new${schoolId ? `?school=${encodeURIComponent(schoolId)}` : ''}`}><FilePlus2 size={17} /> Yeni sınav</Link>}
      />

      <section className="exam-flow-steps" aria-label="Sınav okuma aşamaları">
        <div className="exam-flow-step"><span>1</span><div><strong>Sınavı tanımla</strong><small>Boş kağıt + opsiyonel cevap anahtarı</small></div></div>
        <ArrowRight size={18} aria-hidden="true" />
        <div className="exam-flow-step"><span>2</span><div><strong>Kağıtları puanla</strong><small>OCR, öğrenci eşleştirme ve AI</small></div></div>
        <ArrowRight size={18} aria-hidden="true" />
        <div className="exam-flow-step"><span>3</span><div><strong>Öğretmen onayı</strong><small>Soru soru incele ve yayınla</small></div></div>
      </section>

      {schools.length > 1 && (
        <section className="card card--padded exam-school-filter">
          <label className="field">
            <span className="field__label">Okul</span>
            <select className="select-control" value={schoolId} onChange={(event) => setSchoolId(event.target.value)}>
              {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
            </select>
          </label>
        </section>
      )}

      {error && <p className="field__error">{error}</p>}

      {exams.length === 0 ? (
        <section className="card card--padded exam-empty-state">
          <ScanLine size={34} />
          <h2>Henüz sınav tanımlanmadı</h2>
          <p>Önce sınavın adını, toplam puanını ve boş sınav kağıdını tanımla. Cevap anahtarı istersen ayrıca yüklenebilir.</p>
          <Link className="btn btn--primary" to={`/teacher/exams/new${schoolId ? `?school=${encodeURIComponent(schoolId)}` : ''}`}>İlk sınavı tanımla</Link>
        </section>
      ) : (
        <section className="exam-definition-grid">
          {exams.map((exam) => {
            const blankReady = Boolean(exam.masterOcrText);
            const keyReady = Boolean(exam.answerKeyOcrText);
            return (
              <article className="card card--padded exam-definition-card" key={exam.id}>
                <div className="exam-definition-card__header">
                  <div>
                    <div className="exam-definition-card__eyebrow">{exam.subject || 'Genel sınav'} · {exam.maxPoints} puan</div>
                    <h2>{exam.title}</h2>
                  </div>
                  <span className={`badge ${blankReady ? 'badge--success' : 'badge--warning'}`}>{blankReady ? 'Hazır' : 'Kurulum eksik'}</span>
                </div>

                <div className="exam-reference-status">
                  <div className={blankReady ? 'is-ready' : ''}><FileCheck2 size={17} /><span><strong>Boş sınav</strong><small>{blankReady ? 'OCR hazır' : 'Yüklenmeli'}</small></span>{blankReady && <CheckCircle2 size={16} />}</div>
                  <div className={keyReady ? 'is-ready' : ''}><KeyRound size={17} /><span><strong>Cevap anahtarı</strong><small>{keyReady ? 'OCR hazır' : 'Opsiyonel'}</small></span>{keyReady && <CheckCircle2 size={16} />}</div>
                </div>

                <div className="exam-definition-card__actions">
                  <Link className="btn btn--secondary" to={`/teacher/exams/${exam.id}/setup`}>Sınavı düzenle</Link>
                  <Link className={`btn btn--primary ${blankReady ? '' : 'is-disabled'}`} aria-disabled={!blankReady} onClick={(event) => { if (!blankReady) event.preventDefault(); }} to={`/teacher/exams/${exam.id}/grade`}>
                    Öğrenci kağıtlarını puanla <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}
