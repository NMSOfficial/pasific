import { Routes, Route } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { RoleGuard } from '../components/RoleGuard';
import { PlaceholderPage } from '../components/PlaceholderPage';
import { RootRedirect } from './RootRedirect';
import {
  STUDENT_SIDEBAR_NAV, STUDENT_BOTTOM_NAV,
  TEACHER_SIDEBAR_NAV, TEACHER_BOTTOM_NAV,
  ADMIN_SIDEBAR_NAV,
} from './navConfig';

import { LoginPage } from '../features/auth/LoginPage';
import { ActivatePage } from '../features/auth/ActivatePage';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';

import { StudentHomePage } from '../features/student/StudentHomePage';
import { AssignmentListPage } from '../features/student/AssignmentListPage';
import { AssignmentDetailPage } from '../features/student/AssignmentDetailPage';
import { WritingEditorPage } from '../features/student/WritingEditorPage';
import { SubmissionResultPage } from '../features/student/SubmissionResultPage';
import { PracticeHomePage } from '../features/student/PracticeHomePage';
import { PracticeNewPage } from '../features/student/PracticeNewPage';
import { PracticeWritingPage } from '../features/student/PracticeWritingPage';
import { CatalogListPage } from '../features/student/CatalogListPage';
import { CatalogTopicPage } from '../features/student/CatalogTopicPage';
import { ExampleLibraryPage } from '../features/student/ExampleLibraryPage';
import { ExampleDetailPage } from '../features/student/ExampleDetailPage';
import { StudentPortfolioPage } from '../features/student/StudentPortfolioPage';
import { StudentSettingsPage } from '../features/student/StudentSettingsPage';

import { TeacherDashboardPage } from '../features/teacher/TeacherDashboardPage';
import { ClassListPage } from '../features/teacher/ClassListPage';
import { ClassDetailPage } from '../features/teacher/ClassDetailPage';
import { StudentDetailPage } from '../features/teacher/StudentDetailPage';
import { TeacherAssignmentListPage } from '../features/teacher/TeacherAssignmentListPage';
import { AssignmentBuilderPage } from '../features/teacher/AssignmentBuilderPage';
import { TeacherAssignmentDetailPage } from '../features/teacher/TeacherAssignmentDetailPage';
import { AssignmentResultsPage } from '../features/teacher/AssignmentResultsPage';
import { TeacherSubmissionReviewPage } from '../features/teacher/TeacherSubmissionReviewPage';
import { SchoolCatalogPage } from '../features/teacher/SchoolCatalogPage';
import { TeacherReportsPage } from '../features/teacher/TeacherReportsPage';
import { SchoolSettingsPage } from '../features/teacher/SchoolSettingsPage';
import { TeamPage } from '../features/teacher/TeamPage';
import { TeacherSettingsPage } from '../features/teacher/TeacherSettingsPage';
import { TeacherMobileMenuPage } from '../features/teacher/TeacherMobileMenuPage';

import { AdminDashboardPage } from '../features/admin/AdminDashboardPage';
import { AdminSchoolListPage } from '../features/admin/AdminSchoolListPage';
import { AdminSchoolDetailPage } from '../features/admin/AdminSchoolDetailPage';
import { AdminTeachersPage } from '../features/admin/AdminTeachersPage';
import { AdminStudentsPage } from '../features/admin/AdminStudentsPage';
import { AdminActivationCodesPage } from '../features/admin/AdminActivationCodesPage';
import { AdminCatalogPage } from '../features/admin/AdminCatalogPage';
import { AdminWritingTypesPage } from '../features/admin/AdminWritingTypesPage';
import { AdminLevelsPage } from '../features/admin/AdminLevelsPage';
import { AdminRubricsPage } from '../features/admin/AdminRubricsPage';
import { AdminAuditLogPage } from '../features/admin/AdminAuditLogPage';
import { AdminSettingsPage } from '../features/admin/AdminSettingsPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/activate" element={<ActivatePage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route
        path="/student"
        element={
          <RoleGuard allow={['student']}>
            <AppShell sidebarItems={STUDENT_SIDEBAR_NAV} bottomNavItems={STUDENT_BOTTOM_NAV} />
          </RoleGuard>
        }
      >
        <Route path="home" element={<StudentHomePage />} />
        <Route path="assignments" element={<AssignmentListPage />} />
        <Route path="assignments/:assignmentId" element={<AssignmentDetailPage />} />
        <Route path="assignments/:assignmentId/write" element={<WritingEditorPage />} />
        <Route path="submissions/:submissionId/result" element={<SubmissionResultPage />} />
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

      <Route
        path="/teacher"
        element={
          <RoleGuard allow={['teacher']}>
            <AppShell sidebarItems={TEACHER_SIDEBAR_NAV} bottomNavItems={TEACHER_BOTTOM_NAV} />
          </RoleGuard>
        }
      >
        <Route path="dashboard" element={<TeacherDashboardPage />} />
        <Route path="classes" element={<ClassListPage />} />
        <Route path="classes/:classId" element={<ClassDetailPage />} />
        <Route path="students/:studentId" element={<StudentDetailPage />} />
        <Route path="students/:studentId/portfolio" element={<StudentDetailPage portfolioTab />} />
        <Route path="assignments" element={<TeacherAssignmentListPage />} />
        <Route path="assignments/new" element={<AssignmentBuilderPage />} />
        <Route path="assignments/:assignmentId" element={<TeacherAssignmentDetailPage />} />
        <Route path="assignments/:assignmentId/results" element={<AssignmentResultsPage />} />
        <Route path="submissions/:submissionId" element={<TeacherSubmissionReviewPage />} />
        <Route path="catalog" element={<SchoolCatalogPage />} />
        <Route path="reports" element={<TeacherReportsPage />} />
        <Route path="school" element={<SchoolSettingsPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="settings" element={<TeacherSettingsPage />} />
        <Route path="menu" element={<TeacherMobileMenuPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RoleGuard allow={['super_admin']}>
            <AppShell sidebarItems={ADMIN_SIDEBAR_NAV} />
          </RoleGuard>
        }
      >
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
  );
}
