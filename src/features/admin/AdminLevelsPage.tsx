import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CefrLevel } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';

const LEVELS: CefrLevel[] = ['B1', 'B2', 'C1', 'C2'];

const DEFAULT_DESCRIPTORS: Record<CefrLevel, string> = {
  B1: 'Can write straightforward, connected texts on familiar topics using simple linking words. Vocabulary and grammar cover everyday needs with noticeable but non-disruptive errors.',
  B2: 'Can write clear, detailed texts on a range of subjects, developing an argument with supporting points. Good control of grammar and a fairly wide vocabulary range.',
  C1: 'Can write well-structured, detailed texts on complex subjects, using organisational patterns and cohesive devices effectively. Wide vocabulary used with precision.',
  C2: 'Can write clear, smoothly flowing, complex texts in an appropriate and effective style with a logical structure that helps the reader find significant points.',
};

export function AdminLevelsPage() {
  const { t } = useTranslation();
  const [level, setLevel] = useState<CefrLevel>('B2');
  const [descriptors, setDescriptors] = useState(DEFAULT_DESCRIPTORS);

  return (
    <>
      <PageHeader title={t('nav.admin.levels')} />

      <div className="segmented-control" style={{ marginBottom: 'var(--space-5)' }}>
        {LEVELS.map((l) => (
          <button key={l} type="button" className={`segmented-control__option ${level === l ? 'is-active' : ''}`} onClick={() => setLevel(l)}>{l}</button>
        ))}
      </div>

      <div className="card card--padded" style={{ maxWidth: '36rem', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <label className="field__label" htmlFor="level-descriptor">{t('admin.levels.descriptorsFor', { level })}</label>
        <textarea
          id="level-descriptor"
          className="textarea-control"
          rows={5}
          value={descriptors[level]}
          onChange={(e) => setDescriptors((prev) => ({ ...prev, [level]: e.target.value }))}
        />
        <button type="button" className="btn btn--primary" style={{ alignSelf: 'flex-start' }}>{t('common.save')}</button>
      </div>
    </>
  );
}
