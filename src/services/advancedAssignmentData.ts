import { supabase } from './supabaseClient';
import type { AssignmentRubric, CefrLevel, WritingTypeId } from '../types/entities';
import type { AdvancedScoringBreakdown } from '../types/assessment';

export interface AdvancedAssignmentCreateInput {
  title: string;
  prompt: string;
  writingTypeId: WritingTypeId;
  level: CefrLevel;
  minWords: number;
  maxWords: number;
  dueAt: string;
  timeLimitMinutes?: number;
  classIds: string[];
  instructions?: string;
  referenceText?: string;
  vocabularyRequirements?: string;
  patternRequirements?: string;
  maxPoints: number;
  scoringBreakdown: AdvancedScoringBreakdown;
  rubric: AssignmentRubric;
  aiSupportMode: string;
  showAiScoreImmediately: boolean;
  sharedWithSchool: boolean;
  status: 'draft' | 'published';
  schoolId: string;
  topicId?: string;
}

export async function createAdvancedWritingAssignmentAtomic(input: AdvancedAssignmentCreateInput): Promise<string> {
  const criteria = input.rubric.criteria.map((criterion, index) => ({
    key: criterion.key,
    name_key: criterion.nameKey,
    description_key: criterion.descriptionKey ?? null,
    weight: criterion.weight,
    max_score: criterion.maxScore,
    is_custom: criterion.isCustom,
    is_core: criterion.isCore,
    enabled: criterion.enabled,
    sort_order: index,
  }));

  const { data, error } = await supabase.rpc('create_advanced_writing_assignment', {
    p_title: input.title,
    p_prompt: input.prompt,
    p_writing_type_id: input.writingTypeId,
    p_level: input.level,
    p_min_words: input.minWords,
    p_max_words: input.maxWords,
    p_due_at: input.dueAt,
    p_time_limit_minutes: input.timeLimitMinutes ?? null,
    p_class_ids: input.classIds,
    p_instructions: input.instructions ?? null,
    p_reference_text: input.referenceText ?? null,
    p_vocabulary_requirements: input.vocabularyRequirements ?? null,
    p_pattern_requirements: input.patternRequirements ?? null,
    p_max_points: input.maxPoints,
    p_scoring_breakdown: input.scoringBreakdown,
    p_criteria: criteria,
    p_ai_support_mode: input.aiSupportMode,
    p_show_ai_score_immediately: input.showAiScoreImmediately,
    p_shared_with_school: input.sharedWithSchool,
    p_status: input.status,
    p_school_id: input.schoolId,
    p_topic_id: input.topicId ?? null,
  });

  if (error || typeof data !== 'string') throw error ?? new Error('advanced_assignment_create_failed');
  return data;
}
