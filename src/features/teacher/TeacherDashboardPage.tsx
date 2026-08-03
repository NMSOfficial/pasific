import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { PlusCircle, ClipboardCheck, Users, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import { useMockState } from '../../mock/useMockStore';
import { getAssignmentsForTeacher, getClass, getStudent } from '../../mock/selectors';
import { findErrorCategory } from '../../mock/errorCategories';
import type { TeacherProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { WritingTypeBadge } from '../../components/WritingTypeBadge';
import { CefrLevelBadge } from '../../components/CefrLevelBadge';
import { EmptyState } from '../../components/EmptyState';
import { formatDate } from '../../utils/format';

export function TeacherDashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const state = useMockState();
  const teacher = user as TeacherProfile;

  const classes = teacher.classIds.map((id) => getClass(state, id)).filter(Boolean);
  const assignments = getAssignmentsForTeacher(state, teacher);
  const classStudentIds = new Set(classes.flatMap((c) => c!.studentIds));

  const teacherSubmissions = state.submissions.filter((s) => classStudentIds.has(s.studentId) && !s.isPractice);
  const awaitingReview = teacherSubmissions.filter((s) => s.status === 'teacher_review_pending');
  const recent = [...teacherSubmissions]
    .filter((s) => s.submittedAt)
    .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))
    .slice(0, 5);

  const errorCounts = new Map<string, number>();
  for (const s of teacherSubmissions) {
    for (const a of s.annotations) errorCounts.set(a.categoryId, (errorCounts.get(a.categoryId) ?? 0) + 1);
  }
  const topError = [...errorCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const needsSupport = teacherSubmissions
    .filter((s) => s.finalScore !== undefined && s.finalScore < 65)
    .map((s) => getStudent(state, s.studentId))
    .filter(Boolean)
    .filter((s, i, arr) => arr.findIndex((x) => x!.id === s!.id) === i)
    .slice(0, 5);

  const recentAssignments = [...assignments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);

  return (
    <>
      <PageHeader
        title={t('nav.teacher.dashboard')}
        actions={<Link to="/teacher/assignments/new" className="btn btn--primary"><PlusCircle size={16} aria-hidden="true" /> {t('teacher.dashboard.newAssignment')}</Link>}
      />

      <div className="stat-row" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="stat-tile"><span className="stat-tile__value">{classes.length}</span><span className="stat-tile__label">{t('teacher.dashboard.activeClasses')}</span></div>
        <div className="stat-tile"><span className="stat-tile__value">{awaitingReview.length}</span><span className="stat-tile__label">{t('teacher.dashboard.awaitingReview')}</span></div>
        <div className="stat-tile"><span className="stat-tile__value">{assignments.filter((a) => a.status === 'published').length}</span><span className="stat-tile__label">{t('assignmentStatus.published')}</span></div>
        <div className="stat-tile"><span className="stat-tile__value" style={{ fontSize: 'var(--text-md)' }}>{topError ? t(findErrorCategory(topError[0])?.nameKey ?? '') : '—'}</span><span className="stat-tile__label">{t('teacher.dashboard.frequentErrors')}</span></div>
      </div>

      <section className="section-block">
        <div className="section-block__title"><h2>{t('teacher.dashboard.awaitingReview')}</h2></div>
        {awaitingReview.length === 0 ? (
          <EmptyState icon={<ClipboardCheck size={32} aria-hidden="true" />} title={t('states.empty.generic')} />
        ) : (
          <div className="card-grid">
            {awaitingReview.map((sub) => {
              const student = getStudent(state, sub.studentId);
              return (
                <div key={sub.id} className="card card--padded assignment-card">
                  <div className="assignment-card__badges">
                    <WritingTypeBadge writingTypeId={sub.writingTypeId} />
                    <CefrLevelBadge level={sub.level} />
                  </div>
                  <p className="assignment-card__title">{sub.topicTitle}</p>
                  <p className="field__hint">{student?.displayName} · {formatDate(sub.submittedAt, i18n.resolvedLanguage ?? 'tr')}</p>
                  <Link to={`/teacher/submissions/${sub.id}`} className="btn btn--primary btn--sm" style={{ alignSelf: 'flex-start' }}>{t('common.seeDetails')}</Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="section-block">
        <div className="section-block__title"><h2>{t('teacher.dashboard.recentSubmissions')}</h2></div>
        {recent.length === 0 ? (
          <EmptyState title={t('states.empty.generic')} />
        ) : (
          <div className="card-grid">
            {recent.map((sub) => {
              const student = getStudent(state, sub.studentId);
              return (
                <Link key={sub.id} to={`/teacher/submissions/${sub.id}`} className="card card--padded card--interactive assignment-card">
                  <div className="assignment-card__badges">
                    <WritingTypeBadge writingTypeId={sub.writingTypeId} />
                    <CefrLevelBadge level={sub.level} />
                  </div>
                  <p className="assignment-card__title">{sub.topicTitle}</p>
                  <p className="field__hint">{student?.displayName} · {formatDate(sub.submittedAt, i18n.resolvedLanguage ?? 'tr')}</p>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="section-block">
        <div className="section-block__title"><h2>{t('teacher.dashboard.needsSupport')}</h2></div>
        {needsSupport.length === 0 ? (
          <EmptyState icon={<Users size={32} aria-hidden="true" />} title={t('states.empty.generic')} />
        ) : (
          <div className="card-grid">
            {needsSupport.map((s) => (
              <Link key={s!.id} to={`/teacher/students/${s!.id}`} className="card card--padded card--interactive" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <AlertTriangle size={18} color="var(--color-warning)" aria-hidden="true" />
                <span style={{ fontWeight: 'var(--weight-medium)' }}>{s!.displayName}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="section-block">
        <div className="section-block__title">
          <h2>{t('teacher.dashboard.recentAssignments')}</h2>
          <Link to="/teacher/assignments" className="btn btn--ghost btn--sm">{t('common.viewAll')}</Link>
        </div>
        {recentAssignments.length === 0 ? (
          <EmptyState title={t('teacher.assignments.noAssignments')} />
        ) : (
          <div className="card-grid">
            {recentAssignments.map((a) => (
              <div key={a.id} className="card card--padded assignment-card">
                <div className="assignment-card__header">
                  <div className="assignment-card__badges">
                    <WritingTypeBadge writingTypeId={a.writingTypeId} />
                    <CefrLevelBadge level={a.level} />
                  </div>
                  <span className={`badge badge--${a.status === 'published' ? 'success' : a.status === 'draft' ? 'neutral' : 'warning'}`}>{t(`assignmentStatus.${a.status}`)}</span>
                </div>
                <Link to={`/teacher/assignments/${a.id}`} className="assignment-card__title">{a.title}</Link>
                <Link to={`/teacher/assignments/${a.id}/results`} className="btn btn--secondary btn--sm" style={{ alignSelf: 'flex-start' }}>{t('teacher.assignments.resultsTitle')}</Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
