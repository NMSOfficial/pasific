import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, PlusCircle, X } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import { standardRubric } from '../../mock/rubric';
import { WRITING_TYPES } from '../../mock/writingTypes';
import type { AiSupportMode, AssignmentRubric, CatalogTopic, CefrLevel, TeacherProfile, WritingTypeId } from '../../types/entities';
import { CEFR_LEVELS } from '../../utils/cefr';
import { PageHeader } from '../../components/PageHeader';
import { CatalogCard } from '../../components/CatalogCard';
import { RubricEditor } from '../../components/RubricEditor';
import { CefrLevelBadge } from '../../components/CefrLevelBadge';
import { WritingTypeBadge } from '../../components/WritingTypeBadge';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { fetchVisibleCatalogForSchool, createSchoolCatalogTopic } from '../../services/contentData';
import { fetchTeacherClasses, type ClassMeta } from '../../services/teacherData';
import { createAssignment } from '../../services/assignmentData';

const STEPS = ['stepTopic', 'stepDetails', 'stepAiSupport', 'stepScoring', 'stepReview'] as const;
const LEVELS = CEFR_LEVELS;
const AI_MODES: AiSupportMode[] = ['none', 'critical_alerts_only', 'guided_practice'];

export function AssignmentBuilderPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedTopicId = searchParams.get('topicId') ?? undefined;
  const teacher = user as TeacherProfile;

  const [step, setStep] = useState(0);
  const [topicMode, setTopicMode] = useState<'existing' | 'new'>('existing');
  const [selectedTopicId, setSelectedTopicId] = useState<string | undefined>();
  const [newTopic, setNewTopic] = useState({ title: '', prompt: '', writingTypeId: WRITING_TYPES[0].id as WritingTypeId, level: 'B2' as CefrLevel, minWords: 200, maxWords: 260 });

  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [writingTypeId, setWritingTypeId] = useState<WritingTypeId>(WRITING_TYPES[0].id);
  const [level, setLevel] = useState<CefrLevel>('B2');
  const [minWords, setMinWords] = useState(200);
  const [maxWords, setMaxWords] = useState(260);
  const [dueAt, setDueAt] = useState('');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | undefined>(undefined);
  const [classIds, setClassIds] = useState<string[]>([]);
  const [instructions, setInstructions] = useState('');
  const [referenceText, setReferenceText] = useState('');
  const [topicId, setTopicId] = useState<string | undefined>();

  const [aiSupportMode, setAiSupportMode] = useState<AiSupportMode>('none');
  const [rubric, setRubric] = useState<AssignmentRubric>(standardRubric(`rubric_${Date.now()}`));
  const [showAiScoreImmediately, setShowAiScoreImmediately] = useState(true);
  const [publishing, setPublishing] = useState(false);

  const [availableTopics, setAvailableTopics] = useState<CatalogTopic[] | null>(null);
  const [teacherClasses, setTeacherClasses] = useState<ClassMeta[]>([]);

  useEffect(() => {
    if (teacher.schoolIds[0]) fetchVisibleCatalogForSchool(teacher.schoolIds[0]).then(setAvailableTopics);
    fetchTeacherClasses(teacher.id).then(setTeacherClasses);
  }, [teacher.id, teacher.schoolIds]);

  const applyTopic = (topic: CatalogTopic) => {
    setTitle(topic.title);
    setPrompt(topic.prompt);
    setWritingTypeId(topic.writingTypeId);
    setLevel(topic.level);
    setMinWords(topic.minWords);
    setMaxWords(topic.maxWords);
    setTopicId(topic.id);
  };

  const handleSelectExisting = (topic: CatalogTopic) => {
    setSelectedTopicId(topic.id);
    applyTopic(topic);
  };

  // Arriving from a Catalog card's "Assign" button — pre-select that exact
  // topic instead of making the teacher find and click it again.
  useEffect(() => {
    if (!preselectedTopicId || !availableTopics) return;
    const topic = availableTopics.find((t2) => t2.id === preselectedTopicId);
    if (topic) handleSelectExisting(topic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedTopicId, availableTopics]);

  const handleCreateTopicAndContinue = async () => {
    const created = await createSchoolCatalogTopic({
      title: newTopic.title,
      prompt: newTopic.prompt,
      writingTypeId: newTopic.writingTypeId,
      level: newTopic.level,
      minWords: newTopic.minWords,
      maxWords: newTopic.maxWords,
      schoolId: teacher.schoolIds[0],
      createdBy: teacher.id,
    });
    applyTopic(created);
    setStep(1);
  };

  const toggleClass = (id: string) => {
    setClassIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  const totalWeight = rubric.criteria.filter((c) => c.enabled).reduce((sum, c) => sum + c.weight, 0);

  const canGoNext = () => {
    if (step === 0) return topicMode === 'existing' ? !!selectedTopicId : false;
    if (step === 1) return title.trim().length > 0 && prompt.trim().length > 0 && dueAt.length > 0 && classIds.length > 0;
    if (step === 3) return totalWeight === 100;
    return true;
  };

  const handlePublish = async (status: 'draft' | 'published') => {
    setPublishing(true);
    await createAssignment({
      title,
      prompt,
      writingTypeId,
      level,
      minWords,
      maxWords,
      dueAt,
      timeLimitMinutes,
      classIds,
      instructions: instructions || undefined,
      referenceText: referenceText || undefined,
      aiSupportMode,
      rubric,
      showAiScoreImmediately,
      status,
      createdBy: teacher.id,
      schoolId: teacher.schoolIds[0],
      topicId,
    });
    navigate('/teacher/assignments');
  };

  if (!availableTopics) return <LoadingSkeleton height="12rem" />;

  return (
    <>
      <PageHeader title={t('teacher.assignments.createNew')} />

      <div className="auth-stepper" style={{ justifyContent: 'flex-start', marginBottom: 'var(--space-6)' }}>
        {STEPS.map((key, i) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span className={`auth-stepper__dot ${step === i ? 'is-active' : ''} ${step > i ? 'is-done' : ''}`}>
              {step > i ? <CheckCircle2 size={13} /> : i + 1}
            </span>
            <span style={{ fontSize: 'var(--text-sm)', color: step === i ? 'var(--color-text)' : 'var(--color-text-faint)' }}>{t(`teacher.assignments.${key}`)}</span>
            {i < STEPS.length - 1 && <span className="auth-stepper__line" style={{ width: '2rem' }} />}
          </div>
        ))}
      </div>

      {step < 4 && (
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          {step > 0 && <button type="button" className="btn btn--secondary" onClick={() => setStep((s) => s - 1)}>{t('common.back')}</button>}
          <button type="button" className="btn btn--primary" disabled={!canGoNext()} onClick={() => setStep((s) => s + 1)}>{t('common.next')}</button>
        </div>
      )}

      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-semibold)' }}>{t('teacher.assignments.stepTopic')}</h2>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => setTopicMode((m) => (m === 'new' ? 'existing' : 'new'))}
              aria-label={topicMode === 'new' ? t('common.cancel') : t('teacher.assignments.createNewTopic')}
              title={topicMode === 'new' ? t('common.cancel') : t('teacher.assignments.createNewTopic')}
            >
              {topicMode === 'new' ? <X size={16} aria-hidden="true" /> : <PlusCircle size={16} aria-hidden="true" />}
            </button>
          </div>

          {topicMode === 'existing' ? (
            <div className="card-grid">
              {availableTopics.map((topic) => (
                <div key={topic.id} onClick={() => handleSelectExisting(topic)} style={{ cursor: 'pointer', outline: selectedTopicId === topic.id ? '2px solid var(--color-primary)' : 'none', borderRadius: 'var(--radius-lg)' }}>
                  <CatalogCard topic={topic} to="#" />
                </div>
              ))}
            </div>
          ) : (
            <div className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '32rem' }}>
              <div className="field">
                <label className="field__label" htmlFor="nt-title">{t('teacher.assignments.title')}</label>
                <input id="nt-title" className="input-control" value={newTopic.title} onChange={(e) => setNewTopic((v) => ({ ...v, title: e.target.value }))} />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="nt-prompt">{t('teacher.assignments.prompt')}</label>
                <textarea id="nt-prompt" className="textarea-control" value={newTopic.prompt} onChange={(e) => setNewTopic((v) => ({ ...v, prompt: e.target.value }))} />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="nt-writing-type">{t('teacher.assignments.writingType')}</label>
                <select id="nt-writing-type" className="select-control" value={newTopic.writingTypeId} onChange={(e) => setNewTopic((v) => ({ ...v, writingTypeId: e.target.value as WritingTypeId }))}>
                  {WRITING_TYPES.map((wt) => <option key={wt.id} value={wt.id}>{t(wt.labelKey)}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field__label" htmlFor="nt-level">{t('teacher.assignments.level')}</label>
                <select id="nt-level" className="select-control" value={newTopic.level} onChange={(e) => setNewTopic((v) => ({ ...v, level: e.target.value as CefrLevel }))}>
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <button type="button" className="btn btn--primary" disabled={!newTopic.title || !newTopic.prompt} onClick={handleCreateTopicAndContinue}>
                {t('common.continue')}
              </button>
              <p className="field__hint">{t('catalog.scopeNote')}</p>
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '36rem' }}>
          <div className="field">
            <label className="field__label" htmlFor="ab-title">{t('teacher.assignments.title')}</label>
            <input id="ab-title" className="input-control" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="ab-prompt">{t('teacher.assignments.prompt')}</label>
            <textarea id="ab-prompt" className="textarea-control" value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <div className="field" style={{ flex: 1 }}>
              <label className="field__label" htmlFor="ab-min-words">{t('teacher.assignments.minWords')}</label>
              <input id="ab-min-words" type="number" className="input-control" value={minWords} onChange={(e) => setMinWords(Number(e.target.value))} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="field__label" htmlFor="ab-max-words">{t('teacher.assignments.maxWords')}</label>
              <input id="ab-max-words" type="number" className="input-control" value={maxWords} onChange={(e) => setMaxWords(Number(e.target.value))} />
            </div>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="ab-due-at">{t('teacher.assignments.dueAt')}</label>
            <input id="ab-due-at" type="datetime-local" className="input-control" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="ab-time-limit">{t('teacher.assignments.timeLimit')}</label>
            <input id="ab-time-limit" type="number" className="input-control" value={timeLimitMinutes ?? ''} onChange={(e) => setTimeLimitMinutes(e.target.value ? Number(e.target.value) : undefined)} />
          </div>
          <fieldset className="field" style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend className="field__label" style={{ padding: 0, marginBottom: 'var(--space-2)' }}>{t('teacher.assignments.classes')}</legend>
            {teacherClasses.map((c) => (
              <label key={c.id} className="checkbox-row">
                <input type="checkbox" checked={classIds.includes(c.id)} onChange={() => toggleClass(c.id)} />
                <span>{c.name}</span>
              </label>
            ))}
          </fieldset>
          <div className="field">
            <label className="field__label" htmlFor="ab-instructions">{t('teacher.assignments.instructions')}</label>
            <textarea id="ab-instructions" className="textarea-control" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="ab-reference-text">{t('teacher.assignments.referenceText')}</label>
            <textarea id="ab-reference-text" className="textarea-control" value={referenceText} onChange={(e) => setReferenceText(e.target.value)} rows={2} />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxWidth: '32rem' }}>
          {AI_MODES.map((mode) => (
            <label key={mode} className="checkbox-row" style={{ alignItems: 'center' }}>
              <input type="radio" name="aiSupportMode" checked={aiSupportMode === mode} onChange={() => setAiSupportMode(mode)} />
              <span>{t(`aiSupportMode.${mode}`)}</span>
            </label>
          ))}
          <p className="field__hint">{t('aiSupportMode.none')} {t('common.recommended').toLowerCase()}.</p>
        </div>
      )}

      {step === 3 && (
        <div style={{ maxWidth: '36rem', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <RubricEditor rubric={rubric} onChange={setRubric} />
          <label className="checkbox-row">
            <input type="checkbox" checked={showAiScoreImmediately} onChange={(e) => setShowAiScoreImmediately(e.target.checked)} />
            <span>{t('teacher.assignments.showAiScoreImmediately')}</span>
          </label>
        </div>
      )}

      {step === 4 && (
        <div className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxWidth: '36rem' }}>
          <h2 style={{ fontSize: 'var(--text-lg)' }}>{t('teacher.assignments.reviewTitle')}</h2>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <WritingTypeBadge writingTypeId={writingTypeId} />
            <CefrLevelBadge level={level} />
            {rubric.isCustom && <span className="badge badge--warning">{t('rubric.customRubric')}</span>}
          </div>
          <p style={{ fontWeight: 'var(--weight-semibold)' }}>{title}</p>
          <p style={{ color: 'var(--color-text-muted)' }}>{prompt}</p>
          <p className="field__hint">{minWords}–{maxWords} {t('common.words')} · {classIds.map((id) => teacherClasses.find((c) => c.id === id)?.name).join(', ')}</p>
          <p className="field__hint">{t('aiSupportMode.' + aiSupportMode)}</p>
          {rubric.isCustom && <p className="field__hint">{t('rubric.customRubricWarning')}</p>}
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button type="button" className="btn btn--secondary" disabled={publishing} onClick={() => handlePublish('draft')}>{t('teacher.assignments.saveDraft')}</button>
            <button type="button" className="btn btn--primary" disabled={publishing} onClick={() => handlePublish('published')}>{t('teacher.assignments.publish')}</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <button type="button" className="btn btn--secondary" onClick={() => setStep((s) => s - 1)}>{t('common.back')}</button>
        </div>
      )}
    </>
  );
}
