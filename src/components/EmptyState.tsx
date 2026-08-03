import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="state-panel" role="status">
      <div className="state-panel__icon">{icon ?? <Inbox size={36} strokeWidth={1.5} aria-hidden="true" />}</div>
      <p className="state-panel__title">{title}</p>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
