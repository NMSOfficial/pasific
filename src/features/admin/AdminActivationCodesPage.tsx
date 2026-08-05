import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/AuthContext';
import type { AdminProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { PdfExportButton } from '../../components/PdfExportButton';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { exportActivationCodesPdf } from '../../utils/pdf';
import { formatDate } from '../../utils/format';
import {
  fetchSchools, fetchClassesForSchool, fetchActivationCodes, createActivationCodeBatch, revokeActivationCode,
  type SchoolSummary, type ClassRow, type ActivationCodeRow,
} from '../../services/adminData';

export function AdminActivationCodesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const admin = user as AdminProfile;

  const [schools, setSchools] = useState<SchoolSummary[] | null>(null);
  const [schoolId, setSchoolId] = useState('');
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [count, setCount] = useState(10);
  const [expiresAt, setExpiresAt] = useState('2026-12-31');
  const [codes, setCodes] = useState<ActivationCodeRow[]>([]);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchSchools().then((list) => {
      setSchools(list);
      if (list[0]) setSchoolId(list[0].id);
    });
  }, []);

  const reloadCodes = useCallback((forSchoolId: string) => {
    if (!forSchoolId) return;
    fetchActivationCodes(forSchoolId).then(setCodes);
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    fetchClassesForSchool(schoolId).then((list) => {
      setClasses(list);
      setClassId(list[0]?.id ?? '');
    });
    reloadCodes(schoolId);
  }, [schoolId, reloadCodes]);

  if (!schools) return <LoadingSkeleton height="12rem" />;

  const handleGenerate = async () => {
    if (role === 'student' && !classId) return;
    setGenerating(true);
    await createActivationCodeBatch({
      schoolId,
      role,
      classId: role === 'student' ? classId : null,
      count,
      expiresAt: new Date(expiresAt).toISOString(),
    });
    setGenerating(false);
    reloadCodes(schoolId);
  };

  const school = schools.find((s) => s.id === schoolId);

  return (
    <>
      <PageHeader title={t('nav.admin.activationCodes')} />

      <div className="card card--padded" style={{ marginBottom: 'var(--space-6)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div className="field" style={{ minWidth: '10rem' }}>
          <label className="field__label" htmlFor="codes-school">{t('admin.codes.school')}</label>
          <select id="codes-school" className="select-control" value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ minWidth: '10rem' }}>
          <label className="field__label" htmlFor="codes-role">{t('common.role')}</label>
          <select id="codes-role" className="select-control" value={role} onChange={(e) => setRole(e.target.value as 'student' | 'teacher')}>
            <option value="student">{t('roles.student')}</option>
            <option value="teacher">{t('roles.teacher')}</option>
          </select>
        </div>
        {role === 'student' && (
          <div className="field" style={{ minWidth: '10rem' }}>
            <label className="field__label" htmlFor="codes-class">{t('admin.codes.class')}</label>
            <select id="codes-class" className="select-control" value={classId} onChange={(e) => setClassId(e.target.value)}>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div className="field" style={{ width: '8rem' }}>
          <label className="field__label" htmlFor="codes-count">{t('admin.codes.count')}</label>
          <input id="codes-count" type="number" className="input-control" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value))} />
        </div>
        <div className="field" style={{ width: '10rem' }}>
          <label className="field__label" htmlFor="codes-expires">{t('admin.codes.expiresAt')}</label>
          <input id="codes-expires" type="date" className="input-control" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </div>
        <button type="button" className="btn btn--primary" onClick={handleGenerate} disabled={generating || (role === 'student' && !classId)}>{t('admin.codes.generate')}</button>
        <PdfExportButton
          label={t('admin.codes.exportSheet')}
          onExport={() => exportActivationCodesPdf({
            schoolName: school?.name ?? '',
            className: role === 'student' ? (classes.find((c) => c.id === classId)?.name ?? '') : t('roles.teacher'),
            locale: i18n.resolvedLanguage ?? 'tr',
            codes: codes.filter((c) => c.status === 'unused').map((c) => ({ code: c.code, expiresAt: c.expiresAt })),
          })}
        />
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>{t('admin.codes.code')}</th><th>{t('common.role')}</th><th>{t('admin.codes.class')}</th><th>{t('common.status')}</th><th>{t('admin.codes.expiresAt')}</th><th><span className="visually-hidden">{t('common.actions')}</span></th></tr></thead>
          <tbody>
            {codes.map((code) => (
              <tr key={code.id}>
                <td><code>{code.code}</code></td>
                <td>{t(`roles.${code.role}`)}</td>
                <td>{code.className ?? '—'}</td>
                <td><span className={`badge badge--${code.status === 'unused' ? 'success' : code.status === 'used' ? 'neutral' : 'error'}`}>{t(`activationCodeStatus.${code.status}`)}</span></td>
                <td>{formatDate(code.expiresAt, i18n.resolvedLanguage ?? 'tr')}</td>
                <td>{code.status === 'unused' && <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRevokeTarget(code.id)}>{t('admin.codes.revoke')}</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmationDialog
        open={!!revokeTarget}
        title={t('admin.codes.revokeConfirmTitle')}
        description={t('admin.codes.revokeConfirmDescription')}
        destructive
        onConfirm={async () => {
          if (revokeTarget) {
            await revokeActivationCode(revokeTarget, { id: admin.id, displayName: admin.displayName });
            reloadCodes(schoolId);
          }
          setRevokeTarget(null);
        }}
        onCancel={() => setRevokeTarget(null)}
      />
    </>
  );
}
