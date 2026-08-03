import { useTranslation } from 'react-i18next';
import type { WritingAnnotation } from '../types/entities';
import { SEVERITY_META } from './severityMeta';

interface ErrorMarkerProps {
  annotation: WritingAnnotation;
  children: string;
  active?: boolean;
  onSelect: (annotation: WritingAnnotation) => void;
}

export function ErrorMarker({ annotation, children, active, onSelect }: ErrorMarkerProps) {
  const { t } = useTranslation();
  const meta = SEVERITY_META[annotation.severity];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={() => onSelect(annotation)}
      className={`error-marker error-marker--${annotation.severity} ${active ? 'is-active' : ''}`}
      aria-label={`${t(meta.labelKey)}: ${children}`}
    >
      {children}
      <Icon size={11} className="error-marker__icon" aria-hidden="true" />
    </button>
  );
}
