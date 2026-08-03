import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/PageHeader';
import { ThemeSelector } from '../../components/ThemeSelector';
import { LanguageSelector } from '../../components/LanguageSelector';

export function AdminSettingsPage() {
  const { t } = useTranslation();
  const [maintenance, setMaintenance] = useState(false);

  return (
    <>
      <PageHeader title={t('nav.admin.settings')} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '28rem' }}>
        <section className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="field">
            <label className="field__label" htmlFor="platform-name">{t('admin.settings.platformName')}</label>
            <input id="platform-name" className="input-control" defaultValue="Pasific" />
          </div>
          <div className="field">
            <label className="field__label">{t('admin.settings.defaultLanguage')}</label>
            <LanguageSelector compact />
          </div>
          <label className="checkbox-row">
            <input type="checkbox" checked={maintenance} onChange={(e) => setMaintenance(e.target.checked)} />
            <span>{t('admin.settings.maintenanceMode')}</span>
          </label>
          <button type="button" className="btn btn--primary" style={{ alignSelf: 'flex-start' }}>{t('common.save')}</button>
        </section>

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
