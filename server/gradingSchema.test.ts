import assert from 'node:assert/strict';
import test from 'node:test';
import { gradeRequestSchema, modelOutputSchema } from './gradingSchema.ts';

test('gradeRequestSchema accepts a complete rubric request', () => {
  const parsed = gradeRequestSchema.parse({
    text: 'A short student response.',
    writingTypeId: 'essay',
    level: 'B1',
    criteria: [
      {
        id: 'criterion-1',
        key: 'task',
        nameKey: 'rubric.task.name',
        weight: 100,
        maxScore: 20,
      },
    ],
  });

  assert.equal(parsed.criteria.length, 1);
  assert.equal(parsed.level, 'B1');
});

test('gradeRequestSchema rejects an empty essay', () => {
  const result = gradeRequestSchema.safeParse({
    text: '',
    writingTypeId: 'essay',
    level: 'B1',
    criteria: [{ id: 'criterion-1', key: 'task', nameKey: 'rubric.task.name', weight: 100, maxScore: 20 }],
  });

  assert.equal(result.success, false);
});

test('modelOutputSchema applies safe array defaults', () => {
  const parsed = modelOutputSchema.parse({
    criterionScores: [
      {
        criterionId: 'criterion-1',
        score: 10,
        explanation: 'Clear response.',
      },
    ],
  });

  assert.deepEqual(parsed.annotations, []);
  assert.deepEqual(parsed.criterionScores[0]?.strongAspects, []);
  assert.deepEqual(parsed.criterionScores[0]?.developmentAreas, []);
});
