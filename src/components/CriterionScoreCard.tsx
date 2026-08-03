import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, CheckCircle2, TrendingUp, Pencil } from 'lucide-react';
import type { CriterionScore } from '../types/entities';

interface CriterionScoreCardProps {
  criterion: CriterionScore;
  showAiVsTeacher?: boolean;
  editable?: boolean;
  onOverride?: (newScore: number, reason: string) => void;
}

export function CriterionScoreCard({ criterion, showAiVsTeacher = false, editable = false, onOverride }: CriterionScoreCardProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftScore, setDraftScore] = useState(criterion.teacherScore ?? criterion.aiScore);
  const [reason, setReason] = useState('');

  const displayScore = criterion.teacherScore ?? criterion.aiScore;
  const wasOverridden = criterion.teacherScore !== undefined && criterion.teacherScore !== criterion.aiScore;

  return (
    <div className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', padding: 0, textAlign: 'left', gap: 'var(--space-3)' }}
      >
        <span style={{ fontWeight: 'var(--weight-medium)' }}>{t(`rubric.criterion.${criterion.criterionKey}.name`)}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0 }}>
          {wasOverridden && <TrendingUp size={14} color="var(--color-primary)" aria-hidden="true" />}
          <span style={{ fontWeight: 'var(--weight-semibold)' }}>{displayScore}/{criterion.maxScore}</span>
          <span className="field__hint">{criterion.weight}%</span>
          {open ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        </span>
      </button>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {showAiVsTeacher && (
            <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
              <span>{t('rubric.aiSuggestedScore')}: <strong>{criterion.aiScore}</strong></span>
              {criterion.teacherScore !== undefined && (
                <span>{t('rubric.teacherFinalScore')}: <strong>{criterion.teacherScore}</strong></span>
              )}
            </div>
          )}

          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>{criterion.explanation}</p>

          {criterion.evidenceQuote && (
            <blockquote style={{ borderLeft: '3px solid var(--color-primary)', paddingLeft: 'var(--space-3)', margin: 0, fontStyle: 'italic', fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
              &ldquo;{criterion.evidenceQuote}&rdquo;
            </blockquote>
          )}

          {criterion.strongAspects.length > 0 && (
            <div>
              <p className="field__hint" style={{ marginBottom: 4 }}>{t('common.recommended')}</p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {criterion.strongAspects.map((s, i) => (
                  <li key={i} style={{ display: 'flex', gap: 6, fontSize: 'var(--text-sm)' }}>
                    <CheckCircle2 size={14} color="var(--color-success)" style={{ flexShrink: 0, marginTop: 3 }} aria-hidden="true" />{s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {criterion.developmentAreas.length > 0 && (
            <div>
              <p className="field__hint" style={{ marginBottom: 4 }}>{t('student.home.mainDevelopmentArea')}</p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {criterion.developmentAreas.map((s, i) => (
                  <li key={i} style={{ display: 'flex', gap: 6, fontSize: 'var(--text-sm)' }}>
                    <ChevronUp size={14} style={{ flexShrink: 0, marginTop: 3, transform: 'rotate(45deg)' }} color="var(--color-warning)" aria-hidden="true" />{s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {editable && !editing && (
            <button type="button" className="btn btn--secondary btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => setEditing(true)}>
              <Pencil size={13} aria-hidden="true" /> {t('common.edit')}
            </button>
          )}

          {editable && editing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
              <div className="field">
                <label className="field__label" htmlFor={`score-${criterion.criterionId}`}>{t('rubric.teacherFinalScore')}</label>
                <input
                  id={`score-${criterion.criterionId}`}
                  type="number"
                  min={0}
                  max={criterion.maxScore}
                  className="input-control"
                  value={draftScore}
                  onChange={(e) => setDraftScore(Number(e.target.value))}
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor={`reason-${criterion.criterionId}`}>{t('common.required')}</label>
                <textarea id={`reason-${criterion.criterionId}`} className="textarea-control" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button type="button" className="btn btn--secondary btn--sm" onClick={() => setEditing(false)}>{t('common.cancel')}</button>
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={!reason.trim()}
                  onClick={() => { onOverride?.(draftScore, reason.trim()); setEditing(false); setReason(''); }}
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
