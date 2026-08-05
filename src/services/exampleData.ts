import { supabase } from './supabaseClient';
import type { CriterionScore, WritingAnnotation, WritingExample } from '../types/entities';

function mapCriterionScore(row: Record<string, unknown>): CriterionScore {
  return {
    criterionId: row.criterion_id as string,
    criterionKey: row.criterion_key as string,
    aiScore: row.ai_score as number,
    maxScore: row.max_score as number,
    weight: row.weight as number,
    explanation: row.explanation as string,
    evidenceQuote: (row.evidence_quote as string | null) ?? undefined,
    strongAspects: (row.strong_aspects as string[] | null) ?? [],
    developmentAreas: (row.development_areas as string[] | null) ?? [],
  };
}

function mapAnnotation(row: Record<string, unknown>): WritingAnnotation {
  return {
    id: row.id as string,
    start: row.start_pos as number,
    end: row.end_pos as number,
    quotedText: row.quoted_text as string,
    severity: row.severity as WritingAnnotation['severity'],
    categoryId: row.category_id as string,
    explanation: row.explanation as string,
    hint: (row.hint as string | null) ?? undefined,
    suggestedCorrection: (row.suggested_correction as string | null) ?? undefined,
  };
}

async function mapExample(row: Record<string, unknown>): Promise<WritingExample> {
  const [{ data: scores }, { data: annotations }] = await Promise.all([
    supabase.from('example_criterion_scores').select('*').eq('example_id', row.id),
    supabase.from('example_annotations').select('*').eq('example_id', row.id),
  ]);
  return {
    id: row.id as string,
    writingTypeId: row.writing_type_id as WritingExample['writingTypeId'],
    level: row.level as WritingExample['level'],
    topicId: (row.topic_id as string | null) ?? undefined,
    title: row.title as string,
    text: row.text as string,
    overallScore: row.overall_score as number,
    performanceBand: row.performance_band as WritingExample['performanceBand'],
    criterionScores: (scores ?? []).map(mapCriterionScore),
    strongPoints: (row.strong_points as string[] | null) ?? [],
    weakPoints: (row.weak_points as string[] | null) ?? [],
    annotations: (annotations ?? []).map(mapAnnotation),
    teacherExplanation: row.teacher_explanation as string,
  };
}

export async function fetchExamples(): Promise<WritingExample[]> {
  const { data } = await supabase.from('writing_examples').select('*');
  return Promise.all((data ?? []).map(mapExample));
}

export async function fetchExample(id: string): Promise<WritingExample | null> {
  const { data } = await supabase.from('writing_examples').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  return mapExample(data);
}
