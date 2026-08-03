import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import type { StudentRow } from './StudentTable';
import { formatDate } from '../utils/format';

interface MobileStudentCardListProps {
  rows: StudentRow[];
  canResetPassword: boolean;
  onResetPassword: (studentId: string) => void;
}

export function MobileStudentCardList({ rows, canResetPassword, onResetPassword }: MobileStudentCardListProps) {
  const { t, i18n } = useTranslation();
  return (
    <div className="mobile-student-list">
      {rows.map(({ student, lastSubmissionAt, recentScore, focusAreaLabel }) => (
        <div key={student.id} className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <Link to={`/teacher/students/${student.id}`} style={{ fontWeight: 'var(--weight-medium)' }}>{student.displayName}</Link>
              <div className="field__hint">@{student.username}</div>
            </div>
            <span className={`badge badge--${student.status === 'active' ? 'success' : 'warning'}`}>{t(`accountStatus.${student.status}`)}</span>
          </div>
          <div className="assignment-card__meta">
            <span>{t('teacher.classes.lastSubmission')}: {lastSubmissionAt ? formatDate(lastSubmissionAt, i18n.resolvedLanguage ?? 'tr') : '—'}</span>
            <span>{t('teacher.classes.recentScore')}: {recentScore !== undefined ? `${recentScore}/100` : '—'}</span>
          </div>
          {focusAreaLabel && <p className="field__hint">{t('teacher.classes.focusArea')}: {focusAreaLabel}</p>}
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Link to={`/teacher/students/${student.id}/portfolio`} className="btn btn--secondary btn--sm">{t('common.seeDetails')}</Link>
            {canResetPassword && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onResetPassword(student.id)}>
                <KeyRound size={14} aria-hidden="true" /> {t('teacher.classes.resetPassword')}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
