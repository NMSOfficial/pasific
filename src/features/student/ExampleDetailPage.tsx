import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router-dom';
import { CheckCircle2, TrendingUp } from 'lucide-react';
import { findErrorCategory } from '../../mock/errorCategories';
import type { WritingAnnotation, WritingExample } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { CefrLevelBadge } from '../../components/CefrLevelBadge';
import { WritingTypeBadge } from '../../components/WritingTypeBadge';
import { ScoreRing } from '../../components/ScoreRing';
import { CriterionScoreCard } from '../../components/CriterionScoreCard';
import { AnnotatedText, type TextEvidenceHighlight } from '../../components/AnnotatedText';
import { ErrorDetailPanel } from '../../components/ErrorDetailPanel';
import { FeedbackTabs } from '../../components/FeedbackTabs';
import { MobileBottomSheet } from '../../components/MobileBottomSheet';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { useIsMobile } from '../../utils/useIsMobile';
import { fetchExample } from '../../services/exampleData';

export function ExampleDetailPage({ basePath = '/student' }: { basePath?: string }) {
  const { t } = useTranslation();
  const { exampleId } = useParams();
  const isMobile = useIsMobile();
  const [selected, setSelected] = useState<WritingAnnotation | null>(null);
  const [example, setExample] = useState<WritingExample | null | undefined>(undefined);

  useEffect(() => {
    if (exampleId) fetchExample(exampleId).then(setExample);
  }, [exampleId]);

  if (example === null) return <Navigate to={`${basePath}/examples`} replace />;
  if (example === undefined) return <LoadingSkeleton height="12rem" />;

  const categoryGroupOf = (categoryId: string) => findErrorCategory(categoryId)?.group;
  const evidenceHighlights: TextEvidenceHighlight[] = example.criterionScores
    .filter((criterion) => !!criterion.evidenceQuote?.trim())
    .map((criterion) => ({
      id: `evidence-${criterion.criterionId}`,
      quotedText: criterion.evidenceQuote!,
      label: t(`rubric.criterion.${criterion.criterionKey}.name`),
    }));

  return (
    <>
      <PageHeader title={example.title} />

      <div className="card card--padded" style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <ScoreRing score={example.overallScore} />
        <div style={{ flex: 1, minWidth: '16rem', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <WritingTypeBadge writingTypeId={example.writingTypeId} />
            <CefrLevelBadge level={example.level} />
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{example.teacherExplanation}</p>
        </div>
      </div>

      <div className="card card--padded" style={{ marginBottom: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <p className="field__label">{t('examples.whyThisScore')}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))', gap: 'var(--space-4)' }}>
          <div>
            <p className="field__hint" style={{ marginBottom: 6 }}>{t('examples.strongPoints')}</p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {example.strongPoints.map((s, i) => (
                <li key={i} style={{ display: 'flex', gap: 6, fontSize: 'var(--text-sm)' }}>
                  <CheckCircle2 size={14} color="var(--color-success)" style={{ flexShrink: 0, marginTop: 3 }} aria-hidden="true" />{s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="field__hint" style={{ marginBottom: 6 }}>{t('examples.weakPoints')}</p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {example.weakPoints.map((s, i) => (
                <li key={i} style={{ display: 'flex', gap: 6, fontSize: 'var(--text-sm)' }}>
                  <TrendingUp size={14} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: 3 }} aria-hidden="true" />{s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <FeedbackTabs
        tabs={[
          {
            key: 'annotated',
            label: t('annotatedText.tabs.annotated'),
            content: (
              <div className="writing-editor-layout">
                <div className="writing-editor-layout__main card card--padded">
                  <AnnotatedText
                    text={example.text}
                    annotations={example.annotations}
                    evidenceHighlights={evidenceHighlights}
                    selectedId={selected?.id}
                    onSelect={setSelected}
                    categoryGroupOf={categoryGroupOf}
                  />
                </div>
                {!isMobile && (
                  <div className="writing-editor-layout__prompt card card--padded">
                    {selected ? <ErrorDetailPanel annotation={selected} /> : <p className="field__hint">{t('annotatedText.selectAnnotationHint')}</p>}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'scores',
            label: t('annotatedText.tabs.scoreBreakdown'),
            content: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {example.criterionScores.map((c) => <CriterionScoreCard key={c.criterionId} criterion={c} />)}
              </div>
            ),
          },
        ]}
      />

      {isMobile && (
        <MobileBottomSheet open={!!selected} onClose={() => setSelected(null)} title={t('annotatedText.tabs.annotated')}>
          {selected && <ErrorDetailPanel annotation={selected} />}
        </MobileBottomSheet>
      )}
    </>
  );
}
