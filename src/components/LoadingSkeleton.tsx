export function LoadingSkeleton({ height = '1rem', width = '100%', radius, className }: { height?: string | number; width?: string | number; radius?: string; className?: string }) {
  return (
    <div
      className={`skeleton ${className ?? ''}`}
      style={{ height, width, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }} aria-hidden="true">
      <LoadingSkeleton height="0.875rem" width="40%" />
      <LoadingSkeleton height="1.25rem" width="70%" />
      <LoadingSkeleton height="0.875rem" width="90%" />
      <LoadingSkeleton height="2.25rem" width="8rem" radius="var(--radius-md)" />
    </div>
  );
}
