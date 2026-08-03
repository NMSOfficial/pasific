import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/AuthContext';
import { useMockState } from '../../mock/useMockStore';
import { getAssignmentsForClass, getSubmissionForAssignment, getTeacher } from '../../mock/selectors';
import type { StudentProfile, SubmissionStatus } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { AssignmentCard } from '../../components/AssignmentCard';
import { EmptyState } from '../../components/EmptyState';

const STATUS_FILTERS: (SubmissionStatus | 'all')[] = ['all', 'not_started', 'in_progress', 'submitted', 'analyzing', 'result_ready', 'teacher_review_pending'];

export function AssignmentListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const state = useMockState();
  const student = user as StudentProfile;
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | 'all'>('all');

  const rows = useMemo(() => {
    const assignments = [...new Set(student.classIds.flatMap((cid) => getAssignmentsForClass(state, cid)))]
      .filter((a) => a.status !== 'draft')
      .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    return assignments.map((a) => {
      const sub = getSubmissionForAssignment(state, a.id, student.id);
      return { assignment: a, status: sub?.status ?? ('not_started' as SubmissionStatus), submissionId: sub?.id, teacher: getTeacher(state, a.createdBy) };
    });
  }, [state, student]);

  const filtered = statusFilter === 'all' ? rows : rows.filter((r) => r.status === statusFilter);

  return (
    <>
      <PageHeader title={t('nav.student.assignments')} />

      <div className="segmented-control" style={{ marginBottom: 'var(--space-5)' }} role="group" aria-label={t('common.filter')}>
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            type="button"
            className={`segmented-control__option ${statusFilter === s ? 'is-active' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s === 'all' ? t('common.all') : t(`submissionStatus.${s}`)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={t('student.home.noAssignedTasks')} description={t('student.home.noAssignedTasksDescription')} />
      ) : (
        <div className="card-grid">
          {filtered.map(({ assignment, status, submissionId, teacher }) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              status={status}
              teacherName={teacher?.displayName}
              submissionId={submissionId}
            />
          ))}
        </div>
      )}
    </>
  );
}
