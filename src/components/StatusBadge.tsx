import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Circle, PenLine, Send, Loader2, CheckCircle2, Clock, AlertCircle, type LucideIcon } from 'lucide-react';
import type { AssignmentRubric, SubmissionStatus } from '../types/entities';

export type BadgeTone = 'neutral' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

export function StatusBadge({ tone = 'neutral', icon, children }: { tone?: BadgeTone; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={`badge badge--${tone}`}>
      {icon}
      {children}
    </span>
  );
}

const SUBMISSION_STATUS_META: Record<SubmissionStatus, { tone: BadgeTone; Icon: LucideIcon }> = {
  not_started: { tone: 'neutral', Icon: Circle },
  in_progress: { tone: 'info', Icon: PenLine },
  submitted: { tone: 'info', Icon: Send },
  analyzing: { tone: 'warning', Icon: Loader2 },
  result_ready: { tone: 'success', Icon: CheckCircle2 },
  teacher_review_pending: { tone: 'warning', Icon: Clock },
  grading_failed: { tone: 'error', Icon: AlertCircle },
};

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  const { t } = useTranslation();
  const meta = SUBMISSION_STATUS_META[status];
  return (
    <StatusBadge tone={meta.tone} icon={<meta.Icon size={12} className={status === 'analyzing' ? 'spin' : undefined} aria-hidden="true" />}>
      {t(`submissionStatus.${status}`)}
    </StatusBadge>
  );
}

export function CustomRubricBadge({ rubric }: { rubric: AssignmentRubric }) {
  const { t } = useTranslation();
  if (!rubric.isCustom) return null;
  return <span className="badge badge--warning">{t('rubric.customRubric')}</span>;
}
