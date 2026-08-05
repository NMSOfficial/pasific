import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { CefrLevel, PerformanceBand, WritingExample } from '../../types/entities';
import { CEFR_LEVELS } from '../../utils/cefr';
import { PageHeader } from '../../components/PageHeader';
import { CefrLevelBadge } from '../../components/CefrLevelBadge';
import { WritingTypeBadge } from '../../components/WritingTypeBadge';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { fetchExamples } from '../../services/exampleData';

const LEVELS = CEFR_LEVELS;
const BANDS: PerformanceBand[] = ['developing', 'meets_expectations', 'strong', 'advanced'];

/** Shared by the student and teacher example-library screens (both allowed to browse, differ only in route prefix). */
export function ExampleLibraryPage({ basePath = '/student' }: { basePath?: string }) {
  const { t } = useTranslation();
  const [allExamples, setAllExamples] = useState<WritingExample[] | null>(null);
  const [level, setLevel] = useState<CefrLevel | 'all'>('all');
  const [band, setBand] = useState<PerformanceBand | 'all'>('all');

  useEffect(() => { fetchExamples().then(setAllExamples); }, []);

  const examples = useMemo(() => {
    if (!allExamples) return [];
    return allExamples
      .filter((e) => level === 'all' || e.level === level)
      .filter((e) => band === 'all' || e.performanceBand === band);
  }, [allExamples, level, band]);

  if (!allExamples) return <LoadingSkeleton height="12rem" />;

  return (
    <>
      <PageHeader title={t('examples.libraryTitle')} />

      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
        <select className="select-control" style={{ width: 'auto' }} value={level} onChange={(e) => setLevel(e.target.value as CefrLevel | 'all')} aria-label={t('catalog.levelFilter')}>
          <option value="all">{t('common.all')} — {t('catalog.levelFilter')}</option>
          {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select className="select-control" style={{ width: 'auto' }} value={band} onChange={(e) => setBand(e.target.value as PerformanceBand | 'all')} aria-label={t('examples.performanceFilter')}>
          <option value="all">{t('common.all')} — {t('examples.performanceFilter')}</option>
          {BANDS.map((b) => <option key={b} value={b}>{t(`performanceBand.${b}`)}</option>)}
        </select>
      </div>

      {examples.length === 0 ? (
        <EmptyState title={t('examples.noResults')} />
      ) : (
        <div className="card-grid">
          {examples.map((example) => (
            <Link
              key={example.id}
              to={`${basePath}/examples/${example.id}`}
              className="card card--padded catalog-card card--interactive"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="catalog-card__header">
                <div className="catalog-card__badges">
                  <WritingTypeBadge writingTypeId={example.writingTypeId} />
                  <CefrLevelBadge level={example.level} />
                </div>
                <span className="badge badge--primary">{t(`performanceBand.${example.performanceBand}`)}</span>
              </div>
              <p className="catalog-card__title">{example.title}</p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{example.overallScore}/100</p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
