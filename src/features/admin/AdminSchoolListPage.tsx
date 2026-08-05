import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { PdfExportButton } from '../../components/PdfExportButton';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { formatDate } from '../../utils/format';
import { exportSchoolUsagePdf } from '../../utils/pdf';
import { fetchSchools, createSchool, type SchoolSummary } from '../../services/adminData';

export function AdminSchoolListPage() {
  const { t, i18n } = useTranslation();
  const [schools, setSchools] = useState<SchoolSummary[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    fetchSchools().then(setSchools);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await createSchool({ name: name.trim(), city: city.trim() });
    setSaving(false);
    setName('');
    setCity('');
    setCreating(false);
    reload();
  };

  if (!schools) return <LoadingSkeleton height="12rem" />;

  return (
    <>
      <PageHeader
        title={t('nav.admin.schools')}
        actions={
          <>
            <PdfExportButton
              label={t('admin.dashboard.schoolUsageSummary')}
              onExport={() => exportSchoolUsagePdf({
                locale: i18n.resolvedLanguage ?? 'tr',
                schools: schools.map((s) => ({
                  name: s.name, city: s.city ?? '', teacherCount: s.teacherCount, studentCount: s.studentCount,
                  activeAssignmentCount: s.activeAssignmentCount, status: t(`accountStatus.${s.status === 'active' ? 'active' : 'suspended'}`),
                })),
              })}
            />
            <button type="button" className="btn btn--primary" onClick={() => setCreating((v) => !v)}><PlusCircle size={16} aria-hidden="true" /> {t('admin.schools.create')}</button>
          </>
        }
      />

      {creating && (
        <div className="card card--padded" style={{ marginBottom: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: 1, minWidth: '12rem' }}>
            <label className="field__label" htmlFor="school-name">{t('admin.schools.name')}</label>
            <input id="school-name" className="input-control" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1, minWidth: '12rem' }}>
            <label className="field__label" htmlFor="school-city">{t('admin.schools.city')}</label>
            <input id="school-city" className="input-control" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <button type="button" className="btn btn--primary" onClick={handleCreate} disabled={!name.trim() || saving}>{t('common.save')}</button>
        </div>
      )}

      <div className="data-table-wrap desktop-only-block">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('admin.schools.name')}</th>
              <th>{t('common.status')}</th>
              <th>{t('admin.schools.teachers')}</th>
              <th>{t('admin.schools.students')}</th>
              <th>{t('admin.schools.classes')}</th>
              <th>{t('admin.dashboard.activeAssignments')}</th>
              <th><span className="visually-hidden">{t('common.actions')}</span></th>
            </tr>
          </thead>
          <tbody>
            {schools.map((school) => (
              <tr key={school.id}>
                <td>{school.name}<div className="field__hint">{school.city} · {formatDate(school.createdAt, i18n.resolvedLanguage ?? 'tr')}</div></td>
                <td><span className={`badge badge--${school.status === 'active' ? 'success' : 'error'}`}>{t(`accountStatus.${school.status === 'active' ? 'active' : 'suspended'}`)}</span></td>
                <td>{school.teacherCount}</td>
                <td>{school.studentCount}</td>
                <td>{school.classCount}</td>
                <td>{school.activeAssignmentCount}</td>
                <td><Link to={`/admin/schools/${school.id}`} className="btn btn--ghost btn--sm">{t('admin.schools.openSchool')}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mobile-student-list">
        {schools.map((school) => (
          <div key={school.id} className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 'var(--weight-medium)' }}>{school.name}</span>
              <span className={`badge badge--${school.status === 'active' ? 'success' : 'error'}`}>{t(`accountStatus.${school.status === 'active' ? 'active' : 'suspended'}`)}</span>
            </div>
            <span className="field__hint">{school.city} · {school.teacherCount} {t('admin.schools.teachers').toLowerCase()} · {school.studentCount} {t('admin.schools.students').toLowerCase()}</span>
            <Link to={`/admin/schools/${school.id}`} className="btn btn--secondary btn--sm" style={{ alignSelf: 'flex-start' }}>{t('admin.schools.openSchool')}</Link>
          </div>
        ))}
      </div>
    </>
  );
}
