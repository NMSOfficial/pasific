import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileDown, Loader2 } from 'lucide-react';

export function PdfExportButton({ onExport, label }: { onExport: () => void | Promise<void>; label?: string }) {
  const { t } = useTranslation();
  const [generating, setGenerating] = useState(false);

  const handleClick = async () => {
    setGenerating(true);
    try {
      await onExport();
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button type="button" className="btn btn--secondary" onClick={handleClick} disabled={generating}>
      {generating ? <Loader2 size={16} className="spin" aria-hidden="true" /> : <FileDown size={16} aria-hidden="true" />}
      {label ?? t('common.exportPdf')}
    </button>
  );
}
