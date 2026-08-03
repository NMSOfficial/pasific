import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ErrorCategoryGroup, ErrorSeverity, WritingAnnotation } from '../types/entities';
import { ErrorMarker } from './ErrorMarker';
import { SEVERITY_META, SEVERITY_ORDER } from './severityMeta';

type FilterValue = 'all' | ErrorSeverity | ErrorCategoryGroup;

const CATEGORY_GROUPS: ErrorCategoryGroup[] = ['grammar', 'vocabulary', 'organisation', 'task_genre'];

interface Match {
  annotation: WritingAnnotation;
  start: number;
  end: number;
}

function locateAnnotations(text: string, annotations: WritingAnnotation[]): Match[] {
  const matches: Match[] = [];
  for (const ann of annotations) {
    if (!ann.quotedText) continue;
    const idx = text.indexOf(ann.quotedText);
    if (idx === -1) continue;
    matches.push({ annotation: ann, start: idx, end: idx + ann.quotedText.length });
  }
  matches.sort((a, b) => a.start - b.start);
  const nonOverlapping: Match[] = [];
  let lastEnd = -1;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      nonOverlapping.push(m);
      lastEnd = m.end;
    }
  }
  return nonOverlapping;
}

interface AnnotatedTextProps {
  text: string;
  annotations: WritingAnnotation[];
  selectedId?: string;
  onSelect: (annotation: WritingAnnotation) => void;
  categoryGroupOf: (categoryId: string) => ErrorCategoryGroup | undefined;
}

export function AnnotatedText({ text, annotations, selectedId, onSelect, categoryGroupOf }: AnnotatedTextProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterValue>('all');

  const filteredAnnotations = useMemo(() => {
    if (filter === 'all') return annotations;
    if (SEVERITY_ORDER.includes(filter as ErrorSeverity)) return annotations.filter((a) => a.severity === filter);
    return annotations.filter((a) => categoryGroupOf(a.categoryId) === filter);
  }, [annotations, filter, categoryGroupOf]);

  const matches = useMemo(() => locateAnnotations(text, filteredAnnotations), [text, filteredAnnotations]);

  const segments: { text: string; match?: Match }[] = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.start > cursor) segments.push({ text: text.slice(cursor, m.start) });
    segments.push({ text: text.slice(m.start, m.end), match: m });
    cursor = m.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });

  return (
    <div>
      <div className="segmented-control" style={{ marginBottom: 'var(--space-4)' }} role="group" aria-label={t('common.filter')}>
        <button type="button" className={`segmented-control__option ${filter === 'all' ? 'is-active' : ''}`} onClick={() => setFilter('all')}>
          {t('annotatedText.filterAll')}
        </button>
        {SEVERITY_ORDER.map((s) => (
          <button key={s} type="button" className={`segmented-control__option ${filter === s ? 'is-active' : ''}`} onClick={() => setFilter(s)}>
            {t(SEVERITY_META[s].labelKey)}
          </button>
        ))}
        {CATEGORY_GROUPS.map((g) => (
          <button key={g} type="button" className={`segmented-control__option ${filter === g ? 'is-active' : ''}`} onClick={() => setFilter(g)}>
            {t(`errorCategoryGroup.${g}`)}
          </button>
        ))}
      </div>

      <p className="field__hint" style={{ marginBottom: 'var(--space-3)' }}>{t('annotatedText.selectAnnotationHint')}</p>

      <div className="annotated-text">
        {segments.map((seg, i) =>
          seg.match ? (
            <ErrorMarker key={i} annotation={seg.match.annotation} active={selectedId === seg.match.annotation.id} onSelect={onSelect}>
              {seg.text}
            </ErrorMarker>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </div>
    </div>
  );
}
