import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ErrorCategoryGroup, ErrorSeverity, WritingAnnotation } from '../types/entities';
import { ErrorMarker } from './ErrorMarker';
import { SEVERITY_META, SEVERITY_ORDER } from './severityMeta';

type FilterValue = 'all' | ErrorSeverity | ErrorCategoryGroup;

const CATEGORY_GROUPS: ErrorCategoryGroup[] = ['grammar', 'vocabulary', 'organisation', 'task_genre'];

interface AnnotationMatch {
  kind: 'annotation';
  annotation: WritingAnnotation;
  start: number;
  end: number;
}

export interface TextEvidenceHighlight {
  id: string;
  quotedText: string;
  label: string;
}

interface EvidenceMatch {
  kind: 'evidence';
  evidence: TextEvidenceHighlight;
  start: number;
  end: number;
}

type TextMatch = AnnotationMatch | EvidenceMatch;

function locateAnnotations(text: string, annotations: WritingAnnotation[]): AnnotationMatch[] {
  const matches: AnnotationMatch[] = [];
  for (const ann of annotations) {
    if (!ann.quotedText) continue;
    const idx = text.indexOf(ann.quotedText);
    if (idx === -1) continue;
    matches.push({ kind: 'annotation', annotation: ann, start: idx, end: idx + ann.quotedText.length });
  }
  matches.sort((a, b) => a.start - b.start);
  const nonOverlapping: AnnotationMatch[] = [];
  let lastEnd = -1;
  for (const match of matches) {
    if (match.start >= lastEnd) {
      nonOverlapping.push(match);
      lastEnd = match.end;
    }
  }
  return nonOverlapping;
}

function locateEvidence(text: string, highlights: TextEvidenceHighlight[], occupied: AnnotationMatch[]): EvidenceMatch[] {
  const matches: EvidenceMatch[] = [];
  for (const evidence of highlights) {
    let quote = evidence.quotedText.trim();
    if (!quote) continue;
    let idx = text.indexOf(quote);
    if (idx === -1 && quote.includes('...')) {
      quote = quote.split('...')[0]?.trim() ?? '';
      if (quote.length >= 12) idx = text.indexOf(quote);
    }
    if (idx === -1 || !quote) continue;
    const candidate: EvidenceMatch = { kind: 'evidence', evidence: { ...evidence, quotedText: quote }, start: idx, end: idx + quote.length };
    const overlaps = [...occupied, ...matches].some((match) => candidate.start < match.end && candidate.end > match.start);
    if (!overlaps) matches.push(candidate);
  }
  return matches.sort((a, b) => a.start - b.start);
}

interface AnnotatedTextProps {
  text: string;
  annotations: WritingAnnotation[];
  selectedId?: string;
  onSelect: (annotation: WritingAnnotation) => void;
  categoryGroupOf: (categoryId: string) => ErrorCategoryGroup | undefined;
  evidenceHighlights?: TextEvidenceHighlight[];
}

export function AnnotatedText({ text, annotations, selectedId, onSelect, categoryGroupOf, evidenceHighlights = [] }: AnnotatedTextProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<FilterValue>('all');

  const filteredAnnotations = useMemo(() => {
    if (filter === 'all') return annotations;
    if (SEVERITY_ORDER.includes(filter as ErrorSeverity)) return annotations.filter((a) => a.severity === filter);
    return annotations.filter((a) => categoryGroupOf(a.categoryId) === filter);
  }, [annotations, filter, categoryGroupOf]);

  const matches = useMemo(() => {
    const annotationMatches = locateAnnotations(text, filteredAnnotations);
    const evidenceMatches = filter === 'all' ? locateEvidence(text, evidenceHighlights, annotationMatches) : [];
    return [...annotationMatches, ...evidenceMatches].sort((a, b) => a.start - b.start);
  }, [text, filteredAnnotations, evidenceHighlights, filter]);

  const segments: { text: string; match?: TextMatch }[] = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start > cursor) segments.push({ text: text.slice(cursor, match.start) });
    segments.push({ text: text.slice(match.start, match.end), match });
    cursor = match.end;
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
        {segments.map((segment, index) => {
          if (!segment.match) return <span key={index}>{segment.text}</span>;
          if (segment.match.kind === 'annotation') {
            return (
              <ErrorMarker key={index} annotation={segment.match.annotation} active={selectedId === segment.match.annotation.id} onSelect={onSelect}>
                {segment.text}
              </ErrorMarker>
            );
          }
          return (
            <mark key={index} className="rubric-evidence-highlight" title={segment.match.evidence.label}>
              {segment.text}
            </mark>
          );
        })}
      </div>
    </div>
  );
}
