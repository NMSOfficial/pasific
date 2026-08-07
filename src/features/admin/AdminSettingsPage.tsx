import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertCircle, ScanText } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { ThemeSelector } from '../../components/ThemeSelector';
import { LanguageSelector } from '../../components/LanguageSelector';
import { PasswordChangeSection } from '../../components/PasswordChangeSection';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { fetchPlatformSettings, updatePlatformSettings } from '../../services/adminData';
import { configureMistralApiKey, fetchIntegrationStatus } from '../../services/assessmentData';

export function AdminSettingsPage() {
  const { t } = useTranslation();
  const [platformName, setPlatformName] = useState('Pasific');
  const [maintenance, setMaintenance] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [mistralConnected, setMistralConnected] = useState(false);
  const [mistralKey, setMistralKey] = useState('');
  const [savingMistral, setSavingMistral] = useState(false);
  const [mistralMessage, setMistralMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    Promise.all([fetchPlatformSettings(), fetchIntegrationStatus().catch(() => ({ mistral: false }))]).then(([settings, integrations]) => {
      setPlatformName(settings.platformName);
      setMaintenance(settings.maintenanceMode);
      setMistralConnected(integrations.mistral);
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

  const saveMistral = async () => {
    if (mistralKey.trim().length < 16) return;
    setSavingMistral(true);
    setMistralMessage(null);
    try {
      await configureMistralApiKey(mistralKey.trim());
      setMistralConnected(true);
      setMistralKey('');
      setMistralMessage({ kind: 'success', text: 'Mistral OCR bağlantısı doğrulandı ve güvenli biçimde kaydedildi.' });
    } catch (error) {
      setMistralMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Mistral anahtarı doğrulanamadı.' });
    } finally {
      setSavingMistral(false);
    }
  };

  if (!loaded) return <LoadingSkeleton height="12rem" />;

  return (
    <>
      <PageHeader title={t('nav.admin.settings')} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '34rem' }}>
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

        <section className="card card--padded assessment-form-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><ScanText size={18} /><h2 style={{ fontSize: 'var(--text-md)' }}>Mistral OCR</h2></div>
            <span className={`badge ${mistralConnected ? 'badge--success' : 'badge--warning'}`}>{mistralConnected ? 'Bağlı' : 'Bağlı değil'}</span>
          </div>
          <p className="field__hint">API anahtarı tarayıcıda saklanmaz ve kaydedildikten sonra tekrar görüntülenmez. Sunucu anahtarı Mistral üzerinde doğrular ve şifreli saklar.</p>
          <div className="field">
            <label className="field__label" htmlFor="mistral-api-key">Yeni Mistral API key</label>
            <input id="mistral-api-key" type="password" className="input-control" autoComplete="off" value={mistralKey} onChange={(event) => setMistralKey(event.target.value)} placeholder={mistralConnected ? 'Değiştirmek için yeni anahtar gir' : 'Mistral API key'} />
          </div>
          {mistralMessage && <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: mistralMessage.kind === 'success' ? 'var(--color-success)' : 'var(--color-error)' }}>{mistralMessage.kind === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}{mistralMessage.text}</div>}
          <button type="button" className="btn btn--primary" style={{ alignSelf: 'flex-start' }} disabled={savingMistral || mistralKey.trim().length < 16} onClick={saveMistral}>{savingMistral ? 'Doğrulanıyor…' : 'Doğrula ve kaydet'}</button>
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
