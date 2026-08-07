import {
  Home, ClipboardList, PenSquare, Library, BookOpen, FolderClock, UserCircle, ClipboardCheck,
  LayoutDashboard, Users, FileStack, BarChart3, School, UsersRound, Settings, Menu, ScanLine,
  Building2, ShieldCheck, KeyRound, BookMarked, Type, Gauge, ScrollText, SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  key: string;
  to: string;
  icon: LucideIcon;
  labelKey: string;
}

export const STUDENT_SIDEBAR_NAV: NavItem[] = [
  { key: 'home', to: '/student/home', icon: Home, labelKey: 'nav.student.home' },
  { key: 'assignments', to: '/student/assignments', icon: ClipboardList, labelKey: 'nav.student.assignments' },
  { key: 'examResults', to: '/student/exam-results', icon: ClipboardCheck, labelKey: 'Sınav Sonuçları' },
  { key: 'practice', to: '/student/practice', icon: PenSquare, labelKey: 'nav.student.practice' },
  { key: 'catalog', to: '/student/catalog', icon: Library, labelKey: 'nav.student.catalog' },
  { key: 'examples', to: '/student/examples', icon: BookOpen, labelKey: 'nav.student.examples' },
  { key: 'portfolio', to: '/student/portfolio', icon: FolderClock, labelKey: 'nav.student.portfolio' },
  { key: 'settings', to: '/student/settings', icon: UserCircle, labelKey: 'nav.student.settings' },
];

export const STUDENT_BOTTOM_NAV: NavItem[] = [
  { key: 'home', to: '/student/home', icon: Home, labelKey: 'nav.student.home' },
  { key: 'assignments', to: '/student/assignments', icon: ClipboardList, labelKey: 'nav.student.assignments' },
  { key: 'practice', to: '/student/practice', icon: PenSquare, labelKey: 'nav.student.practice' },
  { key: 'portfolio', to: '/student/portfolio', icon: FolderClock, labelKey: 'nav.student.portfolio' },
  { key: 'settings', to: '/student/settings', icon: UserCircle, labelKey: 'nav.student.settings' },
];

export const TEACHER_SIDEBAR_NAV: NavItem[] = [
  { key: 'dashboard', to: '/teacher/dashboard', icon: LayoutDashboard, labelKey: 'nav.teacher.dashboard' },
  { key: 'classes', to: '/teacher/classes', icon: Users, labelKey: 'nav.teacher.classes' },
  { key: 'assignments', to: '/teacher/assignments', icon: FileStack, labelKey: 'nav.teacher.assignments' },
  { key: 'assessmentHub', to: '/teacher/assessment-hub', icon: ScanLine, labelKey: 'Belge & Sınav' },
  { key: 'catalog', to: '/teacher/catalog', icon: Library, labelKey: 'nav.teacher.catalog' },
  { key: 'examples', to: '/teacher/examples', icon: BookOpen, labelKey: 'nav.teacher.examples' },
  { key: 'activationCodes', to: '/teacher/activation-codes', icon: KeyRound, labelKey: 'nav.teacher.activationCodes' },
  { key: 'reports', to: '/teacher/reports', icon: BarChart3, labelKey: 'nav.teacher.reports' },
  { key: 'school', to: '/teacher/school', icon: School, labelKey: 'nav.teacher.school' },
  { key: 'team', to: '/teacher/team', icon: UsersRound, labelKey: 'nav.teacher.team' },
  { key: 'settings', to: '/teacher/settings', icon: Settings, labelKey: 'nav.teacher.settings' },
];

export const TEACHER_BOTTOM_NAV: NavItem[] = [
  { key: 'dashboard', to: '/teacher/dashboard', icon: LayoutDashboard, labelKey: 'nav.teacher.dashboard' },
  { key: 'classes', to: '/teacher/classes', icon: Users, labelKey: 'nav.teacher.classes' },
  { key: 'assignments', to: '/teacher/assignments', icon: FileStack, labelKey: 'nav.teacher.assignments' },
  { key: 'catalog', to: '/teacher/catalog', icon: Library, labelKey: 'nav.teacher.catalog' },
  { key: 'menu', to: '/teacher/menu', icon: Menu, labelKey: 'nav.teacher.menu' },
];

export const ADMIN_SIDEBAR_NAV: NavItem[] = [
  { key: 'dashboard', to: '/admin/dashboard', icon: LayoutDashboard, labelKey: 'nav.admin.dashboard' },
  { key: 'schools', to: '/admin/schools', icon: Building2, labelKey: 'nav.admin.schools' },
  { key: 'teachers', to: '/admin/teachers', icon: Users, labelKey: 'nav.admin.teachers' },
  { key: 'students', to: '/admin/students', icon: ShieldCheck, labelKey: 'nav.admin.students' },
  { key: 'activationCodes', to: '/admin/activation-codes', icon: KeyRound, labelKey: 'nav.admin.activationCodes' },
  { key: 'catalog', to: '/admin/catalog', icon: BookMarked, labelKey: 'nav.admin.catalog' },
  { key: 'writingTypes', to: '/admin/writing-types', icon: Type, labelKey: 'nav.admin.writingTypes' },
  { key: 'levels', to: '/admin/levels', icon: Gauge, labelKey: 'nav.admin.levels' },
  { key: 'rubrics', to: '/admin/rubrics', icon: SlidersHorizontal, labelKey: 'nav.admin.rubrics' },
  { key: 'auditLog', to: '/admin/audit-log', icon: ScrollText, labelKey: 'nav.admin.auditLog' },
  { key: 'settings', to: '/admin/settings', icon: Settings, labelKey: 'nav.admin.settings' },
];
