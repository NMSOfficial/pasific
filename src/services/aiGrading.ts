import type { CefrLevel, CriterionScore, RubricCriterion, WritingAnnotation, WritingTypeId } from '../types/entities';
import { supabase } from './supabaseClient';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export interface GradeInput {
  text: string;
  writingTypeId: WritingTypeId;
  level: CefrLevel;
  assignmentPrompt?: string;
  minWords?: number;
  maxWords?: number;
  criteria: RubricCriterion[];
}

export interface GradeResult {
  criterionScores: CriterionScore[];
  annotations: WritingAnnotation[];
}

interface GradeApiCriterion {
  criterionId: string;
  criterionKey: string;
  maxScore: number;
  weight: number;
  score: number;
  explanation: string;
  evidenceQuote?: string;
  strongAspects: string[];
  developmentAreas: string[];
}

interface GradeApiAnnotation {
  id: string;
  start: number;
  end: number;
  quotedText: string;
  severity: WritingAnnotation['severity'];
  categoryId: string;
  explanation: string;
  hint?: string;
  suggestedCorrection?: string;
}

interface GradeApiResponse {
  criterionScores: GradeApiCriterion[];
  annotations: GradeApiAnnotation[];
}

export async function gradeWithAi(input: GradeInput): Promise<GradeResult> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}/api/grade`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({
      text: input.text,
      writingTypeId: input.writingTypeId,
      level: input.level,
      assignmentPrompt: input.assignmentPrompt,
      minWords: input.minWords,
      maxWords: input.maxWords,
      criteria: input.criteria.map((c) => ({ id: c.id, key: c.key, nameKey: c.nameKey, weight: c.weight, maxScore: c.maxScore })),
    }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new Error(body.error ?? `AI grading request failed (${res.status})`);
  }

  const data = (await res.json()) as GradeApiResponse;

  return {
    criterionScores: data.criterionScores.map((c) => ({
      criterionId: c.criterionId,
      criterionKey: c.criterionKey,
      aiScore: c.score,
      maxScore: c.maxScore,
      weight: c.weight,
      explanation: c.explanation,
      evidenceQuote: c.evidenceQuote,
      strongAspects: c.strongAspects,
      developmentAreas: c.developmentAreas,
    })),
    annotations: data.annotations.map((a) => ({
      id: a.id,
      start: a.start,
      end: a.end,
      quotedText: a.quotedText,
      severity: a.severity,
      categoryId: a.categoryId,
      explanation: a.explanation,
      hint: a.hint,
      suggestedCorrection: a.suggestedCorrection,
    })),
  };
}
