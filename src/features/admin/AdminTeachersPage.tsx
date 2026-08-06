import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import type { AdminProfile, TeacherPermissionKey } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { fetchTeachers, setAccountStatus, createActivationCodeBatch, fetchSchools, type TeacherRow, type SchoolSummary } from '../../services/adminData';
import { replaceTeacherPermissions } from '../../services/teacherPermissionData';
import { deleteUserAccount } from '../../services/adminActionsClient';

const ALL_PERMISSIONS: TeacherPermissionKey[] = [
  'manage_school_settings', 'manage_teachers', 'manage_classes', 'manage_students',
  'reset_student_passwords', 'manage_school_catalog', 'create_assignments',
  'view_own_class_results', 'view_all_school_results', 'view_student_portfolios', 'export_reports',
];

export function AdminTeachersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const admin = user as AdminProfile;

  const [teachers, setTeachers] = useState<TeacherRow[] | null>(null);
  const [schools, setSchools] = useState<SchoolSummary[]>([]);
  const [creating, setCreating] = useState(false);
  const [inviteSchoolId, setInviteSchoolId] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<TeacherPermissionKey[]>([]);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TeacherRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reload = useCallback(() => {
    fetchTeachers().then(setTeachers);
  }, []);

  useEffect(() => {
    reload();
    fetchSchools().then((list) => {
      setSchools(list);
      setInviteSchoolId((prev) => prev || list[0]?.id || '');
    });
  }, [reload]);

  const startEdit = (teacherId: string) => {
    const tch = teachers?.find((x) => x.id === teacherId);
    setDraftPermissions(tch?.permissions ?? []);
    setPermissionError(null);
    setEditingId(teacherId);
  };

  const togglePermission = (p: TeacherPermissionKey) => {
    setDraftPermissions((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const savePermissions = async () => {
    if (!editingId || savingPermissions) return;
    setSavingPermissions(true);
    setPermissionError(null);
    try {
      await replaceTeacherPermissions(editingId, draftPermissions);
      reload();
      setEditingId(null);
    } catch {
      setPermissionError(t('states.error.generic'));
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleGenerateInvite = async () => {
    if (!inviteSchoolId) return;
    setGenerating(true);
    setGeneratedCode(null);
    const [code] = await createActivationCodeBatch({
      schoolId: inviteSchoolId,
      role: 'teacher',
      classId: null,
      count: 1,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    });
    setGenerating(false);
    setGeneratedCode(code ?? null);
  };

  const toggleStatus = async (tch: TeacherRow) => {
    await setAccountStatus(tch.id, tch.status === 'active' ? 'suspended' : 'active', { id: admin.id, displayName: admin.displayName });
    reload();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    await deleteUserAccount(confirmDelete.id);
    setDeleting(false);
    setConfirmDelete(null);
    reload();
  };

  if (!teachers) return <LoadingSkeleton height="12rem" />;

  return (
    <>
      <PageHeader
        title={t('nav.admin.teachers')}
        actions={<button type="button" className="btn btn--primary" onClick={() => setCreating((v) => !v)}><PlusCircle size={16} aria-hidden="true" /> {t('admin.users.createTeacher')}</button>}
      />

      {creating && (
        <div className="card card--padded" style={{ marginBottom: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p className="field__hint">{t('auth.activate.linkedTo')}</p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: 1, minWidth: '12rem' }}>
              <label className="field__label" htmlFor="invite-school">{t('admin.users.assignSchool')}</label>
              <select id="invite-school" className="select-control" value={inviteSchoolId} onChange={(e) => setInviteSchoolId(e.target.value)}>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <button type="button" className="btn btn--primary" onClick={handleGenerateInvite} disabled={generating || !inviteSchoolId}>{t('admin.codes.generate')}</button>
          </div>
          {generatedCode && (
            <p className="field__hint">{t('admin.codes.code')}: <code>{generatedCode}</code> — {t('nav.admin.activationCodes')}</p>
          )}
        </div>
      )}

      {teachers.length === 0 ? <EmptyState title={t('states.empty.generic')} /> : (
        <div className="card-grid">
          {teachers.map((tch) => (
            <div key={tch.id} className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 'var(--weight-medium)' }}>{tch.displayName}</span>
                <span className={`badge badge--${tch.status === 'active' ? 'success' : 'warning'}`}>{t(`accountStatus.${tch.status}`)}</span>
              </div>
              <span className="field__hint">@{tch.username}</span>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {tch.permissions.length === 0 ? <span className="field__hint">—</span> : tch.permissions.map((p) => <span key={p} className="badge badge--neutral">{p}</span>)}
              </div>

              {editingId === tch.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)' }}>
                  {ALL_PERMISSIONS.map((p) => (
                    <label key={p} className="checkbox-row">
                      <input type="checkbox" checked={draftPermissions.includes(p)} onChange={() => togglePermission(p)} disabled={savingPermissions} />
                      <span style={{ fontSize: 'var(--text-xs)' }}>{p}</span>
                    </label>
                  ))}
                  {permissionError && <p className="field__error" role="alert">{permissionError}</p>}
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                    <button type="button" className="btn btn--secondary btn--sm" onClick={() => setEditingId(null)} disabled={savingPermissions}>{t('common.cancel')}</button>
                    <button type="button" className="btn btn--primary btn--sm" onClick={savePermissions} disabled={savingPermissions}>{t('common.save')}</button>
                  </div>
                </div>
              ) : (
                <button type="button" className="btn btn--secondary btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => startEdit(tch.id)}>{t('admin.users.permissions')}</button>
              )}

              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => toggleStatus(tch)}>
                  {tch.status === 'active' ? t('admin.users.suspendAccount') : t('admin.users.reactivateAccount')}
                </button>
                <button type="button" className="btn btn--ghost btn--sm" style={{ color: 'var(--color-error)' }} onClick={() => setConfirmDelete(tch)}>
                  <Trash2 size={14} aria-hidden="true" /> {t('admin.users.deleteAccount')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmationDialog
        open={!!confirmDelete}
        title={t('admin.users.deleteAccountConfirmTitle')}
        description={t('admin.users.deleteAccountConfirmDescription')}
        destructive
        busy={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
}
