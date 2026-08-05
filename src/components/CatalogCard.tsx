import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import type { CatalogTopic } from '../types/entities';
import { CefrLevelBadge } from './CefrLevelBadge';
import { WritingTypeBadge } from './WritingTypeBadge';

/** `to="#"` (no real detail page yet, e.g. admin's global-topic list) renders a plain, non-interactive card. */
export function CatalogCard({ topic, to }: { topic: CatalogTopic; to: string }) {
  const { t } = useTranslation();
  const clickable = to !== '#';

  const content = (
    <>
      <div className="catalog-card__header">
        <div className="catalog-card__badges">
          <WritingTypeBadge writingTypeId={topic.writingTypeId} />
          <CefrLevelBadge level={topic.level} />
        </div>
        <span className="badge badge--outline">{t(`catalogSource.${topic.sourceType}`)}</span>
      </div>
      <p className="catalog-card__title">{topic.title}</p>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {topic.prompt}
      </p>
      <div className="catalog-card__meta">
        <span className="catalog-card__meta-item">{topic.minWords}–{topic.maxWords} {t('common.words')}</span>
        <span className="catalog-card__meta-item"><Clock size={12} aria-hidden="true" />{topic.estimatedMinutes} {t('common.minutes')}</span>
        <span className="catalog-card__meta-item">{t(`difficulty.${topic.difficulty}`)}</span>
      </div>
    </>
  );

  if (!clickable) {
    return <div className="card card--padded catalog-card">{content}</div>;
  }

  return (
    <Link to={to} className="card card--padded catalog-card card--interactive" style={{ textDecoration: 'none', color: 'inherit' }}>
      {content}
    </Link>
  );
}
