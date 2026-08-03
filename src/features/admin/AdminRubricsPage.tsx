import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMockState } from '../../mock/useMockStore';
import { standardCriteria } from '../../mock/rubric';
import { PageHeader } from '../../components/PageHeader';
import { PdfExportButton } from '../../components/PdfExportButton';
import { exportScoringReviewSummaryPdf } from '../../utils/pdf';

const RUBRIC_VERSION = 'v1.2';
const AI_MODEL_VERSION = 'pasific-scorer-mock-0.1';

export function AdminRubricsPage() {
  const { t, i18n } = useTranslation();
  const state = useMockState();

  const overrideStats = useMemo(() => {
    const byCriterion = new Map<string, { count: number; totalDelta: number }>();
    for (const sub of state.submissions) {
      for (const o of sub.teacherOverrides) {
        const crit = sub.criterionScores.find((c) => c.criterionId === o.criterionId);
        const key = crit?.criterionKey ?? 'overall';
        const entry = byCriterion.get(key) ?? { count: 0, totalDelta: 0 };
        entry.count += 1;
        entry.totalDelta += Math.abs(o.finalScore - o.originalAiScore);
        byCriterion.set(key, entry);
      }
    }
    return [...byCriterion.entries()].map(([key, v]) => ({ key, count: v.count, avgDelta: (v.totalDelta / v.count).toFixed(1) }));
  }, [state.submissions]);

  return (
    <>
      <PageHeader
        title={t('nav.admin.rubrics')}
        actions={
          <PdfExportButton
            onExport={() => exportScoringReviewSummaryPdf({
              locale: i18n.resolvedLanguage ?? 'tr',
              aiModelVersion: AI_MODEL_VERSION,
              rubricVersion: RUBRIC_VERSION,
              overrideStats: overrideStats.map((s) => ({ label: t(`rubric.criterion.${s.key}.name`), count: s.count, avgDelta: s.avgDelta })),
            })}
          />
        }
      />

      <div className="stat-row" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="stat-tile"><span className="stat-tile__value" style={{ fontSize: 'var(--text-md)' }}>{RUBRIC_VERSION}</span><span className="stat-tile__label">{t('admin.rubrics.standardVersion')}</span></div>
        <div className="stat-tile"><span className="stat-tile__value" style={{ fontSize: 'var(--text-md)' }}>{AI_MODEL_VERSION}</span><span className="stat-tile__label">{t('admin.rubrics.aiModelVersion')}</span></div>
      </div>

      <section className="section-block">
        <div className="section-block__title"><h2>{t('nav.admin.rubrics')}</h2></div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>{t('common.level')}</th><th>{t('teacher.assignments.weight')}</th></tr></thead>
            <tbody>
              {standardCriteria().map((c) => (
                <tr key={c.id}><td>{t(c.nameKey)}</td><td>{c.weight}%</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section-block">
        <div className="section-block__title"><h2>{t('admin.rubrics.overrideStats')}</h2></div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>{t('common.level')}</th><th>{t('admin.rubrics.overrideFrequency')}</th><th>{t('admin.rubrics.avgOverride')}</th></tr></thead>
            <tbody>
              {overrideStats.map((s) => (
                <tr key={s.key}><td>{t(`rubric.criterion.${s.key}.name`)}</td><td>{s.count}</td><td>{s.avgDelta}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
