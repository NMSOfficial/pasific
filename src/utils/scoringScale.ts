export function scaleWritingScore(normalizedScore: number | undefined, maxPoints = 100): number | undefined {
  if (normalizedScore === undefined || !Number.isFinite(normalizedScore)) return undefined;
  const safeMax = Number.isFinite(maxPoints) && maxPoints > 0 ? maxPoints : 100;
  const scaled = (Math.max(0, Math.min(100, normalizedScore)) / 100) * safeMax;
  return Number(scaled.toFixed(safeMax <= 20 ? 2 : 1));
}

export function formatScaledScore(normalizedScore: number | undefined, maxPoints = 100): string {
  const scaled = scaleWritingScore(normalizedScore, maxPoints);
  if (scaled === undefined) return '—';
  return `${scaled.toString()}/${maxPoints}`;
}
