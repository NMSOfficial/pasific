import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TriangleAlert } from 'lucide-react';
import { useAuth } from '../state/AuthContext';
import { fetchPlatformSettings } from '../services/adminData';

/** Informational only — doesn't block access. Hidden for super_admin, who's the one who turned it on. */
export function MaintenanceBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    if (user?.role === 'super_admin') return;
    fetchPlatformSettings().then((s) => setMaintenance(s.maintenanceMode));
  }, [user?.role]);

  if (!maintenance || user?.role === 'super_admin') return null;

  return (
    <div
      role="status"
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
        padding: 'var(--space-3) var(--space-4)', background: 'var(--color-warning-soft)',
        color: 'var(--color-warning)', fontSize: 'var(--text-sm)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <TriangleAlert size={16} aria-hidden="true" />
      {t('admin.settings.maintenanceBannerMessage')}
    </div>
  );
}
