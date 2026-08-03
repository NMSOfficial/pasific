export function formatDate(iso: string | undefined, locale: string, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-GB', opts ?? { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string | undefined, locale: string): string {
  return formatDate(iso, locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatRelativeToNow(iso: string, locale: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const rtf = new Intl.RelativeTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-GB', { numeric: 'auto' });
  if (Math.abs(diffDays) < 1) {
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    return rtf.format(diffHours, 'hour');
  }
  return rtf.format(diffDays, 'day');
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}
