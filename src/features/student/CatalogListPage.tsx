import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import { WRITING_TYPES } from '../../mock/writingTypes';
import type { CatalogTopic, CefrLevel, StudentProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { CatalogCard } from '../../components/CatalogCard';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { fetchVisibleCatalogForSchool } from '../../services/contentData';

const LEVELS: CefrLevel[] = ['B1', 'B2', 'C1', 'C2'];

export function CatalogListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const student = user as StudentProfile;

  const [catalog, setCatalog] = useState<CatalogTopic[] | null>(null);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<CefrLevel | 'all'>('all');
  const [writingType, setWritingType] = useState<string>('all');

  useEffect(() => { fetchVisibleCatalogForSchool(student.schoolId).then(setCatalog); }, [student.schoolId]);

  const topics = useMemo(() => {
    if (!catalog) return [];
    return catalog
      .filter((topic) => level === 'all' || topic.level === level)
      .filter((topic) => writingType === 'all' || topic.writingTypeId === writingType)
      .filter((topic) => !query.trim() || topic.title.toLowerCase().includes(query.trim().toLowerCase()) || topic.tags.some((tag) => tag.includes(query.trim().toLowerCase())));
  }, [catalog, level, writingType, query]);

  if (!catalog) return <LoadingSkeleton height="12rem" />;

  return (
    <>
      <PageHeader title={t('nav.student.catalog')} />

      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
        <div className="input-with-action" style={{ maxWidth: '18rem' }}>
          <input
            className="input-control"
            placeholder={t('catalog.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t('common.search')}
            style={{ paddingRight: '2.5rem' }}
          />
          <span className="input-with-action__action" style={{ pointerEvents: 'none' }}><Search size={16} aria-hidden="true" /></span>
        </div>
        <select className="select-control" style={{ width: 'auto' }} value={level} onChange={(e) => setLevel(e.target.value as CefrLevel | 'all')} aria-label={t('catalog.levelFilter')}>
          <option value="all">{t('common.all')} — {t('catalog.levelFilter')}</option>
          {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select className="select-control" style={{ width: 'auto' }} value={writingType} onChange={(e) => setWritingType(e.target.value)} aria-label={t('catalog.typeFilter')}>
          <option value="all">{t('common.all')} — {t('catalog.typeFilter')}</option>
          {WRITING_TYPES.map((wt) => <option key={wt.id} value={wt.id}>{t(wt.labelKey)}</option>)}
        </select>
      </div>

      {topics.length === 0 ? (
        <EmptyState title={t('catalog.noResults')} description={t('catalog.noResultsDescription')} />
      ) : (
        <div className="card-grid">
          {topics.map((topic) => (
            <CatalogCard key={topic.id} topic={topic} to={`/student/catalog/${topic.id}`} />
          ))}
        </div>
      )}
    </>
  );
}
