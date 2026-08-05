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

export async function fetchCatalogTopic(id: string): Promise<CatalogTopic | null> {
  const { data } = await supabase.from('catalog_topics').select('*').eq('id', id).maybeSingle();
  return data ? mapCatalogTopic(data) : null;
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

export async function fetchVisibleCatalogForSchool(schoolId: string): Promise<CatalogTopic[]> {
  const [{ data: overrides }, { data: globalTopics }, { data: schoolTopics }] = await Promise.all([
    supabase.from('catalog_visibility_overrides').select('topic_id').eq('school_id', schoolId).eq('hidden', true),
    supabase.from('catalog_topics').select('*').eq('visibility', 'global'),
    supabase.from('catalog_topics').select('*').eq('visibility', 'school').eq('school_id', schoolId),
  ]);
  const hiddenIds = new Set((overrides ?? []).map((o) => o.topic_id as string));
  const visibleGlobal = (globalTopics ?? []).filter((t) => !hiddenIds.has(t.id as string));
  return [...visibleGlobal, ...(schoolTopics ?? [])].map(mapCatalogTopic);
}

export async function fetchHiddenGlobalTopicsForSchool(schoolId: string): Promise<CatalogTopic[]> {
  const [{ data: overrides }, { data: globalTopics }] = await Promise.all([
    supabase.from('catalog_visibility_overrides').select('topic_id').eq('school_id', schoolId).eq('hidden', true),
    supabase.from('catalog_topics').select('*').eq('visibility', 'global'),
  ]);
  const hiddenIds = new Set((overrides ?? []).map((o) => o.topic_id as string));
  return (globalTopics ?? []).filter((t) => hiddenIds.has(t.id as string)).map(mapCatalogTopic);
}

export async function fetchDraftsForTeacher(teacherId: string): Promise<CatalogTopic[]> {
  const { data } = await supabase.from('catalog_topics').select('*').eq('visibility', 'personal_draft').eq('created_by', teacherId);
  return (data ?? []).map(mapCatalogTopic);
}

export async function createSchoolCatalogTopic(input: {
  title: string;
  prompt: string;
  writingTypeId: string;
  level: string;
  minWords: number;
  maxWords: number;
  schoolId: string;
  createdBy: string;
}): Promise<CatalogTopic> {
  const { data, error } = await supabase
    .from('catalog_topics')
    .insert({
      title: input.title,
      prompt: input.prompt,
      writing_type_id: input.writingTypeId,
      level: input.level,
      min_words: input.minWords,
      max_words: input.maxWords,
      estimated_minutes: 40,
      difficulty: 'standard',
      source_type: 'school_library',
      visibility: 'school',
      school_id: input.schoolId,
      created_by: input.createdBy,
    })
    .select('*')
    .single();
  if (error || !data) throw error ?? new Error('catalog_insert_failed');
  return mapCatalogTopic(data);
}

export async function duplicateCatalogTopicToSchool(topicId: string, schoolId: string, teacherId: string): Promise<CatalogTopic> {
  const { data: source } = await supabase.from('catalog_topics').select('*').eq('id', topicId).maybeSingle();
  if (!source) throw new Error('topic_not_found');
  const { data, error } = await supabase
    .from('catalog_topics')
    .insert({
      title: source.title,
      prompt: source.prompt,
      writing_type_id: source.writing_type_id,
      level: source.level,
      min_words: source.min_words,
      max_words: source.max_words,
      estimated_minutes: source.estimated_minutes,
      tags: source.tags,
      difficulty: source.difficulty,
      learning_objectives: source.learning_objectives,
      genre_expectations: source.genre_expectations,
      planning_questions: source.planning_questions,
      source_type: 'school_library',
      visibility: 'school',
      school_id: schoolId,
      created_by: teacherId,
      origin_topic_id: source.id,
    })
    .select('*')
    .single();
  if (error || !data) throw error ?? new Error('catalog_duplicate_failed');
  return mapCatalogTopic(data);
}

export async function deleteCatalogTopic(topicId: string): Promise<void> {
  const { error } = await supabase.from('catalog_topics').delete().eq('id', topicId);
  if (error) throw error;
}

export async function hideCatalogTopicForSchool(schoolId: string, topicId: string, teacherId: string, teacherName: string): Promise<void> {
  const { error } = await supabase
    .from('catalog_visibility_overrides')
    .upsert({ school_id: schoolId, topic_id: topicId, hidden: true, updated_by: teacherId, updated_at: new Date().toISOString() }, { onConflict: 'school_id,topic_id' });
  if (error) throw error;
  const { data: topic } = await supabase.from('catalog_topics').select('title').eq('id', topicId).maybeSingle();
  await supabase.from('audit_events').insert({
    type: 'catalog_hidden', actor_id: teacherId, actor_name: teacherName,
    target_label: topic?.title ?? topicId, detail: 'Hidden for this school.',
  });
}

export async function restoreCatalogTopicForSchool(schoolId: string, topicId: string, teacherId: string, teacherName: string): Promise<void> {
  const { error } = await supabase
    .from('catalog_visibility_overrides')
    .upsert({ school_id: schoolId, topic_id: topicId, hidden: false, updated_by: teacherId, updated_at: new Date().toISOString() }, { onConflict: 'school_id,topic_id' });
  if (error) throw error;
  const { data: topic } = await supabase.from('catalog_topics').select('title').eq('id', topicId).maybeSingle();
  await supabase.from('audit_events').insert({
    type: 'catalog_restored', actor_id: teacherId, actor_name: teacherName,
    target_label: topic?.title ?? topicId, detail: 'Restored for this school.',
  });
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
