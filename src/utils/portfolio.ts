import type { PortfolioMetric, Submission } from '../types/entities';

export function computePortfolioMetrics(studentId: string, allSubmissions: Submission[]): PortfolioMetric {
  const subs = allSubmissions
    .filter((s) => s.studentId === studentId && s.status === 'result_ready' && s.finalScore !== undefined)
    .sort((a, b) => (a.submittedAt ?? '').localeCompare(b.submittedAt ?? ''));

  const scoreTrend = subs
    .filter((s) => !s.usesCustomRubric)
    .map((s) => ({ date: s.submittedAt ?? '', score: s.finalScore as number, submissionId: s.id }));

  const criterionTrend: Record<string, { date: string; score: number }[]> = {};
  for (const s of subs) {
    if (s.usesCustomRubric) continue;
    for (const c of s.criterionScores) {
      const pct = Math.round(((c.teacherScore ?? c.aiScore) / c.maxScore) * 100);
      criterionTrend[c.criterionKey] ??= [];
      criterionTrend[c.criterionKey].push({ date: s.submittedAt ?? '', score: pct });
    }
  }

  const errorCounts = new Map<string, number>();
  for (const s of subs) {
    for (const a of s.annotations) errorCounts.set(a.categoryId, (errorCounts.get(a.categoryId) ?? 0) + 1);
  }
  const topErrorCategories = [...errorCounts.entries()]
    .map(([categoryId, count]) => ({ categoryId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    studentId,
    totalCompleted: subs.length,
    writingTypesPractised: [...new Set(subs.map((s) => s.writingTypeId))],
    scoreTrend,
    criterionTrend,
    topErrorCategories,
    recentlyImproved: [],
  };
}

export function recomputeFinalScore(scores: { weight: number; teacherScore?: number; aiScore: number; maxScore: number }[]): number {
  const totalWeight = scores.reduce((sum, c) => sum + c.weight, 0) || 100;
  const weighted = scores.reduce((sum, c) => {
    const effective = c.teacherScore ?? c.aiScore;
    return sum + (effective / c.maxScore) * c.weight;
  }, 0);
  return Math.round((weighted / totalWeight) * 100);
}
