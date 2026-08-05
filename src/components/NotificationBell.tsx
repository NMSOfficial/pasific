import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCheck } from 'lucide-react';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../services/notificationData';

const POLL_INTERVAL_MS = 60_000;

export function NotificationBell() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const poll = () => fetchUnreadNotificationCount().then((count) => { if (!cancelled) setUnreadCount(count); });
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchNotifications().then(setNotifications);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleSelect = async (n: AppNotification) => {
    setOpen(false);
    if (!n.readAt) {
      await markNotificationRead(n.id);
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (n.link) navigate(n.link);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setUnreadCount(0);
    setNotifications((list) => list?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? null);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        className="icon-btn"
        style={{ position: 'relative' }}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('notifications.title')}
      >
        <Bell size={18} aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', top: 2, right: 2, minWidth: 15, height: 15, borderRadius: 999,
              background: 'var(--color-error)', color: 'white', fontSize: 10, fontWeight: 'var(--weight-semibold)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div role="menu" className="dropdown-menu" style={{ width: '20rem', maxHeight: '24rem', overflowY: 'auto' }}>
          <div className="dropdown-menu__section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-2) var(--space-3)' }}>
            <p className="dropdown-menu__label" style={{ margin: 0 }}>{t('notifications.title')}</p>
            {unreadCount > 0 && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={handleMarkAllRead} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <CheckCheck size={13} aria-hidden="true" />{t('notifications.markAllRead')}
              </button>
            )}
          </div>
          {notifications === null && (
            <p style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{t('common.loading')}</p>
          )}
          {notifications !== null && notifications.length === 0 && (
            <p style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{t('notifications.empty')}</p>
          )}
          {notifications?.map((n) => (
            <button
              key={n.id}
              type="button"
              role="menuitem"
              className="dropdown-menu__item"
              onClick={() => handleSelect(n)}
              style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, opacity: n.readAt ? 0.6 : 1 }}
            >
              <span style={{ fontWeight: n.readAt ? 'var(--weight-normal)' : 'var(--weight-semibold)' }}>{n.title}</span>
              {n.body && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{n.body}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
