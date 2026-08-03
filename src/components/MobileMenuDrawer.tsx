import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { NavItem } from '../app/navConfig';
import { PasificLogo } from './PasificLogo';

interface MobileMenuDrawerProps {
  open: boolean;
  items: NavItem[];
  onClose: () => void;
}

export function MobileMenuDrawer({ open, items, onClose }: MobileMenuDrawerProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="mobile-drawer" role="dialog" aria-modal="true" aria-label={t('a11y.openMenu')}>
      <div className="mobile-drawer__header">
        <PasificLogo size="sm" className="pasific-logo--on-dark" />
        <button type="button" className="icon-btn" onClick={onClose} aria-label={t('a11y.closeMenu')}>
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <ul className="mobile-drawer__nav" role="list">
        {items.map((item) => (
          <li key={item.key}>
            <NavLink
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => `mobile-drawer__link ${isActive ? 'is-active' : ''}`}
            >
              <item.icon size={20} aria-hidden="true" />
              <span>{t(item.labelKey)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>,
    document.body
  );
}
