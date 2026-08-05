import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookmarkPlus, BookmarkCheck } from 'lucide-react';
import type { WritingAnnotation } from '../types/entities';
import { SEVERITY_META } from './severityMeta';
import { findErrorCategory } from '../mock/errorCategories';
import { fetchVideoForErrorCategory, type ReferenceVideo } from '../services/videoData';
import { VideoLink } from './VideoLink';

export function ErrorDetailPanel({ annotation }: { annotation: WritingAnnotation }) {
  const { t } = useTranslation();
  const [added, setAdded] = useState(false);
  const [video, setVideo] = useState<ReferenceVideo | null>(null);
  const meta = SEVERITY_META[annotation.severity];
  const Icon = meta.icon;
  const category = findErrorCategory(annotation.categoryId);

  useEffect(() => {
    if (category) fetchVideoForErrorCategory(category.id, category.group).then(setVideo);
  }, [category]);

  return (
    <div className="error-detail-panel">
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <span className={`badge badge--severity-${annotation.severity}`}>
          <Icon size={12} aria-hidden="true" /> {t(meta.labelKey)}
        </span>
        {category && <span className="badge badge--neutral">{t(category.nameKey)}</span>}
      </div>

      <blockquote style={{ borderLeft: '3px solid var(--color-border-strong)', paddingLeft: 'var(--space-3)', margin: 0, fontStyle: 'italic', fontSize: 'var(--text-sm)' }}>
        &ldquo;{annotation.quotedText}&rdquo;
      </blockquote>

      <p style={{ fontSize: 'var(--text-sm)' }}>{annotation.explanation}</p>

      {annotation.hint && (
        <div>
          <p className="field__hint">{t('severity.info.label')}</p>
          <p style={{ fontSize: 'var(--text-sm)' }}>{annotation.hint}</p>
        </div>
      )}

      {annotation.suggestedCorrection && (
        <div style={{ background: 'var(--color-success-soft)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
          <p className="field__hint" style={{ marginBottom: 4 }}>{t('common.recommended')}</p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{annotation.suggestedCorrection}</p>
        </div>
      )}

      <VideoLink video={video} />

      <button type="button" className="btn btn--secondary btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => setAdded((v) => !v)}>
        {added ? <BookmarkCheck size={14} aria-hidden="true" /> : <BookmarkPlus size={14} aria-hidden="true" />}
        {added ? t('annotatedText.addedToStudyList') : t('annotatedText.addToStudyList')}
      </button>
    </div>
  );
}
