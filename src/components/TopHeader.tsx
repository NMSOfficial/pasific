import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, ChevronDown, LogOut, User } from 'lucide-react';
import { useAuth } from '../state/AuthContext';
import type { TeacherProfile } from '../types/entities';
import { PasificLogo } from './PasificLogo';
import { ThemeSelector } from './ThemeSelector';
import { LanguageSelector } from './LanguageSelector';
import { NotificationBell } from './NotificationBell';
import { fetchSchool } from '../services/adminData';

export function TopHeader({ onOpenMobileMenu }: { onOpenMobileMenu?: () => void }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  useEffect(() => {
    if (user?.role !== 'teacher') return;
    const schoolId = (user as TeacherProfile).schoolIds[0];
    if (schoolId) fetchSchool(schoolId).then((s) => setSchoolName(s?.name ?? null));
  }, [user]);

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {onOpenMobileMenu && (
          <button type="button" className="icon-btn mobile-only" onClick={onOpenMobileMenu} aria-label={t('a11y.openMenu')}>
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
        <NotificationBell />

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
                <p className="dropdown-menu__sublabel">
                  {user && t(`roles.${user.role}`)}
                  {schoolName && ` · ${schoolName}`}
                </p>
              </div>
              <div className="mobile-only" style={{ padding: 'var(--space-2) var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <ThemeSelector compact />
                <LanguageSelector compact />
              </div>
              <button
                type="button"
                role="menuitem"
                className="dropdown-menu__item"
                onClick={async () => { setMenuOpen(false); await logout(); navigate('/login'); }}
              >
                <LogOut size={15} aria-hidden="true" /> {t('common.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
