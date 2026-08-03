import type { CefrLevel } from '../types/entities';

export function CefrLevelBadge({ level }: { level: CefrLevel }) {
  return (
    <span className="badge badge--primary" title={`CEFR ${level}`}>
      {level}
    </span>
  );
}
