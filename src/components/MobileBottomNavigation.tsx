import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { NavItem } from '../app/navConfig';

export function MobileBottomNavigation({ items }: { items: NavItem[] }) {
  const { t } = useTranslation();
  return (
    <nav className="bottom-nav" aria-label={t('a11y.openMenu')}>
      {items.map((item) => (
        <NavLink
          key={item.key}
          to={item.to}
          className={({ isActive }) => `bottom-nav__link ${isActive ? 'is-active' : ''}`}
        >
          <item.icon size={21} aria-hidden="true" />
          <span>{t(item.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
