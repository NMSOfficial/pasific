import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useMockState } from '../../mock/useMockStore';
import { getAssignment, getClass } from '../../mock/selectors';
import { PageHeader } from '../../components/PageHeader';
import { CefrLevelBadge } from '../../components/CefrLevelBadge';
import { WritingTypeBadge } from '../../components/WritingTypeBadge';
import { CustomRubricBadge } from '../../components/StatusBadge';
import { formatDateTime } from '../../utils/format';

export function TeacherAssignmentDetailPage() {
  const { t, i18n } = useTranslation();
  const { assignmentId } = useParams();
  const state = useMockState();

  const assignment = assignmentId ? getAssignment(state, assignmentId) : undefined;
  if (!assignment) return <Navigate to="/teacher/assignments" replace />;

  return (
    <>
      <PageHeader
        title={assignment.title}
        actions={<Link to={`/teacher/assignments/${assignment.id}/results`} className="btn btn--primary">{t('teacher.assignments.resultsTitle')}</Link>}
      />

      <div className="card card--padded" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <WritingTypeBadge writingTypeId={assignment.writingTypeId} />
          <CefrLevelBadge level={assignment.level} />
          <span className={`badge badge--${assignment.status === 'published' ? 'success' : assignment.status === 'draft' ? 'neutral' : 'warning'}`}>{t(`assignmentStatus.${assignment.status}`)}</span>
          <CustomRubricBadge rubric={assignment.rubric} />
        </div>

        <p style={{ lineHeight: 'var(--leading-relaxed)' }}>{assignment.prompt}</p>

        {assignment.instructions && <p style={{ color: 'var(--color-text-muted)' }}>{assignment.instructions}</p>}

        <div className="assignment-card__meta" style={{ fontSize: 'var(--text-sm)' }}>
          <span>{assignment.classIds.map((cid) => getClass(state, cid)?.name).join(', ')}</span>
          <span>{t('student.assignment.due')}: {formatDateTime(assignment.dueAt, i18n.resolvedLanguage ?? 'tr')}</span>
          <span>{assignment.minWords}–{assignment.maxWords} {t('common.words')}</span>
          <span>{t('aiSupportMode.' + assignment.aiSupportMode)}</span>
          <span>{assignment.showAiScoreImmediately ? t('rubric.aiSuggestedScore') : t('submissionStatus.teacher_review_pending')}</span>
        </div>

        <div>
          <p className="field__label" style={{ marginBottom: 'var(--space-2)' }}>{t('student.assignment.rubricPreview')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {assignment.rubric.criteria.filter((c) => c.enabled).map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--color-border)' }}>
                <span>{t(c.nameKey)}</span>
                <span style={{ color: 'var(--color-text-muted)' }}>{c.weight}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
