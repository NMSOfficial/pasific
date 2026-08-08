import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeExamQuestions, parseExamModelJson } from './secureExamGrading.ts';

test('parseExamModelJson accepts fenced JSON and validates questions', () => {
  const parsed = parseExamModelJson(`\`\`\`json
{
  "overallPercent": 75,
  "summary": "Good work",
  "questions": [
    {
      "key": "q1",
      "label": "Question 1",
      "maxPoints": 10,
      "score": 7.5,
      "explanation": "Mostly correct"
    }
  ]
}
\`\`\``);

  assert.equal(parsed.overallPercent, 75);
  assert.equal(parsed.questions.length, 1);
  assert.equal(parsed.questions[0]?.score, 7.5);
});

test('normalizeExamQuestions makes question maxima sum exactly to a 5-point scale', () => {
  const result = normalizeExamQuestions([
    { key: 'q1', label: 'Q1', maxPoints: 10, score: 10, explanation: 'ok' },
    { key: 'q2', label: 'Q2', maxPoints: 20, score: 10, explanation: 'ok' },
    { key: 'q3', label: 'Q3', maxPoints: 30, score: 15, explanation: 'ok' },
  ], 5);

  const maxTotal = Number(result.questions.reduce((sum, row) => sum + row.max_score, 0).toFixed(2));
  assert.equal(maxTotal, 5);
  assert.ok(result.finalScore >= 0 && result.finalScore <= 5);
});

test('normalizeExamQuestions preserves an exact 100-point total for equal weights', () => {
  const result = normalizeExamQuestions([
    { key: 'q1', label: 'Q1', maxPoints: 1, score: 1, explanation: 'ok' },
    { key: 'q2', label: 'Q2', maxPoints: 1, score: 1, explanation: 'ok' },
    { key: 'q3', label: 'Q3', maxPoints: 1, score: 1, explanation: 'ok' },
  ], 100);

  assert.equal(Number(result.questions.reduce((sum, row) => sum + row.max_score, 0).toFixed(2)), 100);
  assert.equal(result.finalScore, 100);
});

test('normalizeExamQuestions clamps model scores above question maximum', () => {
  const result = normalizeExamQuestions([
    { key: 'q1', label: 'Q1', maxPoints: 10, score: 999, explanation: 'bad model output' },
  ], 10);

  assert.equal(result.questions[0]?.max_score, 10);
  assert.equal(result.questions[0]?.ai_score, 10);
  assert.equal(result.finalScore, 10);
});

test('normalizeExamQuestions rejects a score scale too small for cent-level question allocation', () => {
  assert.throws(
    () => normalizeExamQuestions(
      Array.from({ length: 101 }, (_, index) => ({
        key: `q${index + 1}`,
        label: `Q${index + 1}`,
        maxPoints: 1,
        score: 1,
        explanation: 'ok',
      })),
      1,
    ),
    /exam_scale_too_small_for_question_count/,
  );
});

test('parseExamModelJson rejects empty question arrays', () => {
  assert.throws(
    () => parseExamModelJson('{"overallPercent":0,"summary":"x","questions":[]}'),
    /exam_grading_invalid_questions/,
  );
});
