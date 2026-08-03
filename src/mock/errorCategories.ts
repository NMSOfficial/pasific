import type { ErrorCategory } from '../types/entities';

const grammar: string[] = [
  'verb_tense', 'subject_verb_agreement', 'articles', 'prepositions', 'singular_plural',
  'pronouns', 'word_order', 'modal_verbs', 'conditionals', 'relative_clauses',
  'sentence_fragments', 'run_on_sentences', 'clause_structure', 'agreement', 'auxiliary_verbs',
];

const vocabulary: string[] = [
  'word_choice', 'word_form', 'collocation', 'repetition', 'register',
  'informal_language', 'false_friend', 'spelling', 'precision', 'limited_range',
];

const organisation: string[] = [
  'missing_thesis', 'weak_topic_sentence', 'weak_paragraph_focus', 'unsupported_idea', 'repeated_idea',
  'incorrect_linking_device', 'mechanical_cohesion', 'missing_conclusion', 'unclear_reference', 'poor_progression',
];

const taskGenre: string[] = [
  'partially_answered_prompt', 'off_topic_content', 'missing_position', 'inappropriate_register',
  'missing_required_section', 'genre_convention_issue', 'insufficient_development',
];

function toCategories(ids: string[], group: ErrorCategory['group']): ErrorCategory[] {
  return ids.map((id) => ({ id, group, nameKey: `errorCategory.${id}` }));
}

export const ERROR_CATEGORIES: ErrorCategory[] = [
  ...toCategories(grammar, 'grammar'),
  ...toCategories(vocabulary, 'vocabulary'),
  ...toCategories(organisation, 'organisation'),
  ...toCategories(taskGenre, 'task_genre'),
];

export function findErrorCategory(id: string): ErrorCategory | undefined {
  return ERROR_CATEGORIES.find((c) => c.id === id);
}
