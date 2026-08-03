import { useState, type ReactNode } from 'react';

interface Tab {
  key: string;
  label: string;
  content: ReactNode;
}

export function FeedbackTabs({ tabs, defaultKey }: { tabs: Tab[]; defaultKey?: string }) {
  const [active, setActive] = useState(defaultKey ?? tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      <div role="tablist" className="segmented-control" style={{ marginBottom: 'var(--space-5)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            id={`tab-${tab.key}`}
            aria-controls={`tabpanel-${tab.key}`}
            className={`segmented-control__option ${active === tab.key ? 'is-active' : ''}`}
            onClick={() => setActive(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`tabpanel-${activeTab?.key}`} aria-labelledby={`tab-${activeTab?.key}`}>
        {activeTab?.content}
      </div>
    </div>
  );
}
