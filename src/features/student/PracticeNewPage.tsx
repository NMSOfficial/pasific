import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { WRITING_TYPES } from '../../mock/writingTypes';
import type { CatalogTopic, CefrLevel, StudentProfile, WritingTypeId } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { fetchVisibleCatalogForSchool } from '../../services/contentData';
import { createDraftSubmission } from '../../services/submissionData';

const LEVELS: CefrLevel[] = ['B1', 'B2', 'C1', 'C2'];

export function PracticeNewPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const student = user as StudentProfile;

  const preselectedTopicId = searchParams.get('topicId') ?? undefined;
  const [catalog, setCatalog] = useState<CatalogTopic[] | null>(null);

  useEffect(() => { fetchVisibleCatalogForSchool(student.schoolId).then(setCatalog); }, [student.schoolId]);

  const preselected = catalog?.find((t2) => t2.id === preselectedTopicId);
  const fallback = catalog?.[0];

  const [writingType, setWritingType] = useState<WritingTypeId | undefined>();
  const [level, setLevel] = useState<CefrLevel | undefined>();
  const [topicId, setTopicId] = useState('');
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(30);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!catalog) return;
    setWritingType((prev) => prev ?? preselected?.writingTypeId ?? fallback?.writingTypeId ?? WRITING_TYPES[0].id);
    setLevel((prev) => prev ?? preselected?.level ?? fallback?.level ?? 'B2');
    setTopicId((prev) => prev || preselected?.id || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);

  const availableTopics = useMemo(() => {
    if (!catalog) return [];
    return catalog.filter((topic) => topic.writingTypeId === writingType && topic.level === level);
  }, [catalog, writingType, level]);

  const selectedTopic = availableTopics.find((topic) => topic.id === topicId) ?? availableTopics[0];

  if (!catalog || writingType === undefined || level === undefined) return <LoadingSkeleton height="12rem" />;

  const handleStart = async () => {
    if (!selectedTopic) return;
    setStarting(true);
    const submission = await createDraftSubmission({
      isPractice: true,
      studentId: student.id,
      schoolId: student.schoolId,
      writingTypeId: selectedTopic.writingTypeId,
      level: selectedTopic.level,
      topicTitle: selectedTopic.title,
    });
    navigate(`/student/practice/${submission.id}/write`, {
      state: { topicId: selectedTopic.id, timerMinutes: timerEnabled ? timerMinutes : undefined },
    });
  };

  return (
    <>
      <PageHeader title={t('practice.newTitle')} />

      <div className="card card--padded" style={{ maxWidth: '32rem', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <div className="field">
          <label className="field__label" htmlFor="practice-type">{t('practice.writingType')}</label>
          <select id="practice-type" className="select-control" value={writingType} onChange={(e) => { setWritingType(e.target.value as WritingTypeId); setTopicId(''); }}>
            {WRITING_TYPES.map((wt) => <option key={wt.id} value={wt.id}>{t(wt.labelKey)}</option>)}
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="practice-level">{t('practice.level')}</label>
          <select id="practice-level" className="select-control" value={level} onChange={(e) => { setLevel(e.target.value as CefrLevel); setTopicId(''); }}>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div className="field">
          <label className="field__label" htmlFor="practice-topic">{t('practice.topic')}</label>
          <select id="practice-topic" className="select-control" value={selectedTopic?.id ?? ''} onChange={(e) => setTopicId(e.target.value)}>
            {availableTopics.length === 0 && <option value="">{t('catalog.noResults')}</option>}
            {availableTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}
          </select>
        </div>

        {selectedTopic && (
          <div style={{ background: 'var(--color-surface-alt)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
            <p style={{ marginBottom: 4 }}>{selectedTopic.prompt}</p>
            <p className="field__hint">{selectedTopic.minWords}–{selectedTopic.maxWords} {t('common.words')} · {selectedTopic.estimatedMinutes} {t('common.minutes')}</p>
          </div>
        )}

        <div className="field">
          <label className="checkbox-row">
            <input type="checkbox" checked={timerEnabled} onChange={(e) => setTimerEnabled(e.target.checked)} />
            <span>{t('practice.enableTimer')}</span>
          </label>
          {timerEnabled && (
            <input
              type="number"
              className="input-control"
              style={{ maxWidth: '8rem', marginTop: 'var(--space-2)' }}
              value={timerMinutes}
              min={5}
              max={120}
              onChange={(e) => setTimerMinutes(Number(e.target.value))}
              aria-label={t('practice.minutes')}
            />
          )}
        </div>

        <button type="button" className="btn btn--primary btn--lg" disabled={!selectedTopic || starting} onClick={handleStart}>
          {t('practice.start')}
        </button>
      </div>
    </>
  );
}
