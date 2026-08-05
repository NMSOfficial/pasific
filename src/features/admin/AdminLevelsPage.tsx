import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { CefrLevel } from '../../types/entities';
import { CEFR_LEVELS } from '../../utils/cefr';
import { PageHeader } from '../../components/PageHeader';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { fetchLevelDescriptors, updateLevelDescriptor } from '../../services/adminData';

const LEVELS = CEFR_LEVELS;

export function AdminLevelsPage() {
  const { t } = useTranslation();
  const [level, setLevel] = useState<CefrLevel>('B2');
  const [descriptors, setDescriptors] = useState<Record<CefrLevel, string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { fetchLevelDescriptors().then(setDescriptors); }, []);

  if (!descriptors) return <LoadingSkeleton height="12rem" />;

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateLevelDescriptor(level, descriptors[level]);
      setMessage({ kind: 'success', text: t('common.saveSuccess') });
    } catch {
      setMessage({ kind: 'error', text: t('common.saveError') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title={t('nav.admin.levels')} />

      <div className="segmented-control" style={{ marginBottom: 'var(--space-5)' }}>
        {LEVELS.map((l) => (
          <button key={l} type="button" className={`segmented-control__option ${level === l ? 'is-active' : ''}`} onClick={() => { setLevel(l); setMessage(null); }}>{l}</button>
        ))}
      </div>

      <div className="card card--padded" style={{ maxWidth: '36rem', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <label className="field__label" htmlFor="level-descriptor">{t('admin.levels.descriptorsFor', { level })}</label>
        <textarea
          id="level-descriptor"
          className="textarea-control"
          rows={5}
          value={descriptors[level]}
          onChange={(e) => setDescriptors((prev) => (prev ? { ...prev, [level]: e.target.value } : prev))}
        />
        {message && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: message.kind === 'success' ? 'var(--color-success)' : 'var(--color-error)' }}>
            {message.kind === 'success' ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertCircle size={16} aria-hidden="true" />}
            {message.text}
          </div>
        )}
        <button type="button" className="btn btn--primary" style={{ alignSelf: 'flex-start' }} disabled={saving || !descriptors[level].trim()} onClick={handleSave}>{t('common.save')}</button>
      </div>
    </>
  );
}
