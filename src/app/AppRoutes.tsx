import { lazy, Suspense, type ComponentType } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { RoleGuard } from '../components/RoleGuard';
import { PlaceholderPage } from '../components/PlaceholderPage';
import { RootRedirect } from './RootRedirect';
import {
  STUDENT_SIDEBAR_NAV, STUDENT_BOTTOM_NAV,
  TEACHER_SIDEBAR_NAV, TEACHER_BOTTOM_NAV,
  ADMIN_SIDEBAR_NAV,
} from './navConfig';

function lazyNamed<T extends Record<string, unknown>, K extends keyof T>(
  loader: () => Promise<T>,
  exportName: K,
) {
  return lazy(async () => ({ default: (await loader())[exportName] as ComponentType<any> }));
}

const LoginPage = lazyNamed(() => import('../features/auth/LoginPage'), 'LoginPage');
const ActivatePage = lazyNamed(() => import('../features/auth/ActivatePage'), 'ActivatePage');
const ForgotPasswordPage = lazyNamed(() => import('../features/auth/ForgotPasswordPage'), 'ForgotPasswordPage');
const ResetPasswordPage = lazyNamed(() => import('../features/auth/ResetPasswordPage'), 'ResetPasswordPage');

const StudentHomePage = lazyNamed(() => import('../features/student/StudentHomePage'), 'StudentHomePage');
const AssignmentListPage = lazyNamed(() => import('../features/student/AssignmentListPage'), 'AssignmentListPage');
const AssignmentDetailPage = lazyNamed(() => import('../features/student/AssignmentDetailPage'), 'AssignmentDetailPage');
const WritingEditorPage = lazyNamed(() => import('../features/student/WritingEditorPage'), 'WritingEditorPage');
const SubmissionResultPage = lazyNamed(() => import('../features/student/SubmissionResultPage'), 'SubmissionResultPage');
const PracticeHomePage = lazyNamed(() => import('../features/student/PracticeHomePage'), 'PracticeHomePage');
const PracticeNewPage = lazyNamed(() => import('../features/student/PracticeNewPage'), 'PracticeNewPage');
const PracticeWritingPage = lazyNamed(() => import('../features/student/PracticeWritingPage'), 'PracticeWritingPage');
const CatalogListPage = lazyNamed(() => import('../features/student/CatalogListPage'), 'CatalogListPage');
const CatalogTopicPage = lazyNamed(() => import('../features/student/CatalogTopicPage'), 'CatalogTopicPage');
const ExampleLibraryPage = lazyNamed(() => import('../features/student/ExampleLibraryPage'), 'ExampleLibraryPage');
const ExampleDetailPage = lazyNamed(() => import('../features/student/ExampleDetailPage'), 'ExampleDetailPage');
const StudentPortfolioPage = lazyNamed(() => import('../features/student/StudentPortfolioPage'), 'StudentPortfolioPage');
const StudentSettingsPage = lazyNamed(() => import('../features/student/StudentSettingsPage'), 'StudentSettingsPage');
const StudentExamResultsPage = lazyNamed(() => import('../features/student/StudentExamResultsPage'), 'StudentExamResultsPage');

const TeacherDashboardPage = lazyNamed(() => import('../features/teacher/TeacherDashboardPage'), 'TeacherDashboardPage');
const ClassListPage = lazyNamed(() => import('../features/teacher/ClassListPage'), 'ClassListPage');
const ClassDetailPage = lazyNamed(() => import('../features/teacher/ClassDetailPage'), 'ClassDetailPage');
const StudentDetailPage = lazyNamed(() => import('../features/teacher/StudentDetailPage'), 'StudentDetailPage');
const TeacherAssignmentListPage = lazyNamed(() => import('../features/teacher/TeacherAssignmentListPage'), 'TeacherAssignmentListPage');
const TeacherAssignmentWizardPage = lazyNamed(() => import('../features/teacher/TeacherAssignmentWizardPage'), 'TeacherAssignmentWizardPage');
const TeacherAssignmentDetailPage = lazyNamed(() => import('../features/teacher/TeacherAssignmentDetailPage'), 'TeacherAssignmentDetailPage');
const AssignmentResultsPage = lazyNamed(() => import('../features/teacher/AssignmentResultsPage'), 'AssignmentResultsPage');
const TeacherSubmissionReviewPage = lazyNamed(() => import('../features/teacher/TeacherSubmissionReviewPage'), 'TeacherSubmissionReviewPage');
const TeacherWritingOcrPage = lazyNamed(() => import('../features/teacher/TeacherWritingOcrPage'), 'TeacherWritingOcrPage');
const TeacherExamListPage = lazyNamed(() => import('../features/teacher/TeacherExamListPage'), 'TeacherExamListPage');
const TeacherExamSetupPage = lazyNamed(() => import('../features/teacher/TeacherExamSetupPage'), 'TeacherExamSetupPage');
const TeacherExamGradingPage = lazyNamed(() => import('../features/teacher/TeacherExamGradingPage'), 'TeacherExamGradingPage');
const TeacherExamReviewPage = lazyNamed(() => import('../features/teacher/TeacherExamReviewPage'), 'TeacherExamReviewPage');
const SchoolCatalogPage = lazyNamed(() => import('../features/teacher/SchoolCatalogPage'), 'SchoolCatalogPage');
const TeacherReportsPage = lazyNamed(() => import('../features/teacher/TeacherReportsPage'), 'TeacherReportsPage');
const SchoolSettingsPage = lazyNamed(() => import('../features/teacher/SchoolSettingsPage'), 'SchoolSettingsPage');
const TeamPage = lazyNamed(() => import('../features/teacher/TeamPage'), 'TeamPage');
const TeacherSettingsPage = lazyNamed(() => import('../features/teacher/TeacherSettingsPage'), 'TeacherSettingsPage');
const TeacherMobileMenuPage = lazyNamed(() => import('../features/teacher/TeacherMobileMenuPage'), 'TeacherMobileMenuPage');
const TeacherActivationCodesPage = lazyNamed(() => import('../features/teacher/TeacherActivationCodesPage'), 'TeacherActivationCodesPage');

const AdminDashboardPage = lazyNamed(() => import('../features/admin/AdminDashboardPage'), 'AdminDashboardPage');
const AdminSchoolListPage = lazyNamed(() => import('../features/admin/AdminSchoolListPage'), 'AdminSchoolListPage');
const AdminSchoolDetailPage = lazyNamed(() => import('../features/admin/AdminSchoolDetailPage'), 'AdminSchoolDetailPage');
const AdminTeachersPage = lazyNamed(() => import('../features/admin/AdminTeachersPage'), 'AdminTeachersPage');
const AdminStudentsPage = lazyNamed(() => import('../features/admin/AdminStudentsPage'), 'AdminStudentsPage');
const AdminActivationCodesPage = lazyNamed(() => import('../features/admin/AdminActivationCodesPage'), 'AdminActivationCodesPage');
const AdminCatalogPage = lazyNamed(() => import('../features/admin/AdminCatalogPage'), 'AdminCatalogPage');
const AdminWritingTypesPage = lazyNamed(() => import('../features/admin/AdminWritingTypesPage'), 'AdminWritingTypesPage');
const AdminLevelsPage = lazyNamed(() => import('../features/admin/AdminLevelsPage'), 'AdminLevelsPage');
const AdminRubricsPage = lazyNamed(() => import('../features/admin/AdminRubricsPage'), 'AdminRubricsPage');
const AdminAuditLogPage = lazyNamed(() => import('../features/admin/AdminAuditLogPage'), 'AdminAuditLogPage');
const AdminSettingsPage = lazyNamed(() => import('../features/admin/AdminSettingsPage'), 'AdminSettingsPage');

function RouteFallback() {
  return <div style={{ minHeight: '40vh', display: 'grid', placeItems: 'center', padding: 'var(--space-6)' }}><LoadingSkeleton width="12rem" height="1rem" /></div>;
}

export function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/activate" element={<ActivatePage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route path="/student" element={<RoleGuard allow={['student']}><AppShell sidebarItems={STUDENT_SIDEBAR_NAV} bottomNavItems={STUDENT_BOTTOM_NAV} /></RoleGuard>}>
          <Route path="home" element={<StudentHomePage />} />
          <Route path="assignments" element={<AssignmentListPage />} />
          <Route path="assignments/:assignmentId" element={<AssignmentDetailPage />} />
          <Route path="assignments/:assignmentId/write" element={<WritingEditorPage />} />
          <Route path="submissions/:submissionId/result" element={<SubmissionResultPage />} />
          <Route path="exam-results" element={<StudentExamResultsPage />} />
          <Route path="practice" element={<PracticeHomePage />} />
          <Route path="practice/new" element={<PracticeNewPage />} />
          <Route path="practice/:submissionId/write" element={<PracticeWritingPage />} />
          <Route path="catalog" element={<CatalogListPage />} />
          <Route path="catalog/:topicId" element={<CatalogTopicPage />} />
          <Route path="examples" element={<ExampleLibraryPage />} />
          <Route path="examples/:exampleId" element={<ExampleDetailPage />} />
          <Route path="portfolio" element={<StudentPortfolioPage />} />
          <Route path="portfolio/:submissionId" element={<SubmissionResultPage portfolioContext />} />
          <Route path="settings" element={<StudentSettingsPage />} />
        </Route>

        <Route path="/teacher" element={<RoleGuard allow={['teacher']}><AppShell sidebarItems={TEACHER_SIDEBAR_NAV} bottomNavItems={TEACHER_BOTTOM_NAV} /></RoleGuard>}>
          <Route path="dashboard" element={<TeacherDashboardPage />} />
          <Route path="classes" element={<ClassListPage />} />
          <Route path="classes/:classId" element={<ClassDetailPage />} />
          <Route path="students/:studentId" element={<StudentDetailPage />} />
          <Route path="students/:studentId/portfolio" element={<StudentDetailPage portfolioTab />} />
          <Route path="assignments" element={<TeacherAssignmentListPage />} />
          <Route path="assignments/new" element={<TeacherAssignmentWizardPage />} />
          <Route path="assignments/:assignmentId" element={<TeacherAssignmentDetailPage />} />
          <Route path="assignments/:assignmentId/results" element={<AssignmentResultsPage />} />
          <Route path="submissions/:submissionId" element={<TeacherSubmissionReviewPage />} />
          <Route path="assessment-hub" element={<TeacherWritingOcrPage />} />
          <Route path="exams" element={<TeacherExamListPage />} />
          <Route path="exams/new" element={<TeacherExamSetupPage />} />
          <Route path="exams/:examId/setup" element={<TeacherExamSetupPage />} />
          <Route path="exams/:examId/grade" element={<TeacherExamGradingPage />} />
          <Route path="exams/:examId/attempts/:attemptId" element={<TeacherExamReviewPage />} />
          <Route path="catalog" element={<SchoolCatalogPage />} />
          <Route path="examples" element={<ExampleLibraryPage basePath="/teacher" />} />
          <Route path="examples/:exampleId" element={<ExampleDetailPage basePath="/teacher" />} />
          <Route path="activation-codes" element={<TeacherActivationCodesPage />} />
          <Route path="reports" element={<TeacherReportsPage />} />
          <Route path="school" element={<SchoolSettingsPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route path="settings" element={<TeacherSettingsPage />} />
          <Route path="menu" element={<TeacherMobileMenuPage />} />
        </Route>

        <Route path="/admin" element={<RoleGuard allow={['super_admin']}><AppShell sidebarItems={ADMIN_SIDEBAR_NAV} /></RoleGuard>}>
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="schools" element={<AdminSchoolListPage />} />
          <Route path="schools/:schoolId" element={<AdminSchoolDetailPage />} />
          <Route path="users" element={<AdminTeachersPage />} />
          <Route path="teachers" element={<AdminTeachersPage />} />
          <Route path="students" element={<AdminStudentsPage />} />
          <Route path="activation-codes" element={<AdminActivationCodesPage />} />
          <Route path="catalog" element={<AdminCatalogPage />} />
          <Route path="writing-types" element={<AdminWritingTypesPage />} />
          <Route path="levels" element={<AdminLevelsPage />} />
          <Route path="rubrics" element={<AdminRubricsPage />} />
          <Route path="audit-log" element={<AdminAuditLogPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
        </Route>

        <Route path="*" element={<PlaceholderPage title="404" />} />
      </Routes>
    </Suspense>
  );
}
