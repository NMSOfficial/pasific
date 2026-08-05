import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Clock } from 'lucide-react';
import type { CatalogTopic } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { CefrLevelBadge } from '../../components/CefrLevelBadge';
import { WritingTypeBadge } from '../../components/WritingTypeBadge';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { VideoLink } from '../../components/VideoLink';
import { GuidePanel } from '../../components/GuidePanel';
import { fetchCatalogTopic } from '../../services/contentData';
import { fetchVideoForWritingType, type ReferenceVideo } from '../../services/videoData';
import { fetchGuideForWritingType, type WritingTypeGuide } from '../../services/guideData';

export function CatalogTopicPage() {
  const { t } = useTranslation();
  const { topicId } = useParams();
  const [topic, setTopic] = useState<CatalogTopic | null | undefined>(undefined);
  const [video, setVideo] = useState<ReferenceVideo | null>(null);
  const [guide, setGuide] = useState<WritingTypeGuide | null>(null);

  useEffect(() => {
    if (topicId) fetchCatalogTopic(topicId).then(setTopic);
  }, [topicId]);

  useEffect(() => {
    if (topic) fetchVideoForWritingType(topic.writingTypeId).then(setVideo);
    if (topic) fetchGuideForWritingType(topic.writingTypeId).then(setGuide);
  }, [topic]);

  if (topic === null) return <Navigate to="/student/catalog" replace />;
  if (topic === undefined) return <LoadingSkeleton height="12rem" />;

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

        <GuidePanel guide={guide} />
        <VideoLink video={video} />

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
      </div>
    </>
  );
}
