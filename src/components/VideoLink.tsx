import { useTranslation } from 'react-i18next';
import { PlaySquare } from 'lucide-react';
import type { ReferenceVideo } from '../services/videoData';

export function VideoLink({ video }: { video: ReferenceVideo | null }) {
  const { t } = useTranslation();
  if (!video) return null;

  return (
    <a
      href={video.youtubeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn--secondary btn--sm"
      style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
    >
      <PlaySquare size={14} aria-hidden="true" />
      {t('video.watchExplainer', { title: video.title })}
    </a>
  );
}
