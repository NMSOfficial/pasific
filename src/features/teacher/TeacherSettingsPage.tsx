import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/AuthContext';
import type { TeacherProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { ThemeSelector } from '../../components/ThemeSelector';
import { LanguageSelector } from '../../components/LanguageSelector';
import { fetchSchool, type SchoolSummary } from '../../services/adminData';

export function TeacherSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const teacher = user as TeacherProfile;
  const [school, setSchool] = useState<SchoolSummary | null>(null);

  useEffect(() => {
    if (teacher.schoolIds[0]) fetchSchool(teacher.schoolIds[0]).then(setSchool);
  }, [teacher.schoolIds]);

  return (
    <>
      <PageHeader title={t('nav.teacher.settings')} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '32rem' }}>
        <section className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--text-md)' }}>{t('settings.account')}</h2>
          <dl style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
            <Row label={t('settings.username')} value={teacher.username} />
            <Row label={t('common.teacher')} value={teacher.displayName} />
            <Row label={t('settings.school')} value={school?.name ?? '—'} />
            <Row label={t('common.email')} value={teacher.email ?? '—'} />
          </dl>
        </section>

        <section className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <h2 style={{ fontSize: 'var(--text-md)' }}>{t('teacher.team.permissions')}</h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {teacher.permissions.map((p) => <span key={p} className="badge badge--neutral">{p}</span>)}
          </div>
        </section>

        <section className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h2 style={{ fontSize: 'var(--text-md)' }}>{t('settings.preferences')}</h2>
          <div className="field">
            <label className="field__label">{t('settings.language')}</label>
            <LanguageSelector />
          </div>
          <div className="field">
            <label className="field__label">{t('settings.theme')}</label>
            <ThemeSelector />
          </div>
        </section>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
      <dt style={{ color: 'var(--color-text-muted)' }}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
