import { supabase } from './supabaseClient';
import type { CatalogTopic, AuditEvent } from '../types/entities';

function mapCatalogTopic(row: Record<string, unknown>): CatalogTopic {
  return {
    id: row.id as string,
    title: row.title as string,
    prompt: row.prompt as string,
    writingTypeId: row.writing_type_id as CatalogTopic['writingTypeId'],
    level: row.level as CatalogTopic['level'],
    minWords: row.min_words as number,
    maxWords: row.max_words as number,
    estimatedMinutes: row.estimated_minutes as number,
    tags: (row.tags as string[] | null) ?? [],
    difficulty: row.difficulty as CatalogTopic['difficulty'],
    learningObjectives: (row.learning_objectives as string[] | null) ?? [],
    genreExpectations: (row.genre_expectations as string[] | null) ?? [],
    planningQuestions: (row.planning_questions as string[] | null) ?? undefined,
    relatedExampleIds: [],
    sourceType: row.source_type as CatalogTopic['sourceType'],
    visibility: row.visibility as CatalogTopic['visibility'],
    schoolId: (row.school_id as string | null) ?? undefined,
    createdBy: row.created_by as string,
    updatedAt: row.updated_at as string,
    originTopicId: (row.origin_topic_id as string | null) ?? undefined,
  };
}

export async function fetchGlobalCatalogTopics(): Promise<CatalogTopic[]> {
  const { data } = await supabase.from('catalog_topics').select('*').eq('visibility', 'global').order('updated_at', { ascending: false });
  return (data ?? []).map(mapCatalogTopic);
}

export async function fetchSchoolSuggestedCatalogTopics(): Promise<CatalogTopic[]> {
  const { data } = await supabase.from('catalog_topics').select('*').eq('visibility', 'school').order('updated_at', { ascending: false });
  return (data ?? []).map(mapCatalogTopic);
}

export async function createGlobalCatalogTopic(input: {
  title: string;
  prompt: string;
  writingTypeId: string;
  level: string;
  minWords: number;
  maxWords: number;
  createdBy: string;
}): Promise<void> {
  const { error } = await supabase.from('catalog_topics').insert({
    title: input.title,
    prompt: input.prompt,
    writing_type_id: input.writingTypeId,
    level: input.level,
    min_words: input.minWords,
    max_words: input.maxWords,
    estimated_minutes: 40,
    difficulty: 'standard',
    source_type: 'pasific_library',
    visibility: 'global',
    created_by: input.createdBy,
  });
  if (error) throw error;
}

export async function promoteCatalogTopicToGlobal(topicId: string): Promise<void> {
  const { error } = await supabase
    .from('catalog_topics')
    .update({ visibility: 'global', source_type: 'pasific_library', school_id: null })
    .eq('id', topicId);
  if (error) throw error;
}

export interface AuditEventRow {
  id: string;
  type: AuditEvent['type'];
  actorName: string;
  targetLabel: string;
  detail: string;
  timestamp: string;
}

export async function fetchAuditEvents(): Promise<AuditEventRow[]> {
  const { data } = await supabase.from('audit_events').select('*').order('created_at', { ascending: false }).limit(200);
  return (data ?? []).map((e) => ({
    id: e.id as string,
    type: e.type as AuditEvent['type'],
    actorName: e.actor_name as string,
    targetLabel: e.target_label as string,
    detail: e.detail as string,
    timestamp: e.created_at as string,
  }));
}

export interface OverrideStat {
  key: string;
  count: number;
  avgDelta: string;
}

export async function fetchOverrideStats(): Promise<OverrideStat[]> {
  const [{ data: overrides }, { data: scores }] = await Promise.all([
    supabase.from('teacher_overrides').select('submission_id, criterion_id, original_ai_score, final_score'),
    supabase.from('criterion_scores').select('submission_id, criterion_id, criterion_key'),
  ]);

  const keyByPair = new Map((scores ?? []).map((s) => [`${s.submission_id}:${s.criterion_id}`, s.criterion_key as string]));
  const byCriterion = new Map<string, { count: number; totalDelta: number }>();

  for (const o of overrides ?? []) {
    const key = o.criterion_id ? (keyByPair.get(`${o.submission_id}:${o.criterion_id}`) ?? 'overall') : 'overall';
    const entry = byCriterion.get(key) ?? { count: 0, totalDelta: 0 };
    entry.count += 1;
    entry.totalDelta += Math.abs((o.final_score as number) - (o.original_ai_score as number));
    byCriterion.set(key, entry);
  }

  return [...byCriterion.entries()].map(([key, v]) => ({ key, count: v.count, avgDelta: (v.totalDelta / v.count).toFixed(1) }));
}
