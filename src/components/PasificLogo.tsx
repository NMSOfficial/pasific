interface PasificLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon';
  className?: string;
}

const SIZES: Record<NonNullable<PasificLogoProps['size']>, number> = { sm: 24, md: 32, lg: 44 };

export function PasificLogo({ size = 'md', variant = 'full', className }: PasificLogoProps) {
  const px = SIZES[size];
  return (
    <span
      className={`pasific-logo pasific-logo--${variant} ${className ?? ''}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}
    >
      <span className="pasific-logo__icon-badge" style={{ width: px, height: px }}>
        <img src="/brand/logo-color-icon.png" alt="Pasific" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }} />
      </span>
      {variant === 'full' && (
        <span
          style={{
            fontWeight: 'var(--weight-semibold)',
            fontSize: size === 'lg' ? 'var(--text-xl)' : 'var(--text-lg)',
            letterSpacing: '-0.01em',
            color: 'var(--color-text)',
          }}
        >
          pasific
        </span>
      )}
    </span>
  );
}
