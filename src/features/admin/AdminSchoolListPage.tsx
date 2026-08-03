import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { useMockState, mockStore } from '../../mock/useMockStore';
import { PageHeader } from '../../components/PageHeader';
import { PdfExportButton } from '../../components/PdfExportButton';
import { formatDate } from '../../utils/format';
import { exportSchoolUsagePdf } from '../../utils/pdf';

export function AdminSchoolListPage() {
  const { t, i18n } = useTranslation();
  const state = useMockState();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    mockStore.createSchool({
      id: `school_${Date.now()}`,
      name: name.trim(),
      city: city.trim(),
      status: 'active',
      teacherCount: 0,
      studentCount: 0,
      classCount: 0,
      activeAssignmentCount: 0,
      lastActivityAt: new Date().toISOString(),
      planStatus: 'pilot',
    });
    setName('');
    setCity('');
    setCreating(false);
  };

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
                schools: state.schools.map((s) => ({
                  name: s.name, city: s.city, teacherCount: s.teacherCount, studentCount: s.studentCount,
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
          <button type="button" className="btn btn--primary" onClick={handleCreate} disabled={!name.trim()}>{t('common.save')}</button>
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
            {state.schools.map((school) => (
              <tr key={school.id}>
                <td>{school.name}<div className="field__hint">{school.city} · {formatDate(school.lastActivityAt, i18n.resolvedLanguage ?? 'tr')}</div></td>
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
        {state.schools.map((school) => (
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
