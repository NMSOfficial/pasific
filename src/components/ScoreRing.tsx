interface ScoreRingProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

function toneColor(pct: number): string {
  if (pct >= 80) return 'var(--color-success)';
  if (pct >= 60) return 'var(--color-primary)';
  if (pct >= 40) return 'var(--color-warning)';
  return 'var(--color-error)';
}

export function ScoreRing({ score, maxScore = 100, size = 88, strokeWidth = 8, label }: ScoreRingProps) {
  const pct = Math.max(0, Math.min(100, (score / maxScore) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  const color = toneColor(pct);

  return (
    <div
      className="score-ring"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${score} / ${maxScore}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-surface-alt)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 500ms ease' }}
        />
      </svg>
      <span className="score-ring__value" style={{ fontSize: size / 3.4 }}>
        {score}
      </span>
    </div>
  );
}
