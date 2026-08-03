import type { WritingType } from '../types/entities';

export const WRITING_TYPES: WritingType[] = [
  { id: 'opinion_essay', labelKey: 'writingType.opinion_essay', category: 'essay' },
  { id: 'argumentative_essay', labelKey: 'writingType.argumentative_essay', category: 'essay' },
  { id: 'for_and_against_essay', labelKey: 'writingType.for_and_against_essay', category: 'essay' },
  { id: 'advantages_disadvantages_essay', labelKey: 'writingType.advantages_disadvantages_essay', category: 'essay' },
  { id: 'problem_solution_essay', labelKey: 'writingType.problem_solution_essay', category: 'essay' },
  { id: 'cause_effect_essay', labelKey: 'writingType.cause_effect_essay', category: 'essay' },
  { id: 'compare_contrast_essay', labelKey: 'writingType.compare_contrast_essay', category: 'essay' },
  { id: 'formal_email', labelKey: 'writingType.formal_email', category: 'correspondence' },
  { id: 'informal_email', labelKey: 'writingType.informal_email', category: 'correspondence' },
  { id: 'complaint_letter', labelKey: 'writingType.complaint_letter', category: 'correspondence' },
  { id: 'application_letter', labelKey: 'writingType.application_letter', category: 'correspondence' },
  { id: 'article', labelKey: 'writingType.article', category: 'functional' },
  { id: 'report', labelKey: 'writingType.report', category: 'functional' },
  { id: 'review', labelKey: 'writingType.review', category: 'functional' },
  { id: 'narrative_story', labelKey: 'writingType.narrative_story', category: 'creative' },
  { id: 'descriptive_writing', labelKey: 'writingType.descriptive_writing', category: 'creative' },
  { id: 'blog_post', labelKey: 'writingType.blog_post', category: 'functional' },
];

export function writingTypeLabelKey(id: string): string {
  return WRITING_TYPES.find((w) => w.id === id)?.labelKey ?? id;
}
