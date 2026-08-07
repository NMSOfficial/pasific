import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../../state/AuthContext';
import { findErrorCategory } from '../../mock/errorCategories';
import type { Assignment, StudentProfile, Submission, TeacherProfile } from '../../types/entities';
import { PageHeader } from '../../components/PageHeader';
import { PdfExportButton } from '../../components/PdfExportButton';
import { EmptyState } from '../../components/EmptyState';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { exportClassProgressPdf, exportClassReportPdf } from '../../utils/pdf';
import { exportXlsx } from '../../utils/excel';
import { fetchTeacherClasses, fetchStudentsByIds, type ClassMeta } from '../../services/teacherData';
import { fetchAssignmentsForTeacher } from '../../services/assignmentData';
import { fetchSubmissionsForStudents } from '../../services/submissionData';
import { fetchSchool, type SchoolSummary } from '../../services/adminData';

export function TeacherReportsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const teacher = user as TeacherProfile;

  const [classes, setClasses] = useState<ClassMeta[] | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classId, setClassId] = useState('');
  const [assignmentId, setAssignmentId] = useState('');
  const [school, setSchool] = useState<SchoolSummary | null>(null);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [classSubmissions, setClassSubmissions] = useState<Submission[]>([]);

  useEffect(() => {
    fetchTeacherClasses(teacher.id).then((list) => {
      setClasses(list);
      setClassId((prev) => prev || list[0]?.id || '');
    });
    fetchAssignmentsForTeacher(teacher.id).then(setAssignments);
    if (teacher.schoolIds[0]) fetchSchool(teacher.schoolIds[0]).then(setSchool);
  }, [teacher.id, teacher.schoolIds]);

  useEffect(() => {
    const cls = classes?.find((candidate) => candidate.id === classId);
    if (!cls) {
      setStudents([]);
      setClassSubmissions([]);
      return;
    }
    Promise.all([
      fetchStudentsByIds(cls.studentIds),
      fetchSubmissionsForStudents(cls.studentIds, { excludePractice: true }),
    ]).then(([studentList, submissions]) => {
      setStudents(studentList);
      setClassSubmissions(submissions);
    });
  }, [classes, classId]);

  const classAssignments = useMemo(() => assignments.filter((a) => a.classIds.includes(classId)), [assignments, classId]);
  const assignment = classAssignments.find((a) => a.id === assignmentId) ?? classAssignments[0];
  const cls = classes?.find((candidate) => candidate.id === classId);

  const assignmentRows = useMemo(() => {
    if (!assignment || !cls) return [];
    const assignmentSubmissions = classSubmissions.filter((sub) => sub.assignmentId === assignment.id);
    return cls.studentIds.map((studentId) => {
      const student = students.find((candidate) => candidate.id === studentId);
      const sub = assignmentSubmissions.find((candidate) => candidate.studentId === studentId);
      return {
        student,
        studentName: student?.displayName ?? '',
        username: student?.username ?? '',
        status: sub ? t(`submissionStatus.${sub.status}`) : t('submissionStatus.not_started'),
        score: sub?.finalScore,
      };
    });
  }, [assignment, cls, classSubmissions, students, t]);

  const completedClassSubmissions = useMemo(
    () => classSubmissions.filter((sub) => sub.status === 'result_ready' && sub.finalScore !== undefined),
    [classSubmissions],
  );

  const criterionAverages = useMemo(() => {
    const sums = new Map<string, { sum: number; count: number; maxScore: number }>();
    for (const sub of completedClassSubmissions) {
      if (sub.usesCustomRubric) continue;
      for (const criterion of sub.criterionScores) {
        const current = sums.get(criterion.criterionKey) ?? { sum: 0, count: 0, maxScore: criterion.maxScore };
        current.sum += criterion.teacherScore ?? criterion.aiScore;
        current.count += 1;
        sums.set(criterion.criterionKey, current);
      }
    }
    return [...sums.entries()].map(([key, value]) => ({
      label: t(`rubric.criterion.${key}.name`),
      score: Math.round((value.sum / value.count) * 10) / 10,
      maxScore: value.maxScore,
    }));
  }, [completedClassSubmissions, t]);

  const commonErrors = useMemo(() => {
    const counts = new Map<string, number>();
    for (const sub of completedClassSubmissions) {
      for (const annotation of sub.annotations) counts.set(annotation.categoryId, (counts.get(annotation.categoryId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id, count]) => ({ label: t(findErrorCategory(id)?.nameKey ?? id), count }));
  }, [completedClassSubmissions, t]);

  const progressStudents = useMemo(() => students.map((student) => {
    const latest = completedClassSubmissions
      .filter((sub) => sub.studentId === student.id)
      .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))[0];
    return { student, recentScore: latest?.finalScore, completed: completedClassSubmissions.filter((sub) => sub.studentId === student.id).length };
  }), [students, completedClassSubmissions]);

  if (!classes) return <LoadingSkeleton height="12rem" />;

  const scored = assignmentRows.filter((row) => row.score !== undefined);
  const avg = scored.length ? Math.round(scored.reduce((sum, row) => sum + (row.score ?? 0), 0) / scored.length) : undefined;
  const locale = i18n.resolvedLanguage ?? 'tr';

  const exportAssignmentExcel = () => {
    if (!assignment) return;
    exportXlsx({
      fileName: `pasific-${assignment.title}-report`,
      sheetName: assignment.title,
      columns: [t('common.student'), t('settings.username'), t('common.status'), t('common.score')],
      rows: assignmentRows.map((row) => [row.studentName, row.username, row.status, row.score]),
    });
  };

  const exportProgressExcel = () => exportXlsx({
    fileName: `pasific-${cls?.name ?? 'class'}-progress`,
    sheetName: cls?.name ?? 'Class Progress',
    columns: [t('common.student'), t('settings.username'), t('teacher.assignments.submittedCount'), t('teacher.classes.recentScore')],
    rows: progressStudents.map(({ student, completed, recentScore }) => [student.displayName, student.username, completed, recentScore]),
  });

  const exportRosterExcel = () => exportXlsx({
    fileName: `pasific-${cls?.name ?? 'class'}-students`,
    sheetName: cls?.name ?? 'Students',
    columns: [t('common.student'), t('settings.username'), t('common.status')],
    rows: students.map((student) => [student.displayName, student.username, t(`accountStatus.${student.status}`)]),
  });

  return (
    <>
      <PageHeader title={t('nav.teacher.reports')} />

      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
        <select className="select-control" style={{ width: 'auto' }} value={classId} onChange={(e) => { setClassId(e.target.value); setAssignmentId(''); }} aria-label={t('teacher.reports.selectClass')}>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="select-control" style={{ width: 'auto' }} value={assignment?.id ?? ''} onChange={(e) => setAssignmentId(e.target.value)} aria-label={t('teacher.reports.selectAssignment')}>
          {classAssignments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
      </div>

      {!cls ? (
        <EmptyState title={t('states.empty.generic')} />
      ) : (
        <>
          <div className="report-card-grid">
            <section className="card card--padded report-card">
              <div>
                <h2>{assignment?.title ?? t('teacher.assignments.resultsTitle')}</h2>
                <p className="field__hint">{t('teacher.assignments.avgScore')}: {avg ?? '—'}</p>
              </div>
              <div className="report-card__actions">
                {assignment && (
                  <PdfExportButton
                    onExport={() => exportClassReportPdf({
                      className: cls.name,
                      schoolName: school?.name,
                      assignmentTitle: assignment.title,
                      locale,
                      rows: assignmentRows.map((row) => ({ studentName: row.studentName, status: row.status, score: row.score })),
                      averageScore: avg,
                    })}
                  />
                )}
                <button type="button" className="btn btn--secondary" disabled={!assignment} onClick={exportAssignmentExcel}><FileSpreadsheet size={16} aria-hidden="true" /> Excel</button>
              </div>
            </section>

            <section className="card card--padded report-card">
              <div>
                <h2>{i18n.resolvedLanguage?.startsWith('tr') ? 'Sınıf İlerleme Raporu' : 'Class Progress Report'}</h2>
                <p className="field__hint">{completedClassSubmissions.length} {t('teacher.assignments.submittedCount').toLocaleLowerCase()}</p>
              </div>
              <div className="report-card__actions">
                <PdfExportButton
                  onExport={() => exportClassProgressPdf({
                    className: cls.name,
                    schoolName: school?.name,
                    locale,
                    criterionAverages,
                    commonErrors,
                    students: progressStudents.map(({ student, recentScore }) => ({ name: student.displayName, recentScore })),
                  })}
                />
                <button type="button" className="btn btn--secondary" onClick={exportProgressExcel}><FileSpreadsheet size={16} aria-hidden="true" /> Excel</button>
              </div>
            </section>

            <section className="card card--padded report-card">
              <div>
                <h2>{i18n.resolvedLanguage?.startsWith('tr') ? 'Öğrenci Listesi' : 'Student Roster'}</h2>
                <p className="field__hint">{students.length} {t('common.student').toLocaleLowerCase()}</p>
              </div>
              <div className="report-card__actions">
                <button type="button" className="btn btn--secondary" onClick={exportRosterExcel}><FileSpreadsheet size={16} aria-hidden="true" /> Excel</button>
              </div>
            </section>
          </div>

          {assignment && (
            <div className="card card--padded" style={{ marginTop: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <p style={{ fontWeight: 'var(--weight-semibold)' }}>{assignment.title}</p>
                <p className="field__hint">{t('teacher.assignments.avgScore')}: {avg ?? '—'}</p>
              </div>
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead><tr><th>{t('common.student')}</th><th>{t('common.status')}</th><th>{t('common.score')}</th></tr></thead>
                  <tbody>
                    {assignmentRows.map((row) => (
                      <tr key={row.student?.id ?? row.username}>
                        <td>{row.studentName}<div className="field__hint">@{row.username}</div></td>
                        <td>{row.status}</td>
                        <td>{row.score !== undefined ? `${row.score}/100` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
