import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/AuthContext';
import type { TeacherProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { PdfExportButton } from '../../components/PdfExportButton';
import { PermissionGuard } from '../../components/PermissionGuard';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { exportActivationCodesPdf } from '../../utils/pdf';
import { formatDate } from '../../utils/format';
import {
  fetchSchool, fetchClassesForSchool, fetchActivationCodes, createActivationCodeBatch, revokeActivationCode,
  type SchoolSummary, type ClassRow, type ActivationCodeRow,
} from '../../services/adminData';

/** Same screen as the admin's, scoped to the teacher's own school — no school picker. */
export function TeacherActivationCodesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const teacher = user as TeacherProfile;
  const schoolId = teacher.schoolIds[0];

  const [school, setSchool] = useState<SchoolSummary | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [count, setCount] = useState(10);
  const [expiresAt, setExpiresAt] = useState('2026-12-31');
  const [codes, setCodes] = useState<ActivationCodeRow[] | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const reloadCodes = useCallback(() => {
    if (schoolId) fetchActivationCodes(schoolId).then(setCodes);
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    fetchSchool(schoolId).then(setSchool);
    fetchClassesForSchool(schoolId).then((list) => {
      setClasses(list);
      setClassId(list[0]?.id ?? '');
    });
    reloadCodes();
  }, [schoolId, reloadCodes]);

  if (codes === null) return <LoadingSkeleton height="12rem" />;

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
    reloadCodes();
  };

  return (
    <PermissionGuard permission="manage_students">
      <PageHeader title={t('nav.admin.activationCodes')} subtitle={school?.name} />

      <div className="card card--padded" style={{ marginBottom: 'var(--space-6)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div className="field" style={{ minWidth: '10rem' }}>
          <label className="field__label" htmlFor="tcodes-role">{t('common.role')}</label>
          <select id="tcodes-role" className="select-control" value={role} onChange={(e) => setRole(e.target.value as 'student' | 'teacher')}>
            <option value="student">{t('roles.student')}</option>
            <option value="teacher">{t('roles.teacher')}</option>
          </select>
        </div>
        {role === 'student' && (
          <div className="field" style={{ minWidth: '10rem' }}>
            <label className="field__label" htmlFor="tcodes-class">{t('admin.codes.class')}</label>
            <select id="tcodes-class" className="select-control" value={classId} onChange={(e) => setClassId(e.target.value)}>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div className="field" style={{ width: '8rem' }}>
          <label className="field__label" htmlFor="tcodes-count">{t('admin.codes.count')}</label>
          <input id="tcodes-count" type="number" className="input-control" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value))} />
        </div>
        <div className="field" style={{ width: '10rem' }}>
          <label className="field__label" htmlFor="tcodes-expires">{t('admin.codes.expiresAt')}</label>
          <input id="tcodes-expires" type="date" className="input-control" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </div>
        <button type="button" className="btn btn--primary" onClick={handleGenerate} disabled={generating || (role === 'student' && !classId)}>{t('admin.codes.generate')}</button>
        <PdfExportButton
          label={t('admin.codes.exportSheet')}
          onExport={() => exportActivationCodesPdf({
            schoolName: school?.name ?? '',
            className: role === 'student' ? (classes.find((c) => c.id === classId)?.name ?? '') : t('roles.teacher'),
            role,
            locale: i18n.resolvedLanguage ?? 'tr',
            codes: codes.filter((c) => c.status === 'unused' && c.role === role).map((c) => ({ code: c.code, expiresAt: c.expiresAt })),
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
            await revokeActivationCode(revokeTarget, { id: teacher.id, displayName: teacher.displayName });
            reloadCodes();
          }
          setRevokeTarget(null);
        }}
        onCancel={() => setRevokeTarget(null)}
      />
    </PermissionGuard>
  );
}
