import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { WRITING_TYPES } from '../../mock/writingTypes';
import type { CatalogTopic, CefrLevel, StudentProfile, WritingTypeId } from '../../types/entities';
import { CEFR_LEVELS } from '../../utils/cefr';
import { PageHeader } from '../../components/PageHeader';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { WritingTypeBadge } from '../../components/WritingTypeBadge';
import { CefrLevelBadge } from '../../components/CefrLevelBadge';
import { EmptyState } from '../../components/EmptyState';
import { fetchVisibleCatalogForSchool } from '../../services/contentData';
import { createDraftSubmission } from '../../services/submissionData';

const LEVELS = CEFR_LEVELS;

export function PracticeNewPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const student = user as StudentProfile;

  const preselectedTopicId = searchParams.get('topicId') ?? undefined;
  const [catalog, setCatalog] = useState<CatalogTopic[] | null>(null);

  useEffect(() => { fetchVisibleCatalogForSchool(student.schoolId).then(setCatalog); }, [student.schoolId]);

  // Filters only narrow the list below — they never force a single match,
  // so the student can always see and pick from every topic in the
  // catalog, not just the one that happens to match both filters at once.
  const [writingType, setWritingType] = useState<WritingTypeId | 'all'>('all');
  const [level, setLevel] = useState<CefrLevel | 'all'>('all');
  const [topicId, setTopicId] = useState<string | undefined>(preselectedTopicId);
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(30);
  const [starting, setStarting] = useState(false);

  const availableTopics = useMemo(() => {
    if (!catalog) return [];
    return catalog
      .filter((topic) => writingType === 'all' || topic.writingTypeId === writingType)
      .filter((topic) => level === 'all' || topic.level === level);
  }, [catalog, writingType, level]);

  const selectedTopic = catalog?.find((topic) => topic.id === topicId);

  if (!catalog) return <LoadingSkeleton height="12rem" />;

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

      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
        <select className="select-control" style={{ width: 'auto' }} value={writingType} onChange={(e) => setWritingType(e.target.value as WritingTypeId | 'all')} aria-label={t('practice.writingType')}>
          <option value="all">{t('common.all')} — {t('practice.writingType')}</option>
          {WRITING_TYPES.map((wt) => <option key={wt.id} value={wt.id}>{t(wt.labelKey)}</option>)}
        </select>
        <select className="select-control" style={{ width: 'auto' }} value={level} onChange={(e) => setLevel(e.target.value as CefrLevel | 'all')} aria-label={t('practice.level')}>
          <option value="all">{t('common.all')} — {t('practice.level')}</option>
          {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {availableTopics.length === 0 ? (
        <EmptyState title={t('catalog.noResults')} />
      ) : (
        <div className="card-grid" style={{ marginBottom: 'var(--space-5)' }}>
          {availableTopics.map((topic) => (
            <div
              key={topic.id}
              role="button"
              tabIndex={0}
              onClick={() => setTopicId(topic.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setTopicId(topic.id); }}
              style={{ cursor: 'pointer', outline: topicId === topic.id ? '2px solid var(--color-primary)' : 'none', borderRadius: 'var(--radius-lg)' }}
            >
              <div className="card card--padded catalog-card">
                <div className="catalog-card__header">
                  <div className="catalog-card__badges">
                    <WritingTypeBadge writingTypeId={topic.writingTypeId} />
                    <CefrLevelBadge level={topic.level} />
                  </div>
                </div>
                <p className="catalog-card__title">{topic.title}</p>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {topic.prompt}
                </p>
                <p className="field__hint">{topic.minWords}–{topic.maxWords} {t('common.words')} · {topic.estimatedMinutes} {t('common.minutes')}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card card--padded" style={{ maxWidth: '32rem', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
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
