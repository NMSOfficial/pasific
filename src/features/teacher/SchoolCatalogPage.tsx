import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import type { CatalogTopic, TeacherProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { WritingTypeBadge } from '../../components/WritingTypeBadge';
import { CefrLevelBadge } from '../../components/CefrLevelBadge';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { useHasPermission } from '../../components/PermissionGuard';
import {
  fetchVisibleCatalogForSchool, fetchHiddenGlobalTopicsForSchool, fetchDraftsForTeacher,
  hideCatalogTopicForSchool, restoreCatalogTopicForSchool, duplicateCatalogTopicToSchool, deleteCatalogTopic,
} from '../../services/contentData';

type Tab = 'pasific' | 'school' | 'hidden' | 'drafts';

export function SchoolCatalogPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const teacher = user as TeacherProfile;
  const canManage = useHasPermission('manage_school_catalog');
  const schoolId = teacher.schoolIds[0];

  const [tab, setTab] = useState<Tab>('pasific');
  const [confirmAction, setConfirmAction] = useState<{ type: 'hide' | 'delete'; topic: CatalogTopic } | null>(null);
  const [visible, setVisible] = useState<CatalogTopic[] | null>(null);
  const [hiddenTopics, setHiddenTopics] = useState<CatalogTopic[]>([]);
  const [drafts, setDrafts] = useState<CatalogTopic[]>([]);

  const reload = useCallback(() => {
    fetchVisibleCatalogForSchool(schoolId).then(setVisible);
    fetchHiddenGlobalTopicsForSchool(schoolId).then(setHiddenTopics);
    fetchDraftsForTeacher(teacher.id).then(setDrafts);
  }, [schoolId, teacher.id]);

  useEffect(() => { reload(); }, [reload]);

  if (!visible) return <LoadingSkeleton height="12rem" />;

  const pasificTopics = visible.filter((t2) => t2.visibility === 'global');
  const schoolTopics = visible.filter((t2) => t2.visibility === 'school');
  const list = tab === 'pasific' ? pasificTopics : tab === 'school' ? schoolTopics : tab === 'hidden' ? hiddenTopics : drafts;

  const confirmDialog = () => {
    if (!confirmAction) return null;
    if (confirmAction.type === 'hide') {
      return (
        <ConfirmationDialog
          open
          title={t('teacher.catalog.hideConfirmTitle')}
          description={t('teacher.catalog.hideConfirmDescription')}
          onConfirm={async () => { await hideCatalogTopicForSchool(schoolId, confirmAction.topic.id, teacher.id, teacher.displayName); setConfirmAction(null); reload(); }}
          onCancel={() => setConfirmAction(null)}
        />
      );
    }
    return (
      <ConfirmationDialog
        open
        title={t('teacher.catalog.deleteConfirmTitle')}
        description={t('teacher.catalog.deleteConfirmDescription')}
        destructive
        onConfirm={async () => { await deleteCatalogTopic(confirmAction.topic.id); setConfirmAction(null); reload(); }}
        onCancel={() => setConfirmAction(null)}
      />
    );
  };

  return (
    <>
      <PageHeader title={t('nav.teacher.catalog')} actions={canManage ? <Link to="/teacher/assignments/new" className="btn btn--primary">{t('teacher.catalog.newTopic')}</Link> : undefined} />

      <div className="segmented-control" style={{ marginBottom: 'var(--space-5)' }}>
        <button type="button" className={`segmented-control__option ${tab === 'pasific' ? 'is-active' : ''}`} onClick={() => setTab('pasific')}>{t('teacher.catalog.tabPasific')}</button>
        <button type="button" className={`segmented-control__option ${tab === 'school' ? 'is-active' : ''}`} onClick={() => setTab('school')}>{t('teacher.catalog.tabSchool')}</button>
        <button type="button" className={`segmented-control__option ${tab === 'hidden' ? 'is-active' : ''}`} onClick={() => setTab('hidden')}>{t('teacher.catalog.tabHidden')}</button>
        <button type="button" className={`segmented-control__option ${tab === 'drafts' ? 'is-active' : ''}`} onClick={() => setTab('drafts')}>{t('teacher.catalog.tabDrafts')}</button>
      </div>

      {list.length === 0 ? (
        <EmptyState title={t('catalog.noResults')} />
      ) : (
        <div className="card-grid">
          {list.map((topic) => (
            <div key={topic.id} className="card card--padded catalog-card">
              <div className="catalog-card__header">
                <div className="catalog-card__badges">
                  <WritingTypeBadge writingTypeId={topic.writingTypeId} />
                  <CefrLevelBadge level={topic.level} />
                </div>
                <span className="badge badge--outline">{t(`catalogVisibility.${topic.visibility}`)}</span>
              </div>
              <p className="catalog-card__title">{topic.title}</p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{topic.prompt}</p>

              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
                <Link to="/teacher/assignments/new" className="btn btn--secondary btn--sm">{t('teacher.catalog.assign')}</Link>

                {tab === 'pasific' && canManage && (
                  <>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={async () => { await duplicateCatalogTopicToSchool(topic.id, schoolId, teacher.id); reload(); }}>{t('teacher.catalog.duplicateForSchool')}</button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmAction({ type: 'hide', topic })}>{t('teacher.catalog.hideForSchool')}</button>
                  </>
                )}
                {tab === 'school' && canManage && (
                  <>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={async () => { await duplicateCatalogTopicToSchool(topic.id, schoolId, teacher.id); reload(); }}>{t('common.duplicate')}</button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmAction({ type: 'delete', topic })}>{t('common.delete')}</button>
                  </>
                )}
                {tab === 'hidden' && canManage && (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={async () => { await restoreCatalogTopicForSchool(schoolId, topic.id, teacher.id, teacher.displayName); reload(); }}>{t('teacher.catalog.restoreForSchool')}</button>
                )}
                {tab === 'drafts' && (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmAction({ type: 'delete', topic })}>{t('common.delete')}</button>
                )}
              </div>
              {(topic.visibility === 'school' || topic.visibility === 'personal_draft') && (
                <p className="field__hint">{t('catalog.scopeNote')}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {confirmDialog()}
    </>
  );
}
