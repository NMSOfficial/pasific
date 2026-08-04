import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusCircle } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import { WRITING_TYPES } from '../../mock/writingTypes';
import type { AdminProfile, CatalogTopic, CefrLevel, WritingTypeId } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { CatalogCard } from '../../components/CatalogCard';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { fetchGlobalCatalogTopics, fetchSchoolSuggestedCatalogTopics, createGlobalCatalogTopic, promoteCatalogTopicToGlobal } from '../../services/contentData';

const LEVELS: CefrLevel[] = ['B1', 'B2', 'C1', 'C2'];

export function AdminCatalogPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const admin = user as AdminProfile;
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', prompt: '', writingTypeId: WRITING_TYPES[0].id as WritingTypeId, level: 'B2' as CefrLevel, minWords: 200, maxWords: 260 });
  const [globalTopics, setGlobalTopics] = useState<CatalogTopic[] | null>(null);
  const [schoolSuggestions, setSchoolSuggestions] = useState<CatalogTopic[]>([]);

  const reload = useCallback(() => {
    fetchGlobalCatalogTopics().then(setGlobalTopics);
    fetchSchoolSuggestedCatalogTopics().then(setSchoolSuggestions);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleCreate = async () => {
    if (!form.title.trim() || !form.prompt.trim()) return;
    await createGlobalCatalogTopic({
      title: form.title,
      prompt: form.prompt,
      writingTypeId: form.writingTypeId,
      level: form.level,
      minWords: form.minWords,
      maxWords: form.maxWords,
      createdBy: admin.id,
    });
    setForm({ title: '', prompt: '', writingTypeId: WRITING_TYPES[0].id, level: 'B2', minWords: 200, maxWords: 260 });
    setCreating(false);
    reload();
  };

  const handlePromote = async (topicId: string) => {
    await promoteCatalogTopicToGlobal(topicId);
    reload();
  };

  if (!globalTopics) return <LoadingSkeleton height="12rem" />;

  return (
    <>
      <PageHeader
        title={t('nav.admin.catalog')}
        actions={<button type="button" className="btn btn--primary" onClick={() => setCreating((v) => !v)}><PlusCircle size={16} aria-hidden="true" /> {t('admin.catalog.addGlobalTopic')}</button>}
      />

      {creating && (
        <div className="card card--padded" style={{ marginBottom: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxWidth: '30rem' }}>
          <div className="field"><label className="field__label" htmlFor="gt-title">{t('teacher.assignments.title')}</label><input id="gt-title" className="input-control" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></div>
          <div className="field"><label className="field__label" htmlFor="gt-prompt">{t('teacher.assignments.prompt')}</label><textarea id="gt-prompt" className="textarea-control" value={form.prompt} onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))} /></div>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <div className="field" style={{ flex: 1 }}>
              <label className="field__label" htmlFor="gt-writing-type">{t('teacher.assignments.writingType')}</label>
              <select id="gt-writing-type" className="select-control" value={form.writingTypeId} onChange={(e) => setForm((f) => ({ ...f, writingTypeId: e.target.value as WritingTypeId }))}>
                {WRITING_TYPES.map((wt) => <option key={wt.id} value={wt.id}>{t(wt.labelKey)}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label className="field__label" htmlFor="gt-level">{t('teacher.assignments.level')}</label>
              <select id="gt-level" className="select-control" value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value as CefrLevel }))}>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <button type="button" className="btn btn--primary" style={{ alignSelf: 'flex-start' }} onClick={handleCreate}>{t('common.save')}</button>
        </div>
      )}

      <section className="section-block">
        <div className="section-block__title"><h2>{t('nav.admin.catalog')}</h2></div>
        <div className="card-grid">
          {globalTopics.map((topic) => <CatalogCard key={topic.id} topic={topic} to="#" />)}
        </div>
      </section>

      <section className="section-block">
        <div className="section-block__title"><h2>{t('admin.catalog.promoteFromSchool')}</h2></div>
        {schoolSuggestions.length === 0 ? (
          <EmptyState title={t('states.empty.generic')} />
        ) : (
          <div className="card-grid">
            {schoolSuggestions.map((topic) => (
              <div key={topic.id} className="card card--padded catalog-card">
                <p className="catalog-card__title">{topic.title}</p>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{topic.prompt}</p>
                <button type="button" className="btn btn--secondary btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => handlePromote(topic.id)}>
                  {t('admin.catalog.promote')}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
