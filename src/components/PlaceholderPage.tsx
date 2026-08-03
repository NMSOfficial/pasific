import { useTranslation } from 'react-i18next';
import { PageHeader } from './PageHeader';
import { EmptyState } from './EmptyState';

/** Temporary stand-in for routes not yet implemented; kept out of the nav once a real screen lands. */
export function PlaceholderPage({ titleKey, title }: { titleKey?: string; title?: string }) {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={title ?? (titleKey ? t(titleKey) : '')} />
      <EmptyState title={t('common.comingSoon')} />
    </>
  );
}
