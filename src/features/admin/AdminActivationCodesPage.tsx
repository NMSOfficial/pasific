import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/AuthContext';
import { useMockState, mockStore } from '../../mock/useMockStore';
import { getClassesForSchool } from '../../mock/selectors';
import type { AdminProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { PdfExportButton } from '../../components/PdfExportButton';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { exportActivationCodesPdf } from '../../utils/pdf';
import { formatDate } from '../../utils/format';

export function AdminActivationCodesPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const state = useMockState();
  const admin = user as AdminProfile;

  const [schoolId, setSchoolId] = useState(state.schools[0]?.id ?? '');
  const classes = getClassesForSchool(state, schoolId);
  const [classId, setClassId] = useState(classes[0]?.id ?? '');
  const [count, setCount] = useState(10);
  const [expiresAt, setExpiresAt] = useState('2026-12-31');
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);

  const handleGenerate = () => {
    const cls = getClassesForSchool(state, schoolId).find((c) => c.id === classId) ?? classes[0];
    if (!cls) return;
    mockStore.createActivationCodeBatch({
      schoolId,
      classId: cls.id,
      count,
      expiresAt: new Date(expiresAt).toISOString(),
      batchId: `batch_${Date.now()}`,
    });
  };

  const school = state.schools.find((s) => s.id === schoolId);
  const codesForSchool = state.activationCodes.filter((c) => c.schoolId === schoolId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <PageHeader title={t('nav.admin.activationCodes')} />

      <div className="card card--padded" style={{ marginBottom: 'var(--space-6)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
        <div className="field" style={{ minWidth: '10rem' }}>
          <label className="field__label" htmlFor="codes-school">{t('admin.codes.school')}</label>
          <select id="codes-school" className="select-control" value={schoolId} onChange={(e) => { setSchoolId(e.target.value); setClassId(''); }}>
            {state.schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ minWidth: '10rem' }}>
          <label className="field__label" htmlFor="codes-class">{t('admin.codes.class')}</label>
          <select id="codes-class" className="select-control" value={classId || classes[0]?.id} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ width: '8rem' }}>
          <label className="field__label" htmlFor="codes-count">{t('admin.codes.count')}</label>
          <input id="codes-count" type="number" className="input-control" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value))} />
        </div>
        <div className="field" style={{ width: '10rem' }}>
          <label className="field__label" htmlFor="codes-expires">{t('admin.codes.expiresAt')}</label>
          <input id="codes-expires" type="date" className="input-control" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </div>
        <button type="button" className="btn btn--primary" onClick={handleGenerate}>{t('admin.codes.generate')}</button>
        <PdfExportButton
          label={t('admin.codes.exportSheet')}
          onExport={() => exportActivationCodesPdf({
            schoolName: school?.name ?? '',
            className: classes.find((c) => c.id === classId)?.name ?? '',
            locale: i18n.resolvedLanguage ?? 'tr',
            codes: codesForSchool.filter((c) => c.status === 'unused').map((c) => ({ code: c.code, expiresAt: c.expiresAt })),
          })}
        />
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>{t('admin.codes.code')}</th><th>{t('admin.codes.class')}</th><th>{t('common.status')}</th><th>{t('admin.codes.expiresAt')}</th><th><span className="visually-hidden">{t('common.actions')}</span></th></tr></thead>
          <tbody>
            {codesForSchool.map((code) => (
              <tr key={code.id}>
                <td><code>{code.code}</code></td>
                <td>{getClassesForSchool(state, schoolId).find((c) => c.id === code.classId)?.name}</td>
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
        onConfirm={() => { if (revokeTarget) mockStore.revokeActivationCode(revokeTarget, admin.id, admin.displayName); setRevokeTarget(null); }}
        onCancel={() => setRevokeTarget(null)}
      />
    </>
  );
}
