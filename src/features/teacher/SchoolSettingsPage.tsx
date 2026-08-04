import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/AuthContext';
import type { TeacherProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { PermissionGuard } from '../../components/PermissionGuard';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { fetchSchool, type SchoolSummary } from '../../services/adminData';

export function SchoolSettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const teacher = user as TeacherProfile;
  const [school, setSchool] = useState<SchoolSummary | null | undefined>(undefined);

  useEffect(() => {
    if (teacher.schoolIds[0]) fetchSchool(teacher.schoolIds[0]).then(setSchool);
  }, [teacher.schoolIds]);

  if (school === undefined) return <LoadingSkeleton height="12rem" />;

  return (
    <PermissionGuard permission="manage_school_settings">
      <PageHeader title={t('nav.teacher.school')} />
      <div className="card card--padded" style={{ maxWidth: '28rem', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div className="field">
          <label className="field__label" htmlFor="ss-name">{t('teacher.school.name')}</label>
          <input id="ss-name" className="input-control" defaultValue={school?.name} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="ss-city">{t('teacher.school.city')}</label>
          <input id="ss-city" className="input-control" defaultValue={school?.city ?? ''} />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="ss-plan-status">{t('teacher.school.planStatus')}</label>
          <input id="ss-plan-status" className="input-control" disabled defaultValue={school ? t(`accountStatus.${school.status === 'active' ? 'active' : 'suspended'}`) : ''} />
        </div>
        <button type="button" className="btn btn--primary" style={{ alignSelf: 'flex-start' }}>{t('common.save')}</button>
      </div>
    </PermissionGuard>
  );
}
