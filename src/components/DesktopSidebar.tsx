import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { NavItem } from '../app/navConfig';
import { PasificLogo } from './PasificLogo';

interface DesktopSidebarProps {
  items: NavItem[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function DesktopSidebar({ items, collapsed, onToggleCollapsed }: DesktopSidebarProps) {
  const { t } = useTranslation();
  return (
    <nav className={`desktop-sidebar ${collapsed ? 'is-collapsed' : ''}`} aria-label={t('nav.student.home')}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', paddingInline: 'var(--space-2)', minHeight: 40 }}>
        {!collapsed && <PasificLogo size="md" variant="full" className="pasific-logo--on-dark" />}
        {collapsed && <PasificLogo size="sm" variant="icon" />}
      </div>
      <ul className="sidebar-nav" role="list">
        {items.map((item) => (
          <li key={item.key}>
            <NavLink
              to={item.to}
              className={({ isActive }) => `sidebar-nav__link ${isActive ? 'is-active' : ''}`}
              title={collapsed ? t(item.labelKey) : undefined}
            >
              <item.icon size={19} aria-hidden="true" />
              {!collapsed && <span>{t(item.labelKey)}</span>}
            </NavLink>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="icon-btn"
        style={{ color: 'rgba(255,255,255,0.7)', alignSelf: collapsed ? 'center' : 'flex-end' }}
        onClick={onToggleCollapsed}
        aria-label={t('a11y.toggleSidebar')}
      >
        {collapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
      </button>
    </nav>
  );
}
