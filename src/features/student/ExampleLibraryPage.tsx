import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import type { CefrLevel, WritingExample } from '../../types/entities';
import { CEFR_LEVELS } from '../../utils/cefr';
import { PageHeader } from '../../components/PageHeader';
import { CefrLevelBadge } from '../../components/CefrLevelBadge';
import { WritingTypeBadge } from '../../components/WritingTypeBadge';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { fetchExamples } from '../../services/exampleData';

const LEVELS = CEFR_LEVELS;

/** Shared by the student and teacher example-library screens (both allowed to browse, differ only in route prefix). */
export function ExampleLibraryPage({ basePath = '/student' }: { basePath?: string }) {
  const { t } = useTranslation();
  const [allExamples, setAllExamples] = useState<WritingExample[] | null>(null);
  const [query, setQuery] = useState('');
  const [levels, setLevels] = useState<CefrLevel[]>([...LEVELS]);

  useEffect(() => { fetchExamples().then(setAllExamples); }, []);

  const examples = useMemo(() => {
    if (!allExamples) return [];
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return allExamples
      .filter((example) => levels.includes(example.level))
      .filter((example) => !normalizedQuery || example.title.toLocaleLowerCase().includes(normalizedQuery) || example.text.toLocaleLowerCase().includes(normalizedQuery));
  }, [allExamples, levels, query]);

  const toggleLevel = (level: CefrLevel) => {
    setLevels((current) => current.includes(level) ? current.filter((item) => item !== level) : [...current, level]);
  };

  if (!allExamples) return <LoadingSkeleton height="12rem" />;

  return (
    <>
      <PageHeader title={t('examples.libraryTitle')} />

      <div className="library-filter-bar">
        <div className="input-with-action library-search">
          <input
            className="input-control"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('catalog.searchPlaceholder')}
            aria-label={t('common.search')}
          />
          <span className="input-with-action__action" style={{ pointerEvents: 'none' }}><Search size={16} aria-hidden="true" /></span>
        </div>
        <fieldset className="level-checkbox-filter">
          <legend className="field__hint">{t('catalog.levelFilter')}</legend>
          {LEVELS.map((level) => (
            <label key={level} className="level-checkbox-filter__item">
              <input type="checkbox" checked={levels.includes(level)} onChange={() => toggleLevel(level)} />
              <span>{level}</span>
            </label>
          ))}
        </fieldset>
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
