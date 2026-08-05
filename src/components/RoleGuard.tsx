import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import type { UserRole } from '../types/entities';
import { LoadingSkeleton } from './LoadingSkeleton';

function homeForRole(role: UserRole): string {
  if (role === 'student') return '/student/home';
  if (role === 'teacher') return '/teacher/dashboard';
  return '/admin/dashboard';
}

export function RoleGuard({ allow, children }: { allow: UserRole[]; children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 'var(--space-6)' }}>
        <LoadingSkeleton width="12rem" height="1rem" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (!allow.includes(user.role)) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }
  return <>{children}</>;
}
