import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import type { TeacherProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { PermissionGuard } from '../../components/PermissionGuard';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { fetchSchool, updateSchool, type SchoolSummary } from '../../services/adminData';

export function SchoolSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const teacher = user as TeacherProfile;
  const [school, setSchool] = useState<SchoolSummary | null | undefined>(undefined);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!teacher.schoolIds[0]) return;
    fetchSchool(teacher.schoolIds[0]).then((s) => {
      setSchool(s);
      setName(s?.name ?? '');
      setCity(s?.city ?? '');
    });
  }, [teacher.schoolIds]);

  if (school === undefined) return <LoadingSkeleton height="12rem" />;

  const handleSave = async () => {
    if (!school) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateSchool(school.id, { name, city });
      setMessage({ kind: 'success', text: t('common.saveSuccess') });
    } catch {
      setMessage({ kind: 'error', text: t('common.saveError') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PermissionGuard permission="manage_school_settings">
      <PageHeader title={t('nav.teacher.school')} />
      <div className="card card--padded" style={{ maxWidth: '28rem', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div className="field">
          <label className="field__label" htmlFor="ss-name">{t('teacher.school.name')}</label>
          <input id="ss-name" className="input-control" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="ss-city">{t('teacher.school.city')}</label>
          <input id="ss-city" className="input-control" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="ss-plan-status">{t('teacher.school.planStatus')}</label>
          <input id="ss-plan-status" className="input-control" disabled defaultValue={school ? t(`accountStatus.${school.status === 'active' ? 'active' : 'suspended'}`) : ''} />
        </div>
        {message && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: message.kind === 'success' ? 'var(--color-success)' : 'var(--color-error)' }}>
            {message.kind === 'success' ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertCircle size={16} aria-hidden="true" />}
            {message.text}
          </div>
        )}
        <button type="button" className="btn btn--primary" style={{ alignSelf: 'flex-start' }} disabled={saving || !name.trim()} onClick={handleSave}>{t('common.save')}</button>
      </div>
    </PermissionGuard>
  );
}
