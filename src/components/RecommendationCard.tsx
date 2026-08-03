import { useTranslation } from 'react-i18next';
import { Clock, PlayCircle } from 'lucide-react';
import type { StudyRecommendation } from '../types/entities';

export function RecommendationCard({ recommendation }: { recommendation: StudyRecommendation }) {
  const { t } = useTranslation();
  return (
    <div className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <h3 style={{ fontSize: 'var(--text-md)' }}>{t(recommendation.topicKey)}</h3>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
        {t(recommendation.reasonKey, recommendation.reasonParams)}
      </p>
      <blockquote style={{ borderLeft: '3px solid var(--color-border-strong)', paddingLeft: 'var(--space-3)', margin: 0, fontStyle: 'italic', fontSize: 'var(--text-sm)' }}>
        &ldquo;{recommendation.studentExampleQuote}&rdquo;
      </blockquote>
      <p style={{ fontSize: 'var(--text-sm)' }}>{t(recommendation.explanationKey)}</p>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <span className="field__hint" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Clock size={13} aria-hidden="true" /> {recommendation.estimatedMinutes} {t('common.minutes')}
        </span>
        <button type="button" className="btn btn--primary btn--sm">
          <PlayCircle size={14} aria-hidden="true" /> {t('common.continue')}
        </button>
      </div>
    </div>
  );
}
