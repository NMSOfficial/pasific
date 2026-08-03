import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { a11ySkipLinkTargetId } from '../app/constants';
import { useTranslation } from 'react-i18next';
import type { NavItem } from '../app/navConfig';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileBottomNavigation } from './MobileBottomNavigation';
import { MobileMenuDrawer } from './MobileMenuDrawer';
import { TopHeader } from './TopHeader';

interface AppShellProps {
  sidebarItems: NavItem[];
  bottomNavItems?: NavItem[];
}

export function AppShell({ sidebarItems, bottomNavItems }: AppShellProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="app-shell">
      <a href={`#${a11ySkipLinkTargetId}`} className="skip-link">{t('a11y.skipToContent')}</a>
      <DesktopSidebar items={sidebarItems} collapsed={collapsed} onToggleCollapsed={() => setCollapsed((v) => !v)} />
      <div className="main-content">
        <TopHeader onOpenMobileMenu={() => setDrawerOpen(true)} />
        <main id={a11ySkipLinkTargetId} className="main-content__body" tabIndex={-1}>
          <div className="container" style={{ paddingInline: 0 }}>
            <Outlet />
          </div>
        </main>
      </div>
      {bottomNavItems && <MobileBottomNavigation items={bottomNavItems} />}
      <MobileMenuDrawer open={drawerOpen} items={sidebarItems} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
