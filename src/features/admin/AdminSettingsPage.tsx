import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { ThemeSelector } from '../../components/ThemeSelector';
import { LanguageSelector } from '../../components/LanguageSelector';
import { PasswordChangeSection } from '../../components/PasswordChangeSection';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { fetchPlatformSettings, updatePlatformSettings } from '../../services/adminData';

export function AdminSettingsPage() {
  const { t } = useTranslation();
  const [platformName, setPlatformName] = useState('Pasific');
  const [maintenance, setMaintenance] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchPlatformSettings().then((s) => {
      setPlatformName(s.platformName);
      setMaintenance(s.maintenanceMode);
      setLoaded(true);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updatePlatformSettings({ platformName, maintenanceMode: maintenance });
      setMessage({ kind: 'success', text: t('common.saveSuccess') });
    } catch {
      setMessage({ kind: 'error', text: t('common.saveError') });
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <LoadingSkeleton height="12rem" />;

  return (
    <>
      <PageHeader title={t('nav.admin.settings')} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '28rem' }}>
        <section className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="field">
            <label className="field__label" htmlFor="platform-name">{t('admin.settings.platformName')}</label>
            <input id="platform-name" className="input-control" value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label">{t('admin.settings.defaultLanguage')}</label>
            <LanguageSelector compact />
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={maintenance} onChange={(e) => setMaintenance(e.target.checked)} />
            <span>{t('admin.settings.maintenanceMode')}</span>
          </label>
          {message && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: message.kind === 'success' ? 'var(--color-success)' : 'var(--color-error)' }}>
              {message.kind === 'success' ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertCircle size={16} aria-hidden="true" />}
              {message.text}
            </div>
          )}
          <button type="button" className="btn btn--primary" style={{ alignSelf: 'flex-start' }} disabled={saving || !platformName.trim()} onClick={handleSave}>{t('common.save')}</button>
        </section>

        <PasswordChangeSection />

        <section className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--text-md)' }}>{t('settings.preferences')}</h2>
          <div className="field">
            <label className="field__label">{t('settings.theme')}</label>
            <ThemeSelector />
          </div>
        </section>
      </div>
    </>
  );
}
