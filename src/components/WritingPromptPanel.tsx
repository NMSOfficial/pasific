import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { AssignmentRubric, CefrLevel, WritingTypeId } from '../types/entities';
import { CefrLevelBadge } from './CefrLevelBadge';
import { WritingTypeBadge } from './WritingTypeBadge';

interface WritingPromptPanelProps {
  title: string;
  prompt: string;
  writingTypeId: WritingTypeId;
  level: CefrLevel;
  minWords: number;
  maxWords: number;
  timeLimitMinutes?: number;
  dueLabel?: string;
  rubric?: AssignmentRubric;
  extra?: ReactNode;
}

export function WritingPromptPanel({ title, prompt, writingTypeId, level, minWords, maxWords, timeLimitMinutes, dueLabel, rubric, extra }: WritingPromptPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-4)', background: 'transparent', border: 'none', textAlign: 'left' }}
      >
        <span style={{ fontWeight: 'var(--weight-semibold)' }}>{title}</span>
        {open ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
      </button>
      {open && (
        <div style={{ padding: '0 var(--space-4) var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <WritingTypeBadge writingTypeId={writingTypeId} />
            <CefrLevelBadge level={level} />
          </div>
          <p style={{ lineHeight: 'var(--leading-relaxed)' }}>{prompt}</p>
          <div className="assignment-card__meta" style={{ fontSize: 'var(--text-xs)' }}>
            <span>{minWords}–{maxWords} {t('common.words')}</span>
            {timeLimitMinutes && <span>{timeLimitMinutes} {t('common.minutes')}</span>}
            {dueLabel && <span>{dueLabel}</span>}
          </div>
          {rubric && (
            <div>
              <p className="field__hint" style={{ marginBottom: 'var(--space-1)' }}>{t('student.assignment.rubricPreview')}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {rubric.criteria.filter((c) => c.enabled).map((c) => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    <span>{t(c.nameKey)}</span><span>{c.weight}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {extra}
        </div>
      )}
    </div>
  );
}
