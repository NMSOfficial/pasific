import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../state/AuthContext';
import { useMockState, mockStore } from '../../mock/useMockStore';
import { getAssignmentsForClass, getSchool } from '../../mock/selectors';
import { findErrorCategory } from '../../mock/errorCategories';
import type { TeacherProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { StudentTable, type StudentRow } from '../../components/StudentTable';
import { MobileStudentCardList } from '../../components/MobileStudentCard';
import { CriterionScoreBar } from '../../components/CriterionScoreBar';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { useHasPermission } from '../../components/PermissionGuard';
import { PdfExportButton } from '../../components/PdfExportButton';
import { exportClassProgressPdf } from '../../utils/pdf';
import { Search } from 'lucide-react';

export function ClassDetailPage() {
  const { t, i18n } = useTranslation();
  const { classId } = useParams();
  const { user } = useAuth();
  const state = useMockState();
  const teacher = user as TeacherProfile;
  const canResetPasswords = useHasPermission('reset_student_passwords');

  const [query, setQuery] = useState('');
  const [resetTarget, setResetTarget] = useState<string | null>(null);

  const cls = classId ? state.classes.find((c) => c.id === classId) : undefined;
  const school = cls ? getSchool(state, cls.schoolId) : undefined;
  const assignments = cls ? getAssignmentsForClass(state, cls.id) : [];
  const students = cls ? cls.studentIds.map((id) => state.students.find((s) => s.id === id)).filter(Boolean) : [];
  const classSubmissions = cls ? state.submissions.filter((s) => cls.studentIds.includes(s.studentId) && !s.isPractice && s.status === 'result_ready') : [];

  const rows: StudentRow[] = students
    .filter((s) => !query.trim() || s!.displayName.toLowerCase().includes(query.toLowerCase()) || s!.username.includes(query.toLowerCase()))
    .map((s) => {
      const subs = classSubmissions.filter((sub) => sub.studentId === s!.id).sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''));
      const latest = subs[0];
      const weakest = latest ? [...latest.criterionScores].sort((a, b) => (a.teacherScore ?? a.aiScore) - (b.teacherScore ?? b.aiScore))[0] : undefined;
      return {
        student: s!,
        lastSubmissionAt: latest?.submittedAt,
        recentScore: latest?.finalScore,
        focusAreaLabel: weakest ? t(`rubric.criterion.${weakest.criterionKey}.name`) : undefined,
      };
    });

  const criterionSums = new Map<string, { sum: number; count: number; maxScore: number; weight: number }>();
  for (const sub of classSubmissions) {
    if (sub.usesCustomRubric) continue;
    for (const c of sub.criterionScores) {
      const entry = criterionSums.get(c.criterionKey) ?? { sum: 0, count: 0, maxScore: c.maxScore, weight: c.weight };
      entry.sum += c.teacherScore ?? c.aiScore;
      entry.count += 1;
      criterionSums.set(c.criterionKey, entry);
    }
  }
  const criterionAverages = [...criterionSums.entries()].map(([key, v]) => ({
    criterionId: key,
    criterionKey: key,
    aiScore: Math.round(v.sum / v.count),
    maxScore: v.maxScore,
    weight: v.weight,
    explanation: '',
    strongAspects: [],
    developmentAreas: [],
  }));

  const errorCounts = new Map<string, number>();
  for (const sub of classSubmissions) {
    for (const a of sub.annotations) errorCounts.set(a.categoryId, (errorCounts.get(a.categoryId) ?? 0) + 1);
  }
  const topErrors = [...errorCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const handleResetPassword = () => {
    if (resetTarget) mockStore.resetStudentPassword(resetTarget, teacher.id, teacher.displayName);
    setResetTarget(null);
  };

  if (!cls) return <Navigate to="/teacher/classes" replace />;

  return (
    <>
      <PageHeader
        title={cls.name}
        subtitle={`${school?.name} · ${cls.gradeLabel} · ${assignments.length} ${t('nav.teacher.assignments').toLowerCase()}`}
        actions={
          <PdfExportButton
            label={t('teacher.reports.classReport')}
            onExport={() => exportClassProgressPdf({
              className: cls.name,
              schoolName: school?.name,
              locale: i18n.resolvedLanguage ?? 'tr',
              criterionAverages: criterionAverages.map((c) => ({ label: t(`rubric.criterion.${c.criterionKey}.name`), score: c.aiScore, maxScore: c.maxScore })),
              commonErrors: topErrors.map(([id, count]) => ({ label: t(findErrorCategory(id)?.nameKey ?? id), count })),
              students: rows.map((r) => ({ name: r.student.displayName, recentScore: r.recentScore })),
            })}
          />
        }
      />

      {criterionAverages.length > 0 && (
        <section className="card card--padded" style={{ marginBottom: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p className="field__label">{t('teacher.classes.criterionAverages')}</p>
          {criterionAverages.map((c) => <CriterionScoreBar key={c.criterionKey} criterion={c} />)}
        </section>
      )}

      {topErrors.length > 0 && (
        <section className="card card--padded" style={{ marginBottom: 'var(--space-6)' }}>
          <p className="field__label" style={{ marginBottom: 'var(--space-3)' }}>{t('teacher.classes.commonErrors')}</p>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {topErrors.map(([id, count]) => (
              <span key={id} className="badge badge--neutral">{t(findErrorCategory(id)?.nameKey ?? id)} · {count}</span>
            ))}
          </div>
        </section>
      )}

      <div className="input-with-action" style={{ maxWidth: '18rem', marginBottom: 'var(--space-4)' }}>
        <input className="input-control" placeholder={t('teacher.classes.searchStudents')} value={query} onChange={(e) => setQuery(e.target.value)} style={{ paddingRight: '2.5rem' }} />
        <span className="input-with-action__action" style={{ pointerEvents: 'none' }}><Search size={16} aria-hidden="true" /></span>
      </div>

      <StudentTable rows={rows} canResetPassword={canResetPasswords} onResetPassword={setResetTarget} />
      <MobileStudentCardList rows={rows} canResetPassword={canResetPasswords} onResetPassword={setResetTarget} />

      <ConfirmationDialog
        open={!!resetTarget}
        title={t('teacher.classes.resetPasswordConfirmTitle')}
        description={t('teacher.classes.resetPasswordConfirmDescription')}
        onConfirm={handleResetPassword}
        onCancel={() => setResetTarget(null)}
      />
    </>
  );
}
