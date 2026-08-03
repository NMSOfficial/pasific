interface PasificLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon';
  className?: string;
}

const SIZES: Record<NonNullable<PasificLogoProps['size']>, number> = { sm: 24, md: 32, lg: 44 };

/**
 * Temporary product mark: a minimal wave symbol, not a final Ethosoft-approved logo.
 * Replace `PasificLogo` wholesale once an official mark is provided.
 */
export function PasificLogo({ size = 'md', variant = 'full', className }: PasificLogoProps) {
  const px = SIZES[size];
  return (
    <span
      className={`pasific-logo pasific-logo--${variant} ${className ?? ''}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
    >
      <svg width={px} height={px} viewBox="0 0 40 40" fill="none" role="img" aria-label="Pasific">
        <rect width="40" height="40" rx="11" fill="var(--color-navy-900)" />
        <path
          d="M6 24c3-4 6-4 9 0s6 4 9 0 6-4 9 0"
          stroke="var(--color-primary)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M6 17c3-4 6-4 9 0s6 4 9 0 6-4 9 0"
          stroke="var(--color-secondary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.8"
        />
      </svg>
      {variant === 'full' && (
        <span
          style={{
            fontWeight: 'var(--weight-semibold)',
            fontSize: size === 'lg' ? 'var(--text-xl)' : 'var(--text-lg)',
            letterSpacing: '-0.01em',
            color: 'var(--color-text)',
          }}
        >
          Pasific
        </span>
      )}
    </span>
  );
}
