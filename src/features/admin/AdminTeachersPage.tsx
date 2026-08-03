import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusCircle } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import { useMockState, mockStore } from '../../mock/useMockStore';
import type { AdminProfile, TeacherPermissionKey } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';

const ALL_PERMISSIONS: TeacherPermissionKey[] = [
  'manage_school_settings', 'manage_teachers', 'manage_classes', 'manage_students',
  'reset_student_passwords', 'manage_school_catalog', 'create_assignments',
  'view_own_class_results', 'view_all_school_results', 'view_student_portfolios', 'export_reports',
];

export function AdminTeachersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const state = useMockState();
  const admin = user as AdminProfile;
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftPermissions, setDraftPermissions] = useState<TeacherPermissionKey[]>([]);
  const [form, setForm] = useState({ displayName: '', username: '', schoolId: state.schools[0]?.id ?? '' });

  const startEdit = (teacherId: string) => {
    const t2 = state.teachers.find((x) => x.id === teacherId);
    setDraftPermissions(t2?.permissions ?? []);
    setEditingId(teacherId);
  };

  const togglePermission = (p: TeacherPermissionKey) => {
    setDraftPermissions((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const savePermissions = () => {
    if (editingId) mockStore.updateTeacherPermissions(editingId, draftPermissions, admin.id, admin.displayName);
    setEditingId(null);
  };

  const handleCreate = () => {
    if (!form.displayName.trim() || !form.username.trim()) return;
    mockStore.createTeacher({
      id: `teacher_${Date.now()}`,
      role: 'teacher',
      username: form.username.trim(),
      displayName: form.displayName.trim(),
      status: 'active',
      createdAt: new Date().toISOString(),
      schoolIds: form.schoolId ? [form.schoolId] : [],
      classIds: [],
      permissions: [],
    });
    setForm({ displayName: '', username: '', schoolId: state.schools[0]?.id ?? '' });
    setCreating(false);
  };

  if (state.teachers.length === 0) return <EmptyState title={t('states.empty.generic')} />;

  return (
    <>
      <PageHeader
        title={t('nav.admin.teachers')}
        actions={<button type="button" className="btn btn--primary" onClick={() => setCreating((v) => !v)}><PlusCircle size={16} aria-hidden="true" /> {t('admin.users.createTeacher')}</button>}
      />

      {creating && (
        <div className="card card--padded" style={{ marginBottom: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="field" style={{ flex: 1, minWidth: '10rem' }}>
            <label className="field__label" htmlFor="new-teacher-name">{t('common.teacher')}</label>
            <input id="new-teacher-name" className="input-control" value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} />
          </div>
          <div className="field" style={{ flex: 1, minWidth: '10rem' }}>
            <label className="field__label" htmlFor="new-teacher-username">{t('settings.username')}</label>
            <input id="new-teacher-username" className="input-control" value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
          </div>
          <div className="field" style={{ flex: 1, minWidth: '10rem' }}>
            <label className="field__label" htmlFor="new-teacher-school">{t('admin.users.assignSchool')}</label>
            <select id="new-teacher-school" className="select-control" value={form.schoolId} onChange={(e) => setForm((f) => ({ ...f, schoolId: e.target.value }))}>
              {state.schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <button type="button" className="btn btn--primary" onClick={handleCreate}>{t('common.save')}</button>
        </div>
      )}

      <div className="card-grid">
        {state.teachers.map((tch) => (
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
                    <input type="checkbox" checked={draftPermissions.includes(p)} onChange={() => togglePermission(p)} />
                    <span style={{ fontSize: 'var(--text-xs)' }}>{p}</span>
                  </label>
                ))}
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                  <button type="button" className="btn btn--secondary btn--sm" onClick={() => setEditingId(null)}>{t('common.cancel')}</button>
                  <button type="button" className="btn btn--primary btn--sm" onClick={savePermissions}>{t('common.save')}</button>
                </div>
              </div>
            ) : (
              <button type="button" className="btn btn--secondary btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => startEdit(tch.id)}>{t('admin.users.permissions')}</button>
            )}

            <button
              type="button"
              className="btn btn--ghost btn--sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => mockStore.setAccountStatus(tch.id, tch.status === 'active' ? 'suspended' : 'active', admin.id, admin.displayName)}
            >
              {tch.status === 'active' ? t('admin.users.suspendAccount') : t('admin.users.reactivateAccount')}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
