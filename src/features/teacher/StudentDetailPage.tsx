import { useTranslation } from 'react-i18next';
import { Link, Navigate, useParams } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAuth } from '../../state/AuthContext';
import { useMockState, mockStore } from '../../mock/useMockStore';
import { computePortfolioMetrics, getClass, getSchool } from '../../mock/selectors';
import { findErrorCategory } from '../../mock/errorCategories';
import type { TeacherProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { FeedbackTabs } from '../../components/FeedbackTabs';
import { WritingTypeBadge } from '../../components/WritingTypeBadge';
import { CefrLevelBadge } from '../../components/CefrLevelBadge';
import { SubmissionStatusBadge } from '../../components/StatusBadge';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { useHasPermission } from '../../components/PermissionGuard';
import { PdfExportButton } from '../../components/PdfExportButton';
import { formatDate } from '../../utils/format';
import { exportPortfolioPdf } from '../../utils/pdf';
import { useState } from 'react';
import { KeyRound } from 'lucide-react';

export function StudentDetailPage({ portfolioTab = false }: { portfolioTab?: boolean } = {}) {
  const { t, i18n } = useTranslation();
  const { studentId } = useParams();
  const { user } = useAuth();
  const state = useMockState();
  const teacher = user as TeacherProfile;
  const canResetPasswords = useHasPermission('reset_student_passwords');
  const [confirmReset, setConfirmReset] = useState(false);

  const student = studentId ? state.students.find((s) => s.id === studentId) : undefined;
  if (!student) return <Navigate to="/teacher/classes" replace />;

  const school = getSchool(state, student.schoolId);
  const classes = student.classIds.map((id) => getClass(state, id)).filter(Boolean);
  const submissions = state.submissions
    .filter((s) => s.studentId === student.id)
    .sort((a, b) => (b.submittedAt ?? b.lastSavedAt ?? '').localeCompare(a.submittedAt ?? a.lastSavedAt ?? ''));
  const portfolio = computePortfolioMetrics(state, student.id);
  const scoreTrendData = portfolio.scoreTrend.map((p, i) => ({ name: `#${i + 1}`, score: p.score }));

  const overviewTab = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {submissions.length === 0 ? (
        <EmptyState title={t('states.empty.generic')} />
      ) : (
        submissions.map((sub) => (
          <div key={sub.id} className="card card--padded assignment-card">
            <div className="assignment-card__header">
              <div className="assignment-card__badges">
                <WritingTypeBadge writingTypeId={sub.writingTypeId} />
                <CefrLevelBadge level={sub.level} />
              </div>
              <SubmissionStatusBadge status={sub.status} />
            </div>
            <p className="assignment-card__title">{sub.topicTitle}</p>
            <p className="field__hint">{formatDate(sub.submittedAt ?? sub.lastSavedAt, i18n.resolvedLanguage ?? 'tr')} {sub.finalScore !== undefined && `· ${sub.finalScore}/100`}</p>
            <Link to={`/teacher/submissions/${sub.id}`} className="btn btn--secondary btn--sm" style={{ alignSelf: 'flex-start' }}>{t('common.seeDetails')}</Link>
          </div>
        ))
      )}
    </div>
  );

  const portfolioTabContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div className="stat-row">
        <div className="stat-tile"><span className="stat-tile__value">{portfolio.totalCompleted}</span><span className="stat-tile__label">{t('student.portfolio.totalCompleted')}</span></div>
        <div className="stat-tile"><span className="stat-tile__value">{portfolio.writingTypesPractised.length}</span><span className="stat-tile__label">{t('student.portfolio.typesPractised')}</span></div>
        <div className="stat-tile"><span className="stat-tile__value" style={{ fontSize: 'var(--text-md)' }}>{portfolio.topErrorCategories[0] ? t(findErrorCategory(portfolio.topErrorCategories[0].categoryId)?.nameKey ?? '') : '—'}</span><span className="stat-tile__label">{t('student.portfolio.topErrors')}</span></div>
      </div>
      {scoreTrendData.length > 1 && (
        <div className="card card--padded" role="img" aria-label={`${t('portfolio.scoreTrendChart')}: ${scoreTrendData.map((d) => d.score).join(', ')}`}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={scoreTrendData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-faint)' }} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--color-text-faint)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  return (
    <>
      <PageHeader
        title={student.displayName}
        subtitle={`@${student.username} · ${school?.name} · ${classes.map((c) => c!.name).join(', ')}`}
        actions={
          <>
            <PdfExportButton
              onExport={() => exportPortfolioPdf({
                studentName: student.displayName,
                schoolName: school?.name,
                locale: i18n.resolvedLanguage ?? 'tr',
                totalCompleted: portfolio.totalCompleted,
                writingTypeCount: portfolio.writingTypesPractised.length,
                scoreTrend: scoreTrendData.map((d) => ({ label: d.name, score: d.score })),
                topErrorCategories: portfolio.topErrorCategories.map((e) => ({ label: t(findErrorCategory(e.categoryId)?.nameKey ?? e.categoryId), count: e.count })),
              })}
            />
            {canResetPasswords && (
              <button type="button" className="btn btn--secondary" onClick={() => setConfirmReset(true)}>
                <KeyRound size={15} aria-hidden="true" /> {t('teacher.classes.resetPassword')}
              </button>
            )}
          </>
        }
      />

      <FeedbackTabs
        defaultKey={portfolioTab ? 'portfolio' : 'overview'}
        tabs={[
          { key: 'overview', label: t('nav.teacher.assignments'), content: overviewTab },
          { key: 'portfolio', label: t('nav.student.portfolio'), content: portfolioTabContent },
        ]}
      />

      <ConfirmationDialog
        open={confirmReset}
        title={t('teacher.classes.resetPasswordConfirmTitle')}
        description={t('teacher.classes.resetPasswordConfirmDescription')}
        onConfirm={() => { mockStore.resetStudentPassword(student.id, teacher.id, teacher.displayName); setConfirmReset(false); }}
        onCancel={() => setConfirmReset(false)}
      />
    </>
  );
}
