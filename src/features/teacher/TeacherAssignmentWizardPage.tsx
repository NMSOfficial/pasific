import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { ArrowLeft, ArrowRight, BookCopy, Check, CheckCircle2, FileText, Save, Send, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { PageHeader } from '../../components/PageHeader';
import { standardCriteria } from '../../mock/rubric';
import { WRITING_TYPES } from '../../mock/writingTypes';
import { fetchSchoolSharedAssignments, adoptSharedAssignment } from '../../services/assessmentData';
import { createAdvancedWritingAssignmentAtomic } from '../../services/advancedAssignmentData';
import { fetchVisibleCatalogForSchool } from '../../services/contentData';
import { fetchSchoolScopeOptions, type SchoolScopeOption } from '../../services/schoolScopeData';
import { fetchTeacherClasses, type ClassMeta } from '../../services/teacherData';
import { useAuth } from '../../state/AuthContext';
import type { AdvancedScoringBreakdown, SchoolAssignmentTemplate } from '../../types/assessment';
import type { AssignmentRubric, CefrLevel, TeacherProfile, WritingTypeId } from '../../types/entities';
import { CEFR_LEVELS } from '../../utils/cefr';

const QUICK_SCALES = [5, 10, 20, 50, 100];
const STEPS = [
  { id: 1, title: 'İçerik', description: 'Konu ve temel bilgiler' },
  { id: 2, title: 'Hedef dil', description: 'Kelime, kalıp ve yönergeler' },
  { id: 3, title: 'Puanlama', description: 'Ölçek ve ağırlıklar' },
  { id: 4, title: 'Yayın', description: 'Sınıflar ve son kontrol' },
] as const;

function distributeWeight(totalWeight: number, count: number): number[] {
  const hundredths = Math.max(0, Math.round(totalWeight * 100));
  const base = Math.floor(hundredths / count);
  let remainder = hundredths - base * count;
  return Array.from({ length: count }, () => {
    const units = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    return units / 100;
  });
}

function scaleRubric(scoring: AdvancedScoringBreakdown, vocabulary: string, patterns: string): AssignmentRubric {
  const standard = standardCriteria();
  const baseWeights = distributeWeight(scoring.rubric, standard.length);
  const criteria = standard.map((criterion, index) => ({
    ...criterion,
    id: crypto.randomUUID(),
    weight: baseWeights[index] ?? 0,
    enabled: scoring.rubric > 0,
    isCustom: scoring.rubric !== 100,
  }));

  if (scoring.vocabulary > 0 && vocabulary.trim()) {
    criteria.push({ id: crypto.randomUUID(), key: 'required_vocabulary', nameKey: 'Required vocabulary usage', descriptionKey: undefined, weight: scoring.vocabulary, maxScore: 5, isCustom: true, isCore: false, enabled: true });
  }
  if (scoring.patterns > 0 && patterns.trim()) {
    criteria.push({ id: crypto.randomUUID(), key: 'required_patterns', nameKey: 'Required writing patterns', descriptionKey: undefined, weight: scoring.patterns, maxScore: 5, isCustom: true, isCore: false, enabled: true });
  }
  return { id: crypto.randomUUID(), isCustom: criteria.some((criterion) => criterion.isCustom), criteria };
}

function readTextFile(event: ChangeEvent<HTMLInputElement>, setter: (value: string) => void, setMessage: (value: string | null) => void) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  if (file.size > 512 * 1024 || !/\.(txt|md)$/i.test(file.name)) {
    setMessage('Yalnızca 512 KB altındaki TXT veya MD dosyaları kullanılabilir.');
    return;
  }
  void file.text().then(setter).catch(() => setMessage('Metin dosyası okunamadı.'));
}

export function TeacherAssignmentWizardPage() {
  const { user } = useAuth();
  const teacher = user as TeacherProfile;
  const navigate = useNavigate();
  const [schools, setSchools] = useState<SchoolScopeOption[] | null>(null);
  const [schoolId, setSchoolId] = useState(teacher.schoolIds[0] ?? '');
  const [mode, setMode] = useState<'create' | 'shared'>('create');
  const [step, setStep] = useState(1);
  const [classes, setClasses] = useState<ClassMeta[] | null>(null);
  const [shared, setShared] = useState<SchoolAssignmentTemplate[] | null>(null);
  const [topics, setTopics] = useState<Awaited<ReturnType<typeof fetchVisibleCatalogForSchool>> | null>(null);
  const [selectedShared, setSelectedShared] = useState<string | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const [topicId, setTopicId] = useState('');
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [writingTypeId, setWritingTypeId] = useState<WritingTypeId>('argumentative_essay');
  const [level, setLevel] = useState<CefrLevel>('B2');
  const [minWords, setMinWords] = useState(180);
  const [maxWords, setMaxWords] = useState(260);
  const [dueAt, setDueAt] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | undefined>();
  const [instructions, setInstructions] = useState('');
  const [referenceText, setReferenceText] = useState('');
  const [vocabularyRequirements, setVocabularyRequirements] = useState('');
  const [patternRequirements, setPatternRequirements] = useState('');
  const [maxPoints, setMaxPoints] = useState(100);
  const [vocabularyWeight, setVocabularyWeight] = useState(0);
  const [patternWeight, setPatternWeight] = useState(0);
  const [sharedWithSchool, setSharedWithSchool] = useState(true);
  const [showAiImmediately, setShowAiImmediately] = useState(false);
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

  useEffect(() => {
    if (!schoolId) return;
    let cancelled = false;
    setClasses(null);
    setTopics(null);
    setShared(null);
    setSelectedClasses([]);
    setSelectedShared(null);
    setMessage(null);
    void Promise.all([
      fetchTeacherClasses(teacher.id),
      fetchVisibleCatalogForSchool(schoolId),
      fetchSchoolSharedAssignments(schoolId),
    ]).then(([classRows, topicRows, sharedRows]) => {
      if (cancelled) return;
      setClasses(classRows.filter((item) => item.schoolId === schoolId));
      setTopics(topicRows);
      setShared(sharedRows);
    }).catch((error) => {
      if (cancelled) return;
      setClasses([]);
      setTopics([]);
      setShared([]);
      setMessage(error instanceof Error ? error.message : 'Ödev oluşturucu yüklenemedi.');
    });
    return () => { cancelled = true; };
  }, [schoolId, teacher.id]);

  useEffect(() => {
    if (!vocabularyRequirements.trim()) setVocabularyWeight(0);
  }, [vocabularyRequirements]);
  useEffect(() => {
    if (!patternRequirements.trim()) setPatternWeight(0);
  }, [patternRequirements]);

  const rubricWeight = Math.max(0, 100 - vocabularyWeight - patternWeight);
  const scoring: AdvancedScoringBreakdown = { rubric: rubricWeight, vocabulary: vocabularyWeight, patterns: patternWeight };
  const validWordRange = Number.isFinite(minWords) && Number.isFinite(maxWords) && minWords >= 1 && maxWords >= minWords;
  const validScale = Number.isFinite(maxPoints) && maxPoints >= 1 && maxPoints <= 1000;
  const validTime = timeLimitMinutes === undefined || (Number.isFinite(timeLimitMinutes) && timeLimitMinutes >= 1 && timeLimitMinutes <= 1440);
  const validDue = Boolean(dueAt) && Number.isFinite(new Date(dueAt).getTime());
  const contentValid = Boolean(title.trim() && prompt.trim() && validWordRange && validDue && validTime);
  const canSave = Boolean(schoolId && contentValid && validScale && selectedClasses.length > 0);
  const selectedTopic = useMemo(() => topics?.find((topic) => topic.id === topicId), [topics, topicId]);

  const applyTopic = (id: string) => {
    setTopicId(id);
    const topic = topics?.find((candidate) => candidate.id === id);
    if (!topic) return;
    setTitle(topic.title);
    setPrompt(topic.prompt);
    setWritingTypeId(topic.writingTypeId);
    setLevel(topic.level);
    setMinWords(topic.minWords);
    setMaxWords(topic.maxWords);
  };

  const toggleClass = (classId: string) => setSelectedClasses((current) => current.includes(classId) ? current.filter((id) => id !== classId) : [...current, classId]);

  const changeExtraWeight = (kind: 'vocabulary' | 'patterns', raw: number) => {
    const safe = Math.max(0, Math.min(100, Number.isFinite(raw) ? Math.round(raw) : 0));
    if (kind === 'vocabulary') setVocabularyWeight(Math.min(safe, 100 - patternWeight));
    else setPatternWeight(Math.min(safe, 100 - vocabularyWeight));
  };

  const save = async (status: 'draft' | 'published') => {
    if (!canSave) return;
    setSaving(true);
    setMessage(null);
    try {
      const rubric = scaleRubric(scoring, vocabularyRequirements, patternRequirements);
      await createAdvancedWritingAssignmentAtomic({
        title: title.trim(), prompt: prompt.trim(), writingTypeId, level, minWords, maxWords,
        dueAt: new Date(dueAt).toISOString(), timeLimitMinutes, classIds: selectedClasses,
        instructions: instructions.trim() || undefined, referenceText: referenceText.trim() || undefined,
        vocabularyRequirements: vocabularyRequirements.trim() || undefined, patternRequirements: patternRequirements.trim() || undefined,
        maxPoints: Number(maxPoints.toFixed(2)), scoringBreakdown: scoring, rubric, aiSupportMode: 'none',
        showAiScoreImmediately: showAiImmediately, sharedWithSchool, status, schoolId, topicId: selectedTopic?.id,
      });
      navigate('/teacher/assignments');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ödev kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const adopt = async () => {
    if (!selectedShared || !selectedClasses.length) return;
    setSaving(true);
    try {
      const count = await adoptSharedAssignment(selectedShared, selectedClasses);
      setMessage(`${count} yeni sınıfa atandı.`);
      setSelectedClasses([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ödev sınıflara atanamadı.');
    } finally {
      setSaving(false);
    }
  };

  if (!schools || !classes || !topics || !shared) return <LoadingSkeleton height="18rem" />;

  return (
    <>
      <PageHeader title="Writing ödevi oluştur" subtitle="Uzun tek form yerine dört kısa adımda ödevi hazırla ve yayınla." />

      {schools.length > 1 && <section className="card card--padded assignment-school-row"><label className="field"><span className="field__label">Aktif okul</span><select className="select-control" value={schoolId} onChange={(event) => { setSchoolId(event.target.value); setStep(1); }}>{schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}</select></label></section>}

      <div className="segmented-control assignment-mode-tabs">
        <button type="button" className={`segmented-control__option ${mode === 'create' ? 'is-active' : ''}`} onClick={() => { setMode('create'); setSelectedClasses([]); }}>Yeni ödev</button>
        <button type="button" className={`segmented-control__option ${mode === 'shared' ? 'is-active' : ''}`} onClick={() => { setMode('shared'); setSelectedClasses([]); }}>Okul ödevleri</button>
      </div>

      {message && <div className="exam-workflow-message">{message}</div>}

      {mode === 'shared' ? (
        <div className="assignment-shared-layout">
          <section className="card card--padded assessment-form-section">
            <h2>Okuldaki paylaşılan ödevler</h2>
            {shared.length === 0 && <p className="field__hint">Henüz paylaşılmış ödev yok.</p>}
            <div className="assignment-template-list">
              {shared.map((item) => <button key={item.id} type="button" className={`assignment-template-card ${selectedShared === item.id ? 'is-selected' : ''}`} onClick={() => setSelectedShared(item.id)}><div><strong>{item.title}</strong><span className="badge badge--outline">{item.maxPoints} puan</span></div><small>{item.creatorName || 'Okul öğretmeni'} · {item.level}</small><p>{item.prompt}</p></button>)}
            </div>
          </section>
          <ClassPicker classes={classes} selected={selectedClasses} onToggle={toggleClass} />
          <div className="assignment-wizard-footer"><button type="button" className="btn btn--primary btn--lg" disabled={!selectedShared || !selectedClasses.length || saving} onClick={adopt}><BookCopy size={17} /> Seçili sınıflara ata</button></div>
        </div>
      ) : (
        <div className="assignment-wizard-shell">
          <nav className="assignment-stepper" aria-label="Ödev oluşturma adımları">
            {STEPS.map((item) => <button key={item.id} type="button" className={step === item.id ? 'is-active' : step > item.id ? 'is-complete' : ''} onClick={() => setStep(item.id)}><span>{step > item.id ? <Check size={15} /> : item.id}</span><div><strong>{item.title}</strong><small>{item.description}</small></div></button>)}
          </nav>

          <div className="assignment-wizard-body">
            <main className="assignment-wizard-main">
              {step === 1 && <section className="card card--padded assessment-form-section assignment-step-card">
                <div><span className="assignment-step-kicker">ADIM 1</span><h2>Konu ve temel bilgiler</h2><p className="field__hint">Öğrencinin ne yazacağını ve ödevin sınırlarını belirle.</p></div>
                <label className="field"><span className="field__label">Katalog konusu <span className="field__hint">(opsiyonel)</span></span><select className="select-control" value={topicId} onChange={(event) => applyTopic(event.target.value)}><option value="">Manuel konu oluştur</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title} · {topic.level}</option>)}</select></label>
                <label className="field"><span className="field__label">Ödev başlığı</span><input className="input-control" maxLength={300} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Örn. Social Media and Teenagers" /></label>
                <label className="field"><span className="field__label">Writing topic / prompt</span><textarea className="textarea-control" rows={6} maxLength={12000} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Öğrencinin cevaplayacağı açık ve net writing sorusu…" /></label>
                <div className="assessment-field-grid"><label className="field"><span className="field__label">Writing türü</span><select className="select-control" value={writingTypeId} onChange={(event) => setWritingTypeId(event.target.value as WritingTypeId)}>{WRITING_TYPES.map((type) => <option key={type.id} value={type.id}>{type.id.replaceAll('_', ' ')}</option>)}</select></label><label className="field"><span className="field__label">CEFR seviyesi</span><select className="select-control" value={level} onChange={(event) => setLevel(event.target.value as CefrLevel)}>{CEFR_LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="field"><span className="field__label">Min. kelime</span><input type="number" className="input-control" min={1} max={10000} value={minWords} onChange={(event) => setMinWords(Number(event.target.value))} /></label><label className="field"><span className="field__label">Maks. kelime</span><input type="number" className="input-control" min={1} max={10000} value={maxWords} onChange={(event) => setMaxWords(Number(event.target.value))} /></label><label className="field"><span className="field__label">Son teslim</span><input type="datetime-local" className="input-control" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></label><label className="field"><span className="field__label">Süre <span className="field__hint">(dk, opsiyonel)</span></span><input type="number" className="input-control" min={1} max={1440} value={timeLimitMinutes ?? ''} onChange={(event) => setTimeLimitMinutes(event.target.value ? Number(event.target.value) : undefined)} /></label></div>
                {!validWordRange && <p className="field__error">Maksimum kelime sayısı minimum kelime sayısından küçük olamaz.</p>}{!validDue && dueAt && <p className="field__error">Geçerli bir son teslim tarihi seç.</p>}
              </section>}

              {step === 2 && <section className="assignment-language-grid">
                <LanguageCard title="Ünite / konu kelimeleri" description="Öğrencinin uygun biçimde kullanmasını istediğin kelimeler. Boş bırakırsan puanlamaya girmez." value={vocabularyRequirements} onChange={setVocabularyRequirements} onFile={(event) => readTextFile(event, setVocabularyRequirements, setMessage)} />
                <LanguageCard title="Kullanılması gereken kalıplar" description="Bağlaçlar, thesis kalıpları, formal request yapıları gibi konuya özel hedef yapılar." value={patternRequirements} onChange={setPatternRequirements} onFile={(event) => readTextFile(event, setPatternRequirements, setMessage)} />
                <section className="card card--padded assessment-form-section assignment-language-wide"><h2>Ek yönergeler ve referans</h2><label className="field"><span className="field__label">Ek yönergeler <span className="field__hint">(opsiyonel)</span></span><textarea className="textarea-control" rows={3} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Örn. En az iki karşıt görüş bağlacı kullan." /></label><label className="field"><span className="field__label">Referans metin <span className="field__hint">(opsiyonel)</span></span><textarea className="textarea-control" rows={5} value={referenceText} onChange={(event) => setReferenceText(event.target.value)} placeholder="Öğrencinin kullanacağı kaynak veya bağlam metni…" /></label></section>
              </section>}

              {step === 3 && <section className="card card--padded assessment-form-section assignment-step-card">
                <div><span className="assignment-step-kicker">ADIM 3</span><h2>Puanlama sistemi</h2><p className="field__hint">Toplam ağırlık otomatik %100 kalır. Ek kriter artırıldığında temel writing rubriği otomatik azalır.</p></div>
                <div className="field"><span className="field__label">Kaç üzerinden?</span><div className="assignment-scale-row">{QUICK_SCALES.map((scale) => <button key={scale} type="button" className={`btn btn--sm ${maxPoints === scale ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setMaxPoints(scale)}>{scale}</button>)}<input aria-label="Özel puan ölçeği" type="number" min={1} max={1000} step={0.01} className="input-control" value={maxPoints} onChange={(event) => setMaxPoints(Number(event.target.value))} /></div></div>
                <div className="assignment-score-preview"><div><strong>Temel writing rubriği</strong><span>%{rubricWeight}</span></div><div className={vocabularyRequirements.trim() ? '' : 'is-disabled'}><strong>Ünite kelimeleri</strong><span>%{vocabularyWeight}</span></div><div className={patternRequirements.trim() ? '' : 'is-disabled'}><strong>Zorunlu kalıplar</strong><span>%{patternWeight}</span></div><div className="is-total"><CheckCircle2 size={16} /><strong>Toplam</strong><span>%100</span></div></div>
                <ExtraWeight label="Ünite / konu kelimeleri" value={vocabularyWeight} disabled={!vocabularyRequirements.trim()} onChange={(value) => changeExtraWeight('vocabulary', value)} />
                <ExtraWeight label="Zorunlu kalıplar" value={patternWeight} disabled={!patternRequirements.trim()} onChange={(value) => changeExtraWeight('patterns', value)} />
                {!validScale && <p className="field__error">Puan ölçeği 1 ile 1000 arasında olmalı.</p>}
              </section>}

              {step === 4 && <div className="assignment-final-grid"><ClassPicker classes={classes} selected={selectedClasses} onToggle={toggleClass} /><section className="card card--padded assessment-form-section"><div><span className="assignment-step-kicker">ADIM 4</span><h2>Yayın ayarları</h2></div><label className="checkbox-row"><input type="checkbox" checked={sharedWithSchool} onChange={(event) => setSharedWithSchool(event.target.checked)} /><span>Aynı okuldaki diğer öğretmenler bu ödevi kendi sınıflarına atayabilsin.</span></label><label className="checkbox-row"><input type="checkbox" checked={showAiImmediately} onChange={(event) => setShowAiImmediately(event.target.checked)} /><span>Normal dijital writinglerde AI öneri puanını öğretmen onayından önce göster.</span></label><p className="field__hint">OCR ile içeri alınan kağıtlarda öğretmen onayı her zaman zorunludur.</p></section></div>}

              <div className="assignment-wizard-footer">
                <button type="button" className="btn btn--secondary" disabled={step === 1 || saving} onClick={() => setStep((current) => Math.max(1, current - 1))}><ArrowLeft size={16} /> Geri</button>
                {step < 4 ? <button type="button" className="btn btn--primary" disabled={saving || (step === 1 && !contentValid) || (step === 3 && !validScale)} onClick={() => setStep((current) => Math.min(4, current + 1))}>Devam <ArrowRight size={16} /></button> : <div className="assignment-publish-actions"><button type="button" className="btn btn--secondary" disabled={!canSave || saving} onClick={() => save('draft')}><Save size={16} /> Taslak kaydet</button><button type="button" className="btn btn--primary" disabled={!canSave || saving} onClick={() => save('published')}><Send size={16} /> Ödevi yayınla</button></div>}
              </div>
            </main>

            <aside className="card card--padded assignment-wizard-summary">
              <span className="assignment-step-kicker">ÖDEV ÖZETİ</span><h3>{title.trim() || 'Başlıksız ödev'}</h3><dl><div><dt>Tür</dt><dd>{writingTypeId.replaceAll('_', ' ')}</dd></div><div><dt>Seviye</dt><dd>{level}</dd></div><div><dt>Kelime</dt><dd>{minWords}–{maxWords}</dd></div><div><dt>Puan</dt><dd>{maxPoints}</dd></div><div><dt>Sınıf</dt><dd>{selectedClasses.length || '—'}</dd></div><div><dt>Hedef dil</dt><dd>{vocabularyWeight + patternWeight ? `%${vocabularyWeight + patternWeight}` : 'Yok'}</dd></div></dl>
              <div className="assignment-summary-checks"><span className={contentValid ? 'is-ok' : ''}>{contentValid && <Check size={14} />} İçerik</span><span className={validScale ? 'is-ok' : ''}>{validScale && <Check size={14} />} Puanlama</span><span className={selectedClasses.length ? 'is-ok' : ''}>{selectedClasses.length > 0 && <Check size={14} />} Sınıf seçimi</span></div>
            </aside>
          </div>
        </div>
      )}
    </>
  );
}

function ClassPicker({ classes, selected, onToggle }: { classes: ClassMeta[]; selected: string[]; onToggle: (id: string) => void }) {
  return <section className="card card--padded assessment-form-section"><div><h2>Sınıflar</h2><p className="field__hint">Ödevin atanacağı sınıfları seç.</p></div>{classes.length === 0 && <p className="field__hint">Bu okulda sana atanmış sınıf bulunmuyor.</p>}<div className="assessment-class-grid">{classes.map((item) => <label key={item.id} className={`assessment-class-choice ${selected.includes(item.id) ? 'is-selected' : ''}`}><input type="checkbox" checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} /><span><strong>{item.name}</strong><span className="field__hint">{item.gradeLabel}</span></span></label>)}</div></section>;
}

function LanguageCard({ title, description, value, onChange, onFile }: { title: string; description: string; value: string; onChange: (value: string) => void; onFile: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return <section className="card card--padded assessment-form-section"><div><FileText size={18} /><h2>{title}</h2></div><p className="field__hint">{description}</p><textarea className="textarea-control" rows={8} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Her satıra bir kelime veya kalıp yazabilirsin…" /><label className="btn btn--secondary btn--sm" style={{ alignSelf: 'flex-start', cursor: 'pointer' }}><Upload size={15} /> TXT / MD yükle<input type="file" hidden accept=".txt,.md,text/plain,text/markdown" onChange={onFile} /></label></section>;
}

function ExtraWeight({ label, value, disabled, onChange }: { label: string; value: number; disabled: boolean; onChange: (value: number) => void }) {
  return <div className={`assignment-extra-weight ${disabled ? 'is-disabled' : ''}`}><div><strong>{label}</strong><span>%{value}</span></div><input type="range" min={0} max={50} step={1} value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} /><input type="number" min={0} max={50} step={1} className="input-control" value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} /></div>;
}
