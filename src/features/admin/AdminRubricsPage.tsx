import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { standardCriteria } from '../../mock/rubric';
import { PageHeader } from '../../components/PageHeader';
import { PdfExportButton } from '../../components/PdfExportButton';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { exportScoringReviewSummaryPdf } from '../../utils/pdf';
import { fetchOverrideStats, type OverrideStat } from '../../services/contentData';

const RUBRIC_VERSION = 'v1.2';
// Mirrors GEMINI_MODEL in server/gemini.ts — update both together if the
// grading model changes.
const AI_MODEL_VERSION = 'gemma-4-31b-it';

export function AdminRubricsPage() {
  const { t, i18n } = useTranslation();
  const [overrideStats, setOverrideStats] = useState<OverrideStat[] | null>(null);

  useEffect(() => { fetchOverrideStats().then(setOverrideStats); }, []);

  if (!overrideStats) return <LoadingSkeleton height="12rem" />;

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
