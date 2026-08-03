import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BarChart3, School, UsersRound, Settings, ChevronRight } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';

const ITEMS = [
  { to: '/teacher/reports', icon: BarChart3, labelKey: 'nav.teacher.reports' },
  { to: '/teacher/school', icon: School, labelKey: 'nav.teacher.school' },
  { to: '/teacher/team', icon: UsersRound, labelKey: 'nav.teacher.team' },
  { to: '/teacher/settings', icon: Settings, labelKey: 'nav.teacher.settings' },
];

export function TeacherMobileMenuPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t('nav.teacher.menu')} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {ITEMS.map((item) => (
          <Link key={item.to} to={item.to} className="card card--padded" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <item.icon size={20} aria-hidden="true" />
            <span style={{ flex: 1, fontWeight: 'var(--weight-medium)' }}>{t(item.labelKey)}</span>
            <ChevronRight size={18} color="var(--color-text-faint)" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </>
  );
}
