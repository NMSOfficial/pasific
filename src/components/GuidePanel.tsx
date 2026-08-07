import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import type { WritingTypeGuide } from '../services/guideData';

export function GuidePanel({ guide }: { guide: WritingTypeGuide | null }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!guide) return null;

  return (
    <div className="card guide-panel" style={{ overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'transparent', border: 'none', textAlign: 'left' }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <BookOpen size={16} aria-hidden="true" />
          <span style={{ fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)' }}>{guide.title}</span>
        </span>
        {open ? <ChevronUp size={17} aria-hidden="true" /> : <ChevronDown size={17} aria-hidden="true" />}
      </button>
      {!open && (
        <p className="guide-panel__summary">{guide.summary}</p>
      )}
      {open && (
        <div style={{ padding: '0 var(--space-3) var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="guide-panel__content-scroll">
            {guide.content.split('\n\n').map((para, i) => (
              <p key={i} style={{ lineHeight: 'var(--leading-relaxed)', fontSize: 'var(--text-sm)', margin: 0 }}>{para}</p>
            ))}
          </div>
          {guide.keyPhrases.length > 0 && (
            <div>
              <p className="field__label" style={{ marginBottom: 'var(--space-2)' }}>{t('guide.keyPhrases')}</p>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: 0, paddingLeft: '1.1rem' }}>
                {guide.keyPhrases.slice(0, 4).map((phrase, i) => (
                  <li key={i} style={{ fontSize: 'var(--text-sm)', fontStyle: 'italic' }}>{phrase}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
