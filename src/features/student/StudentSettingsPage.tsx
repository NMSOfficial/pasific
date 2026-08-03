import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/AuthContext';
import { useMockState } from '../../mock/useMockStore';
import { getClass, getSchool } from '../../mock/selectors';
import type { StudentProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { ThemeSelector } from '../../components/ThemeSelector';
import { LanguageSelector } from '../../components/LanguageSelector';

export function StudentSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const state = useMockState();
  const student = user as StudentProfile;
  const school = getSchool(state, student.schoolId);
  const classes = student.classIds.map((id) => getClass(state, id)).filter(Boolean);

  return (
    <>
      <PageHeader title={t('nav.student.settings')} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: '32rem' }}>
        <section className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--text-md)' }}>{t('settings.account')}</h2>
          <dl style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
            <Row label={t('settings.username')} value={student.username} />
            <Row label={t('common.student')} value={student.displayName} />
            <Row label={t('settings.school')} value={school?.name ?? '—'} />
            <Row label={t('settings.class')} value={classes.map((c) => c!.name).join(', ') || '—'} />
          </dl>
        </section>

        <section className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <h2 style={{ fontSize: 'var(--text-md)' }}>{t('settings.recovery')}</h2>
          <dl style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
            <Row label={t('auth.activate.email')} value={student.email ?? t('settings.noRecoveryEmail')} />
            <Row label={t('auth.activate.phone')} value={student.phone ?? t('settings.noRecoveryPhone')} />
          </dl>
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
