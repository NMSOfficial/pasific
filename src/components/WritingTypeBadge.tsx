import { useTranslation } from 'react-i18next';
import type { WritingTypeId } from '../types/entities';

export function WritingTypeBadge({ writingTypeId }: { writingTypeId: WritingTypeId }) {
  const { t } = useTranslation();
  return <span className="badge badge--neutral">{t(`writingType.${writingTypeId}`)}</span>;
}
