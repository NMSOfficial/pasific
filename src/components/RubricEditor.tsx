import { useTranslation } from 'react-i18next';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import type { AssignmentRubric } from '../types/entities';
import { standardCriteria } from '../mock/rubric';

interface RubricEditorProps {
  rubric: AssignmentRubric;
  onChange: (rubric: AssignmentRubric) => void;
}

export function RubricEditor({ rubric, onChange }: RubricEditorProps) {
  const { t } = useTranslation();
  const totalWeight = rubric.criteria.filter((c) => c.enabled).reduce((sum, c) => sum + c.weight, 0);

  const updateCriterion = (id: string, patch: Partial<AssignmentRubric['criteria'][number]>) => {
    const nextCriteria = rubric.criteria.map((c) => (c.id === id ? { ...c, ...patch } : c));
    onChange({ ...rubric, criteria: nextCriteria, isCustom: true });
  };

  const addCustomCriterion = () => {
    const id = `custom_${Date.now()}`;
    onChange({
      ...rubric,
      isCustom: true,
      criteria: [
        ...rubric.criteria,
        { id, key: id, nameKey: t('common.required'), weight: 0, maxScore: 20, isCustom: true, isCore: false, enabled: true },
      ],
    });
  };

  const removeCriterion = (id: string) => {
    onChange({ ...rubric, criteria: rubric.criteria.filter((c) => c.id !== id), isCustom: true });
  };

  const toggleEnabled = (id: string) => {
    onChange({ ...rubric, criteria: rubric.criteria.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)), isCustom: true });
  };

  const restoreStandard = () => {
    onChange({ id: rubric.id, isCustom: false, criteria: standardCriteria() });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {rubric.criteria.map((c) => (
        <div key={c.id} className="card card--padded" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', opacity: c.enabled ? 1 : 0.5 }}>
          <div style={{ flex: 1 }}>
            {c.isCustom ? (
              <>
                <label className="visually-hidden" htmlFor={`criterion-name-${c.id}`}>{t('teacher.assignments.title')}</label>
                <input
                  id={`criterion-name-${c.id}`}
                  className="input-control"
                  value={c.nameKey}
                  onChange={(e) => updateCriterion(c.id, { nameKey: e.target.value })}
                  placeholder={t('common.required')}
                />
              </>
            ) : (
              <span style={{ fontWeight: 'var(--weight-medium)' }}>{t(c.nameKey)}</span>
            )}
          </div>
          <div className="field" style={{ width: '6rem' }}>
            <label className="visually-hidden" htmlFor={`weight-${c.id}`}>{t('teacher.assignments.weight')}</label>
            <input
              id={`weight-${c.id}`}
              type="number"
              className="input-control"
              min={0}
              max={100}
              value={c.weight}
              disabled={!c.enabled}
              onChange={(e) => updateCriterion(c.id, { weight: Number(e.target.value) })}
            />
          </div>
          {c.isCustom ? (
            <button type="button" className="icon-btn" onClick={() => removeCriterion(c.id)} aria-label={t('common.delete')}>
              <Trash2 size={16} aria-hidden="true" />
            </button>
          ) : (
            !c.isCore ? null : (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => toggleEnabled(c.id)}>
                {c.enabled ? t('teacher.assignments.disableCriterion') : t('teacher.assignments.enableCriterion')}
              </button>
            )
          )}
        </div>
      ))}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" className="btn btn--secondary btn--sm" onClick={addCustomCriterion}>
          <Plus size={14} aria-hidden="true" /> {t('teacher.assignments.addCriterion')}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={restoreStandard}>
          <RotateCcw size={14} aria-hidden="true" /> {t('teacher.assignments.restoreStandard')}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>
        <span>{t('teacher.assignments.totalWeight')}</span>
        <span style={{ color: totalWeight === 100 ? 'var(--color-success)' : 'var(--color-error)' }}>{totalWeight}%</span>
      </div>
      {totalWeight !== 100 && <p className="field__error">{t('teacher.assignments.totalWeightWarning')}</p>}
    </div>
  );
}
