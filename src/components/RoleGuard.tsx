import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import type { UserRole } from '../types/entities';

function homeForRole(role: UserRole): string {
  if (role === 'student') return '/student/home';
  if (role === 'teacher') return '/teacher/dashboard';
  return '/admin/dashboard';
}

export function RoleGuard({ allow, children }: { allow: UserRole[]; children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!allow.includes(user.role)) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }
  return <>{children}</>;
}
