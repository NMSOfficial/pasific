import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { useMockState } from '../../mock/useMockStore';
import { PageHeader } from '../../components/PageHeader';
import { CefrLevelBadge } from '../../components/CefrLevelBadge';
import { WritingTypeBadge } from '../../components/WritingTypeBadge';

export function CatalogTopicPage() {
  const { t } = useTranslation();
  const { topicId } = useParams();
  const state = useMockState();
  const topic = state.catalogTopics.find((t2) => t2.id === topicId);

  if (!topic) return <Navigate to="/student/catalog" replace />;

  return (
    <>
      <PageHeader
        title={topic.title}
        actions={<Link to={`/student/practice/new?topicId=${topic.id}`} className="btn btn--primary">{t('catalog.startFromTopic')}</Link>}
      />

      <div className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <WritingTypeBadge writingTypeId={topic.writingTypeId} />
          <CefrLevelBadge level={topic.level} />
          <span className="badge badge--outline">{t(`catalogSource.${topic.sourceType}`)}</span>
          <span className="badge badge--neutral">{t(`difficulty.${topic.difficulty}`)}</span>
        </div>

        <p style={{ lineHeight: 'var(--leading-relaxed)' }}>{topic.prompt}</p>

        <div className="assignment-card__meta" style={{ fontSize: 'var(--text-sm)' }}>
          <span>{topic.minWords}–{topic.maxWords} {t('common.words')}</span>
          <span className="assignment-card__meta-item"><Clock size={14} aria-hidden="true" />{topic.estimatedMinutes} {t('common.minutes')}</span>
        </div>

        {topic.planningQuestions && topic.planningQuestions.length > 0 && (
          <div>
            <p className="field__label" style={{ marginBottom: 'var(--space-2)' }}>{t('catalog.planningQuestions')}</p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {topic.planningQuestions.map((q, i) => (
                <li key={i} style={{ fontSize: 'var(--text-sm)', paddingLeft: '1.25rem', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0 }}>{i + 1}.</span>{q}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="field__label" style={{ marginBottom: 'var(--space-2)' }}>{t('catalog.learningObjectives')}</p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topic.learningObjectives.map((o, i) => (
              <li key={i} style={{ fontSize: 'var(--text-sm)' }}>• {o}</li>
            ))}
          </ul>
        </div>

        <div>
          <p className="field__label" style={{ marginBottom: 'var(--space-2)' }}>{t('catalog.genreExpectations')}</p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topic.genreExpectations.map((o, i) => (
              <li key={i} style={{ fontSize: 'var(--text-sm)' }}>• {o}</li>
            ))}
          </ul>
        </div>

        {topic.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {topic.tags.map((tag) => <span key={tag} className="badge badge--neutral">{tag}</span>)}
          </div>
        )}

        {topic.relatedExampleIds.length > 0 && (
          <div>
            <p className="field__label" style={{ marginBottom: 'var(--space-2)' }}>{t('catalog.relatedExamples')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {topic.relatedExampleIds.map((id) => {
                const example = state.examples.find((e) => e.id === id);
                if (!example) return null;
                return (
                  <Link key={id} to={`/student/examples/${id}`} className="btn btn--secondary btn--sm" style={{ alignSelf: 'flex-start' }}>
                    {example.title}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
