import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';
import { useAuth } from '../../state/AuthContext';
import { computePortfolioMetrics } from '../../utils/portfolio';
import { findErrorCategory } from '../../mock/errorCategories';
import { WRITING_TYPES } from '../../mock/writingTypes';
import type { StudentProfile, Submission } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { WritingTypeBadge } from '../../components/WritingTypeBadge';
import { CefrLevelBadge } from '../../components/CefrLevelBadge';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { PdfExportButton } from '../../components/PdfExportButton';
import { formatDate } from '../../utils/format';
import { exportPortfolioPdf } from '../../utils/pdf';
import { fetchSubmissionsForStudents } from '../../services/submissionData';

export function StudentPortfolioPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const student = user as StudentProfile;
  const [source, setSource] = useState<'all' | 'assignment' | 'practice'>('all');
  const [submissions, setSubmissions] = useState<Submission[] | null>(null);

  useEffect(() => { fetchSubmissionsForStudents([student.id]).then(setSubmissions); }, [student.id]);

  if (!submissions) return <LoadingSkeleton height="12rem" />;

  const portfolio = computePortfolioMetrics(student.id, submissions);

  const history = submissions
    .filter((s) => s.status === 'result_ready')
    .filter((s) => source === 'all' || (source === 'practice' ? s.isPractice : !s.isPractice))
    .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''));

  const scoreTrendData = portfolio.scoreTrend.map((p, i) => ({ name: `#${i + 1}`, score: p.score }));
  const errorData = portfolio.topErrorCategories.map((e) => ({
    name: t(findErrorCategory(e.categoryId)?.nameKey ?? e.categoryId),
    count: e.count,
  }));
  const typeData = portfolio.writingTypesPractised.map((wt) => ({
    name: t(WRITING_TYPES.find((w) => w.id === wt)?.labelKey ?? wt).split(' (')[0],
    count: history.filter((s) => s.writingTypeId === wt).length,
  }));

  return (
    <>
      <PageHeader
        title={t('nav.student.portfolio')}
        actions={
          <PdfExportButton
            onExport={() => exportPortfolioPdf({
              studentName: student.displayName,
              locale: i18n.resolvedLanguage ?? 'tr',
              totalCompleted: portfolio.totalCompleted,
              writingTypeCount: portfolio.writingTypesPractised.length,
              scoreTrend: scoreTrendData.map((d) => ({ label: d.name, score: d.score })),
              topErrorCategories: errorData.map((d) => ({ label: d.name, count: d.count })),
            })}
          />
        }
      />

      <div className="stat-row" style={{ marginBottom: 'var(--space-8)' }}>
        <div className="stat-tile"><span className="stat-tile__value">{portfolio.totalCompleted}</span><span className="stat-tile__label">{t('student.portfolio.totalCompleted')}</span></div>
        <div className="stat-tile"><span className="stat-tile__value">{portfolio.writingTypesPractised.length}</span><span className="stat-tile__label">{t('student.portfolio.typesPractised')}</span></div>
        <div className="stat-tile"><span className="stat-tile__value">{scoreTrendData.length ? scoreTrendData[scoreTrendData.length - 1].score : '—'}</span><span className="stat-tile__label">{t('common.score')}</span></div>
      </div>

      {scoreTrendData.length > 1 && (
        <section className="section-block">
          <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>{t('portfolio.scoreTrendChart')}</h2>
          <div className="card card--padded" role="img" aria-label={`${t('portfolio.scoreTrendChart')}: ${scoreTrendData.map((d) => d.score).join(', ')}`}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={scoreTrendData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-faint)' }} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--color-text-faint)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {errorData.length > 0 && (
        <section className="section-block">
          <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>{t('portfolio.errorFrequencyChart')}</h2>
          <div className="card card--padded" role="img" aria-label={`${t('portfolio.errorFrequencyChart')}: ${errorData.map((d) => `${d.name} (${d.count})`).join(', ')}`}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={errorData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--color-text-faint)' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11, fill: 'var(--color-text)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="var(--color-secondary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {typeData.length > 0 && (
        <section className="section-block">
          <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)' }}>{t('portfolio.writingTypeChart')}</h2>
          <div className="card card--padded" role="img" aria-label={`${t('portfolio.writingTypeChart')}: ${typeData.map((d) => `${d.name} (${d.count})`).join(', ')}`}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={typeData} margin={{ top: 8, right: 16, left: 8, bottom: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-faint)' }} axisLine={{ stroke: 'var(--color-border)' }} tickLine={false} interval={0} angle={-15} textAnchor="end" height={55} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--color-text-faint)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="section-block">
        <div className="section-block__title">
          <h2>{t('portfolio.history')}</h2>
          <select className="select-control" style={{ width: 'auto' }} value={source} onChange={(e) => setSource(e.target.value as typeof source)} aria-label={t('portfolio.filterSource')}>
            <option value="all">{t('common.all')}</option>
            <option value="assignment">{t('portfolio.assignmentSource')}</option>
            <option value="practice">{t('portfolio.practiceSource')}</option>
          </select>
        </div>

        {history.length === 0 ? (
          <EmptyState title={t('student.portfolio.noData')} />
        ) : (
          <div className="card-grid">
            {history.map((sub) => (
              <div key={sub.id} className="card card--padded assignment-card">
                <div className="assignment-card__header">
                  <div className="assignment-card__badges">
                    <WritingTypeBadge writingTypeId={sub.writingTypeId} />
                    <CefrLevelBadge level={sub.level} />
                  </div>
                  {sub.usesCustomRubric && <span className="badge badge--warning">{t('rubric.customRubric')}</span>}
                </div>
                <p className="assignment-card__title">{sub.topicTitle}</p>
                <p className="field__hint">{formatDate(sub.submittedAt, i18n.resolvedLanguage ?? 'tr')} · {sub.isPractice ? t('portfolio.practiceSource') : t('portfolio.assignmentSource')}</p>
                <p style={{ fontWeight: 'var(--weight-semibold)' }}>{sub.finalScore}/100</p>
                <Link to={`/student/portfolio/${sub.id}`} className="btn btn--secondary btn--sm" style={{ alignSelf: 'flex-start' }}>{t('common.seeDetails')}</Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
