import { useTranslation } from 'react-i18next';

/**
 * Placeholder Ethosoft attribution. The official ethosoft.org/logolar assets were not
 * reachable at build time (HTTP 403); this text mark should be swapped for the approved
 * logo once available. Do not replace with an invented graphic in the meantime.
 */
export function EthosoftBrand({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-faint)',
      }}
    >
      {!compact && <span>{t('app.developedBy')}</span>}
      <strong style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-muted)' }}>Ethosoft</strong>
    </span>
  );
}
