import { useTranslation } from 'react-i18next';
import type { CriterionScore } from '../types/entities';

export function CriterionScoreBar({ criterion }: { criterion: CriterionScore }) {
  const { t } = useTranslation();
  const score = criterion.teacherScore ?? criterion.aiScore;
  const pct = Math.round((score / criterion.maxScore) * 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
        <span>{t(`rubric.criterion.${criterion.criterionKey}.name`)}</span>
        <span style={{ color: 'var(--color-text-muted)' }}>{score}/{criterion.maxScore}</span>
      </div>
      <div style={{ height: 6, borderRadius: 'var(--radius-full)', background: 'var(--color-surface-alt)', overflow: 'hidden' }} role="img" aria-label={`${t(`rubric.criterion.${criterion.criterionKey}.name`)}: ${pct}%`}>
        <div style={{ height: '100%', width: `${pct}%`, background: pct >= 70 ? 'var(--color-success)' : pct >= 45 ? 'var(--color-primary)' : 'var(--color-warning)', borderRadius: 'var(--radius-full)' }} />
      </div>
    </div>
  );
}
