import type { AssignmentRubric, RubricCriterion } from '../types/entities';

export function standardCriteria(): RubricCriterion[] {
  return [
    { id: 'crit_task_fulfilment', key: 'task_fulfilment', nameKey: 'rubric.criterion.task_fulfilment.name', descriptionKey: 'rubric.criterion.task_fulfilment.description', weight: 20, maxScore: 20, isCustom: false, isCore: true, enabled: true },
    { id: 'crit_genre_achievement', key: 'genre_achievement', nameKey: 'rubric.criterion.genre_achievement.name', descriptionKey: 'rubric.criterion.genre_achievement.description', weight: 20, maxScore: 20, isCustom: false, isCore: true, enabled: true },
    { id: 'crit_organisation_cohesion', key: 'organisation_cohesion', nameKey: 'rubric.criterion.organisation_cohesion.name', descriptionKey: 'rubric.criterion.organisation_cohesion.description', weight: 20, maxScore: 20, isCustom: false, isCore: true, enabled: true },
    { id: 'crit_vocabulary_range', key: 'vocabulary_range', nameKey: 'rubric.criterion.vocabulary_range.name', descriptionKey: 'rubric.criterion.vocabulary_range.description', weight: 20, maxScore: 20, isCustom: false, isCore: true, enabled: true },
    { id: 'crit_grammar_mechanics', key: 'grammar_mechanics', nameKey: 'rubric.criterion.grammar_mechanics.name', descriptionKey: 'rubric.criterion.grammar_mechanics.description', weight: 20, maxScore: 20, isCustom: false, isCore: true, enabled: true },
  ];
}

export function standardRubric(id: string): AssignmentRubric {
  return { id, isCustom: false, criteria: standardCriteria() };
}
