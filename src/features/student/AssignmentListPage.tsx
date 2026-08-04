import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../state/AuthContext';
import type { Assignment, StudentProfile, SubmissionStatus } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { AssignmentCard } from '../../components/AssignmentCard';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { fetchAssignmentsForClasses } from '../../services/assignmentData';
import { fetchUserDisplayName } from '../../services/teacherData';
import { fetchSubmissionForAssignment } from '../../services/submissionData';

const STATUS_FILTERS: (SubmissionStatus | 'all')[] = ['all', 'not_started', 'in_progress', 'submitted', 'analyzing', 'result_ready', 'teacher_review_pending'];

interface Row {
  assignment: Assignment;
  status: SubmissionStatus;
  submissionId?: string;
  teacherName?: string;
}

export function AssignmentListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const student = user as StudentProfile;
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | 'all'>('all');
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    fetchAssignmentsForClasses(student.classIds).then(async (list) => {
      const assignments = list.filter((a) => a.status !== 'draft').sort((a, b) => a.dueAt.localeCompare(b.dueAt));
      const result = await Promise.all(assignments.map(async (a) => {
        const [sub, teacherName] = await Promise.all([fetchSubmissionForAssignment(a.id, student.id), fetchUserDisplayName(a.createdBy)]);
        return { assignment: a, status: sub?.status ?? ('not_started' as SubmissionStatus), submissionId: sub?.id, teacherName };
      }));
      setRows(result);
    });
  }, [student.id, student.classIds]);

  if (!rows) return <LoadingSkeleton height="12rem" />;

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
          {filtered.map(({ assignment, status, submissionId, teacherName }) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              status={status}
              teacherName={teacherName}
              submissionId={submissionId}
            />
          ))}
        </div>
      )}
    </>
  );
}
