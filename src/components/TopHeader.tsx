import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, ChevronDown, LogOut, User } from 'lucide-react';
import { useAuth } from '../state/AuthContext';
import { useMockState } from '../mock/useMockStore';
import { PasificLogo } from './PasificLogo';
import { ThemeSelector } from './ThemeSelector';
import { LanguageSelector } from './LanguageSelector';

export function TopHeader({ onOpenMobileMenu }: { onOpenMobileMenu?: () => void }) {
  const { t } = useTranslation();
  const { user, logout, devSwitchUser } = useAuth();
  const state = useMockState();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const demoUsers = [
    ...state.students.slice(0, 3).map((u) => ({ id: u.id, label: `${u.displayName} (${t('roles.student')})` })),
    ...state.teachers.slice(0, 3).map((u) => ({ id: u.id, label: `${u.displayName} (${t('roles.teacher')})` })),
    ...state.admins.map((u) => ({ id: u.id, label: `${u.displayName} (${t('roles.super_admin')})` })),
  ];

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {onOpenMobileMenu && (
          <button type="button" className="icon-btn" onClick={onOpenMobileMenu} aria-label={t('a11y.openMenu')}>
            <Menu size={20} aria-hidden="true" />
          </button>
        )}
        <span className="mobile-only">
          <PasificLogo size="sm" variant="icon" />
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span className="desktop-only-inline">
          <ThemeSelector compact />
        </span>
        <span className="desktop-only-inline">
          <LanguageSelector compact />
        </span>

        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className="icon-btn"
            style={{ width: 'auto', gap: 'var(--space-2)', paddingInline: 'var(--space-2)' }}
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={t('a11y.userMenu')}
          >
            <span className="avatar-circle" aria-hidden="true">
              {user?.displayName?.[0]?.toUpperCase() ?? <User size={16} />}
            </span>
            <span className="desktop-only-inline" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--color-text)' }}>
              {user?.displayName}
            </span>
            <ChevronDown size={14} aria-hidden="true" />
          </button>

          {menuOpen && (
            <div role="menu" className="dropdown-menu">
              <div className="dropdown-menu__section">
                <p className="dropdown-menu__label">{user?.displayName}</p>
                <p className="dropdown-menu__sublabel">{user && t(`roles.${user.role}`)}</p>
              </div>
              <div className="mobile-only" style={{ padding: 'var(--space-2) var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <ThemeSelector compact />
                <LanguageSelector compact />
              </div>
              <button
                type="button"
                role="menuitem"
                className="dropdown-menu__item"
                onClick={() => { setMenuOpen(false); logout(); navigate('/login'); }}
              >
                <LogOut size={15} aria-hidden="true" /> {t('common.logout')}
              </button>
              <div className="dropdown-menu__section dropdown-menu__section--dev">
                <p className="dropdown-menu__label">{t('auth.login.devRoleSwitch')} <span className="badge badge--warning">{t('common.developmentTool')}</span></p>
                <select
                  className="select-control"
                  value={user?.id}
                  onChange={(e) => { devSwitchUser(e.target.value); setMenuOpen(false); }}
                >
                  {demoUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
