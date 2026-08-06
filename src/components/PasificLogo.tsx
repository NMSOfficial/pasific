interface PasificLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'icon';
  className?: string;
}

const SIZES: Record<NonNullable<PasificLogoProps['size']>, number> = { sm: 24, md: 32, lg: 44 };
const LOGO_ASPECT_RATIO = 4;

export function PasificLogo({ size = 'md', variant = 'full', className }: PasificLogoProps) {
  const px = SIZES[size];
  const onDark = className?.split(/\s+/).includes('pasific-logo--on-dark') ?? false;

  return (
    <span
      className={`pasific-logo pasific-logo--${variant} ${className ?? ''}`}
      style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
    >
      {variant === 'full' ? (
        <img
          src="/brand/logo-color-icon.png"
          alt="Pasific"
          style={{
            display: 'block',
            width: px * LOGO_ASPECT_RATIO,
            height: px,
            objectFit: 'contain',
            filter: onDark ? 'brightness(0) invert(1)' : undefined,
          }}
        />
      ) : (
        <span
          className="pasific-logo__icon-badge"
          style={{
            width: px,
            height: px,
            background: '#fff',
            overflow: 'hidden',
          }}
        >
          <img
            src="/brand/logo-color-icon.png"
            alt=""
            aria-hidden="true"
            style={{
              display: 'block',
              width: px * LOGO_ASPECT_RATIO,
              maxWidth: 'none',
              height: px,
              objectFit: 'fill',
            }}
          />
        </span>
      )}
    </span>
  );
}
