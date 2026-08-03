import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import { useMockState } from '../../mock/useMockStore';
import { getAssignmentsForTeacher, getClass } from '../../mock/selectors';
import type { TeacherProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { WritingTypeBadge } from '../../components/WritingTypeBadge';
import { CefrLevelBadge } from '../../components/CefrLevelBadge';
import { EmptyState } from '../../components/EmptyState';
import { formatDate } from '../../utils/format';

export function TeacherAssignmentListPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const state = useMockState();
  const teacher = user as TeacherProfile;

  const assignments = getAssignmentsForTeacher(state, teacher).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <PageHeader
        title={t('nav.teacher.assignments')}
        actions={<Link to="/teacher/assignments/new" className="btn btn--primary"><PlusCircle size={16} aria-hidden="true" /> {t('teacher.assignments.createNew')}</Link>}
      />

      {assignments.length === 0 ? (
        <EmptyState title={t('teacher.assignments.noAssignments')} />
      ) : (
        <div className="card-grid">
          {assignments.map((a) => (
            <div key={a.id} className="card card--padded assignment-card">
              <div className="assignment-card__header">
                <div className="assignment-card__badges">
                  <WritingTypeBadge writingTypeId={a.writingTypeId} />
                  <CefrLevelBadge level={a.level} />
                </div>
                <span className={`badge badge--${a.status === 'published' ? 'success' : a.status === 'draft' ? 'neutral' : 'warning'}`}>{t(`assignmentStatus.${a.status}`)}</span>
              </div>
              <Link to={`/teacher/assignments/${a.id}`} className="assignment-card__title">{a.title}</Link>
              <p className="field__hint">{a.classIds.map((cid) => getClass(state, cid)?.name).join(', ')} · {formatDate(a.dueAt, i18n.resolvedLanguage ?? 'tr')}</p>
              <Link to={`/teacher/assignments/${a.id}/results`} className="btn btn--secondary btn--sm" style={{ alignSelf: 'flex-start' }}>{t('teacher.assignments.resultsTitle')}</Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
