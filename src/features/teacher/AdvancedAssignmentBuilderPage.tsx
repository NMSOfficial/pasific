import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookCopy, CheckCircle2, FileText, SlidersHorizontal, Upload } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import { standardCriteria } from '../../mock/rubric';
import { WRITING_TYPES } from '../../mock/writingTypes';
import { CEFR_LEVELS } from '../../utils/cefr';
import type { AssignmentRubric, CefrLevel, TeacherProfile, WritingTypeId } from '../../types/entities';
import type { AdvancedScoringBreakdown, SchoolAssignmentTemplate } from '../../types/assessment';
import { PageHeader } from '../../components/PageHeader';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { fetchVisibleCatalogForSchool } from '../../services/contentData';
import { fetchTeacherClasses, type ClassMeta } from '../../services/teacherData';
import {
  adoptSharedAssignment,
  createAdvancedWritingAssignment,
  fetchSchoolSharedAssignments,
} from '../../services/assessmentData';

const QUICK_SCALES = [5, 10, 20, 50, 100];

function scaleRubric(
  baseWeight: number,
  vocabularyWeight: number,
  patternWeight: number,
  vocabularyRequirements: string,
  patternRequirements: string,
): AssignmentRubric {
  const baseCriteria = standardCriteria().map((criterion) => ({
    ...criterion,
    id: crypto.randomUUID(),
    weight: Number((baseWeight / 5).toFixed(2)),
    enabled: baseWeight > 0,
    isCustom: baseWeight !== 100,
  }));

  const extras = [];
  if (vocabularyWeight > 0 && vocabularyRequirements.trim()) {
    extras.push({
      id: crypto.randomUUID(),
      key: 'required_vocabulary',
      nameKey: 'Required vocabulary usage',
      descriptionKey: undefined,
      weight: vocabularyWeight,
      maxScore: 5,
      isCustom: true,
      isCore: false,
      enabled: true,
    });
  }
  if (patternWeight > 0 && patternRequirements.trim()) {
    extras.push({
      id: crypto.randomUUID(),
      key: 'required_patterns',
      nameKey: 'Required writing patterns',
      descriptionKey: undefined,
      weight: patternWeight,
      maxScore: 5,
      isCustom: true,
      isCore: false,
      enabled: true,
    });
  }

  return {
    id: crypto.randomUUID(),
    isCustom: extras.length > 0 || baseWeight !== 100,
    criteria: [...baseCriteria, ...extras],
  };
}

function localTextFile(event: ChangeEvent<HTMLInputElement>, setter: (value: string) => void) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 512 * 1024 || !/\.(txt|md)$/i.test(file.name)) {
    event.target.value = '';
    return;
  }
  void file.text().then(setter);
  event.target.value = '';
}

export function AdvancedAssignmentBuilderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const teacher = user as TeacherProfile;
  const schoolId = teacher.schoolIds[0];

  const [mode, setMode] = useState<'create' | 'shared'>('create');
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
  const [scoring, setScoring] = useState<AdvancedScoringBreakdown>({ rubric: 100, vocabulary: 0, patterns: 0 });
  const [sharedWithSchool, setSharedWithSchool] = useState(true);
  const [showAiImmediately, setShowAiImmediately] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!schoolId) return;
    Promise.all([
      fetchTeacherClasses(teacher.id),
      fetchSchoolSharedAssignments(schoolId),
      fetchVisibleCatalogForSchool(schoolId),
    ]).then(([classRows, sharedRows, topicRows]) => {
      setClasses(classRows);
      setShared(sharedRows);
      setTopics(topicRows);
    });
  }, [schoolId, teacher.id]);

  useEffect(() => {
    if (!vocabularyRequirements.trim() && scoring.vocabulary !== 0) {
      setScoring((current) => ({ ...current, rubric: current.rubric + current.vocabulary, vocabulary: 0 }));
    }
  }, [vocabularyRequirements, scoring.vocabulary]);

  useEffect(() => {
    if (!patternRequirements.trim() && scoring.patterns !== 0) {
      setScoring((current) => ({ ...current, rubric: current.rubric + current.patterns, patterns: 0 }));
    }
  }, [patternRequirements, scoring.patterns]);

  const totalWeight = scoring.rubric + scoring.vocabulary + scoring.patterns;
  const canSave = title.trim() && prompt.trim() && dueAt && selectedClasses.length > 0 && totalWeight === 100 && maxPoints > 0;
  const selectedTopic = useMemo(() => topics?.find((topic) => topic.id === topicId), [topics, topicId]);

  const useTopic = (id: string) => {
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

  const toggleClass = (classId: string) => {
    setSelectedClasses((current) => current.includes(classId)
      ? current.filter((id) => id !== classId)
      : [...current, classId]);
  };

  const setWeight = (key: keyof AdvancedScoringBreakdown, value: number) => {
    const next = Math.max(0, Math.min(100, value));
    setScoring((current) => ({ ...current, [key]: next }));
  };

  const handleSave = async (status: 'draft' | 'published') => {
    if (!schoolId || !canSave) return;
    setSaving(true);
    setMessage(null);
    try {
      const rubric = scaleRubric(
        scoring.rubric,
        scoring.vocabulary,
        scoring.patterns,
        vocabularyRequirements,
        patternRequirements,
      );
      await createAdvancedWritingAssignment({
        title: title.trim(),
        prompt: prompt.trim(),
        writingTypeId,
        level,
        minWords,
        maxWords,
        dueAt: new Date(dueAt).toISOString(),
        timeLimitMinutes,
        classIds: selectedClasses,
        instructions: instructions.trim() || undefined,
        referenceText: referenceText.trim() || undefined,
        vocabularyRequirements: vocabularyRequirements.trim() || undefined,
        patternRequirements: patternRequirements.trim() || undefined,
        maxPoints,
        scoringBreakdown: scoring,
        rubric,
        aiSupportMode: 'none',
        showAiScoreImmediately: showAiImmediately,
        sharedWithSchool,
        status,
        createdBy: teacher.id,
        schoolId,
        topicId: selectedTopic?.id,
      });
      navigate('/teacher/assignments');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ödev kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const handleAdopt = async () => {
    if (!selectedShared || selectedClasses.length === 0) return;
    setSaving(true);
    setMessage(null);
    try {
      const count = await adoptSharedAssignment(selectedShared, selectedClasses);
      setMessage(`${count} sınıfa atandı.`);
      setSelectedClasses([]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ödev sınıflara atanamadı.');
    } finally {
      setSaving(false);
    }
  };

  if (!classes || !shared || !topics) return <LoadingSkeleton height="14rem" />;

  return (
    <>
      <PageHeader title="Writing ödevi oluştur" subtitle="Konu, hedef dil, puan ölçeği ve okul içi paylaşımı tek yerden yönet." />

      <div className="segmented-control" style={{ marginBottom: 'var(--space-6)' }}>
        <button type="button" className={`segmented-control__option ${mode === 'create' ? 'is-active' : ''}`} onClick={() => { setMode('create'); setSelectedClasses([]); }}>
          Yeni ödev
        </button>
        <button type="button" className={`segmented-control__option ${mode === 'shared' ? 'is-active' : ''}`} onClick={() => { setMode('shared'); setSelectedClasses([]); }}>
          Okul ödevleri
        </button>
      </div>

      {message && <div className="card card--padded" style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text)' }}>{message}</div>}

      {mode === 'shared' ? (
        <div className="assessment-two-column">
          <section className="card card--padded">
            <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>Okuldaki paylaşılan ödevler</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {shared.length === 0 && <p className="field__hint">Henüz paylaşılan bir ödev yok.</p>}
              {shared.map((assignment) => (
                <button
                  key={assignment.id}
                  type="button"
                  className={`card card--padded card--interactive assessment-select-card ${selectedShared === assignment.id ? 'is-selected' : ''}`}
                  onClick={() => setSelectedShared(assignment.id)}
                >
                  <span style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)' }}>
                    <strong>{assignment.title}</strong>
                    <span className="badge badge--outline">{assignment.maxPoints} puan</span>
                  </span>
                  <span className="field__hint">{assignment.creatorName || 'Okul öğretmeni'} · {assignment.level}</span>
                  <span style={{ fontSize: 'var(--text-sm)', textAlign: 'left' }}>{assignment.prompt}</span>
                </button>
              ))}
            </div>
          </section>
          <ClassPicker classes={classes} selected={selectedClasses} onToggle={toggleClass} />
          <div className="assessment-sticky-action">
            <button type="button" className="btn btn--primary btn--lg" disabled={!selectedShared || selectedClasses.length === 0 || saving} onClick={handleAdopt}>
              <BookCopy size={17} aria-hidden="true" /> Seçili sınıflara ata
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
          <section className="card card--padded assessment-form-section">
            <h2>Konu ve temel bilgiler</h2>
            <div className="field">
              <label className="field__label" htmlFor="advanced-topic">Katalog konusu (opsiyonel)</label>
              <select id="advanced-topic" className="select-control" value={topicId} onChange={(event) => useTopic(event.target.value)}>
                <option value="">Manuel konu</option>
                {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title} · {topic.level}</option>)}
              </select>
            </div>
            <div className="assessment-field-grid">
              <div className="field assessment-field-span-2">
                <label className="field__label" htmlFor="assignment-title">Ödev başlığı</label>
                <input id="assignment-title" className="input-control" value={title} onChange={(event) => setTitle(event.target.value)} />
              </div>
              <div className="field assessment-field-span-2">
                <label className="field__label" htmlFor="assignment-prompt">Writing topic / prompt</label>
                <textarea id="assignment-prompt" className="textarea-control" rows={4} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="writing-type">Writing türü</label>
                <select id="writing-type" className="select-control" value={writingTypeId} onChange={(event) => setWritingTypeId(event.target.value as WritingTypeId)}>
                  {WRITING_TYPES.map((type) => <option key={type.id} value={type.id}>{type.id.replaceAll('_', ' ')}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="cefr-level">Seviye</label>
                <select id="cefr-level" className="select-control" value={level} onChange={(event) => setLevel(event.target.value as CefrLevel)}>
                  {CEFR_LEVELS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </div>
              <div className="field"><label className="field__label" htmlFor="min-words">Min. kelime</label><input id="min-words" type="number" className="input-control" min={20} value={minWords} onChange={(event) => setMinWords(Number(event.target.value))} /></div>
              <div className="field"><label className="field__label" htmlFor="max-words">Maks. kelime</label><input id="max-words" type="number" className="input-control" min={minWords} value={maxWords} onChange={(event) => setMaxWords(Number(event.target.value))} /></div>
              <div className="field"><label className="field__label" htmlFor="due-at">Son teslim</label><input id="due-at" type="datetime-local" className="input-control" value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></div>
              <div className="field"><label className="field__label" htmlFor="time-limit">Süre (dakika, opsiyonel)</label><input id="time-limit" type="number" className="input-control" min={1} value={timeLimitMinutes ?? ''} onChange={(event) => setTimeLimitMinutes(event.target.value ? Number(event.target.value) : undefined)} /></div>
              <div className="field assessment-field-span-2"><label className="field__label" htmlFor="instructions">Ek yönergeler</label><textarea id="instructions" className="textarea-control" rows={2} value={instructions} onChange={(event) => setInstructions(event.target.value)} /></div>
              <div className="field assessment-field-span-2"><label className="field__label" htmlFor="reference">Referans metin (opsiyonel)</label><textarea id="reference" className="textarea-control" rows={2} value={referenceText} onChange={(event) => setReferenceText(event.target.value)} /></div>
            </div>
          </section>

          <section className="assessment-two-column">
            <LanguageRequirementCard
              title="Ünite / konu kelimeleri"
              description="Öğrencinin uygun biçimde kullanması beklenen kelime ve ifadeler. TXT/MD yükleyebilir, yapıştırabilir veya yazabilirsin."
              value={vocabularyRequirements}
              onChange={setVocabularyRequirements}
              onFile={(event) => localTextFile(event, setVocabularyRequirements)}
            />
            <LanguageRequirementCard
              title="Kullanılması gereken kalıplar"
              description="Örn. contrast linkers, thesis kalıbı, formal request yapısı veya dersin hedef cümle kalıpları."
              value={patternRequirements}
              onChange={setPatternRequirements}
              onFile={(event) => localTextFile(event, setPatternRequirements)}
            />
          </section>

          <section className="card card--padded assessment-form-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><SlidersHorizontal size={18} /><h2>Puanlama sistemi</h2></div>
            <p className="field__hint">AI içeride normalize edilmiş puan hesaplar; öğrenci ve öğretmen ekranında seçtiğin ölçek kullanılır.</p>
            <div className="field">
              <span className="field__label">Kaç üzerinden?</span>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {QUICK_SCALES.map((scale) => <button key={scale} type="button" className={`btn btn--sm ${maxPoints === scale ? 'btn--primary' : 'btn--secondary'}`} onClick={() => setMaxPoints(scale)}>{scale}</button>)}
                <input aria-label="Özel puan ölçeği" type="number" className="input-control" style={{ width: 110 }} min={1} max={1000} value={maxPoints} onChange={(event) => setMaxPoints(Number(event.target.value))} />
              </div>
            </div>
            <WeightControl label="Temel writing rubriği" value={scoring.rubric} onChange={(value) => setWeight('rubric', value)} />
            <WeightControl label="Ünite / konu kelimeleri" value={scoring.vocabulary} disabled={!vocabularyRequirements.trim()} onChange={(value) => setWeight('vocabulary', value)} />
            <WeightControl label="Zorunlu kalıplar" value={scoring.patterns} disabled={!patternRequirements.trim()} onChange={(value) => setWeight('patterns', value)} />
            <div className={`assessment-weight-total ${totalWeight === 100 ? 'is-valid' : 'is-invalid'}`}>
              {totalWeight === 100 ? <CheckCircle2 size={16} /> : null} Toplam: %{totalWeight} {totalWeight !== 100 && '— %100 olmalı'}
            </div>
          </section>

          <ClassPicker classes={classes} selected={selectedClasses} onToggle={toggleClass} />

          <section className="card card--padded assessment-form-section">
            <label className="checkbox-row"><input type="checkbox" checked={sharedWithSchool} onChange={(event) => setSharedWithSchool(event.target.checked)} /><span>Aynı okuldaki diğer öğretmenler bu ödevi kendi sınıflarına atayabilsin.</span></label>
            <label className="checkbox-row"><input type="checkbox" checked={showAiImmediately} onChange={(event) => setShowAiImmediately(event.target.checked)} /><span>AI öneri puanını öğretmen onayından önce öğrenciye göster.</span></label>
            <p className="field__hint">OCR ile içeri alınan el yazısı çalışmalarında bu ikinci ayar ne olursa olsun öğretmen onayı zorunludur.</p>
          </section>

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', paddingBottom: 'var(--space-8)' }}>
            <button type="button" className="btn btn--secondary btn--lg" disabled={!canSave || saving} onClick={() => handleSave('draft')}>Taslak kaydet</button>
            <button type="button" className="btn btn--primary btn--lg" disabled={!canSave || saving} onClick={() => handleSave('published')}>Yayınla</button>
          </div>
        </div>
      )}
    </>
  );
}

function ClassPicker({ classes, selected, onToggle }: { classes: ClassMeta[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <section className="card card--padded assessment-form-section">
      <h2>Sınıflar</h2>
      <div className="assessment-class-grid">
        {classes.map((item) => (
          <label key={item.id} className={`assessment-class-choice ${selected.includes(item.id) ? 'is-selected' : ''}`}>
            <input type="checkbox" checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} />
            <span><strong>{item.name}</strong><span className="field__hint">{item.gradeLabel}</span></span>
          </label>
        ))}
      </div>
    </section>
  );
}

function LanguageRequirementCard({ title, description, value, onChange, onFile }: {
  title: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  onFile: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <section className="card card--padded assessment-form-section">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><FileText size={17} /><h2>{title} <span className="field__hint">(opsiyonel)</span></h2></div>
      <p className="field__hint">{description}</p>
      <textarea className="textarea-control" rows={7} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Her satıra bir kelime/kalıp yazabilirsin…" />
      <label className="btn btn--secondary btn--sm" style={{ alignSelf: 'flex-start', cursor: 'pointer' }}>
        <Upload size={15} /> TXT / MD yükle
        <input type="file" accept=".txt,.md,text/plain,text/markdown" hidden onChange={onFile} />
      </label>
    </section>
  );
}

function WeightControl({ label, value, disabled = false, onChange }: { label: string; value: number; disabled?: boolean; onChange: (value: number) => void }) {
  return (
    <div className={`assessment-weight-row ${disabled ? 'is-disabled' : ''}`}>
      <div><strong>{label}</strong><span>%{value}</span></div>
      <input type="range" min={0} max={100} step={5} value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} />
      <input type="number" min={0} max={100} className="input-control" value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}
