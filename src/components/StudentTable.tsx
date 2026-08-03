import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import type { StudentProfile } from '../types/entities';
import { formatDate } from '../utils/format';

export interface StudentRow {
  student: StudentProfile;
  lastSubmissionAt?: string;
  recentScore?: number;
  focusAreaLabel?: string;
}

interface StudentTableProps {
  rows: StudentRow[];
  canResetPassword: boolean;
  onResetPassword: (studentId: string) => void;
}

export function StudentTable({ rows, canResetPassword, onResetPassword }: StudentTableProps) {
  const { t, i18n } = useTranslation();
  return (
    <div className="data-table-wrap desktop-only-block">
      <table className="data-table">
        <thead>
          <tr>
            <th>{t('common.student')}</th>
            <th>{t('accountStatus.active')}</th>
            <th>{t('teacher.classes.lastSubmission')}</th>
            <th>{t('teacher.classes.recentScore')}</th>
            <th>{t('teacher.classes.focusArea')}</th>
            <th>{t('common.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ student, lastSubmissionAt, recentScore, focusAreaLabel }) => (
            <tr key={student.id}>
              <td>
                <Link to={`/teacher/students/${student.id}`} style={{ fontWeight: 'var(--weight-medium)' }}>{student.displayName}</Link>
                <div className="field__hint">@{student.username}</div>
              </td>
              <td><span className={`badge badge--${student.status === 'active' ? 'success' : 'warning'}`}>{t(`accountStatus.${student.status}`)}</span></td>
              <td>{lastSubmissionAt ? formatDate(lastSubmissionAt, i18n.resolvedLanguage ?? 'tr') : '—'}</td>
              <td>{recentScore !== undefined ? `${recentScore}/100` : '—'}</td>
              <td>{focusAreaLabel ?? '—'}</td>
              <td>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Link to={`/teacher/students/${student.id}/portfolio`} className="btn btn--ghost btn--sm">{t('common.seeDetails')}</Link>
                  {canResetPassword && (
                    <button type="button" className="icon-btn" title={t('teacher.classes.resetPassword')} onClick={() => onResetPassword(student.id)}>
                      <KeyRound size={15} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
