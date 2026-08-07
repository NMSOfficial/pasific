import { z } from 'zod';

export const criterionInputSchema = z.object({
  id: z.string(),
  key: z.string(),
  nameKey: z.string(),
  description: z.string().optional(),
  weight: z.number(),
  maxScore: z.number().positive(),
});

export const gradeRequestSchema = z.object({
  text: z.string().min(1),
  writingTypeId: z.string(),
  level: z.string(),
  assignmentPrompt: z.string().optional(),
  minWords: z.number().optional(),
  maxWords: z.number().optional(),
  criteria: z.array(criterionInputSchema).min(1),
});

export type GradeRequest = z.infer<typeof gradeRequestSchema>;
export type CriterionInput = z.infer<typeof criterionInputSchema>;

export const errorSeveritySchema = z.enum(['critical', 'mistake', 'inaccuracy', 'info']);

export const modelCriterionScoreSchema = z.object({
  criterionId: z.string(),
  score: z.number(),
  explanation: z.string(),
  evidenceQuote: z.string().optional(),
  strongAspects: z.array(z.string()).default([]),
  developmentAreas: z.array(z.string()).default([]),
});

export const modelAnnotationSchema = z.object({
  quotedText: z.string(),
  severity: errorSeveritySchema,
  categoryId: z.string(),
  explanation: z.string(),
  hint: z.string().optional(),
  suggestedCorrection: z.string().optional(),
});

export const modelOutputSchema = z.object({
  criterionScores: z.array(modelCriterionScoreSchema),
  annotations: z.array(modelAnnotationSchema).default([]),
});

export type ModelOutput = z.infer<typeof modelOutputSchema>;
export type ModelCriterionScore = z.infer<typeof modelCriterionScoreSchema>;
export type ModelAnnotation = z.infer<typeof modelAnnotationSchema>;