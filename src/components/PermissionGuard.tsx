import type { ReactNode } from 'react';
import { useAuth } from '../state/AuthContext';
import type { TeacherPermissionKey } from '../types/entities';
import { PermissionDenied } from './PermissionDenied';

/** Gate content behind a granular teacher permission (section 6). Super admins bypass all checks. */
export function PermissionGuard({ permission, children }: { permission: TeacherPermissionKey; children: ReactNode }) {
  const { user } = useAuth();

  if (user?.role === 'super_admin') return <>{children}</>;
  if (user?.role !== 'teacher' || !user.permissions.includes(permission)) {
    return <PermissionDenied />;
  }
  return <>{children}</>;
}

export function useHasPermission(permission: TeacherPermissionKey): boolean {
  const { user } = useAuth();
  if (user?.role === 'super_admin') return true;
  return user?.role === 'teacher' && user.permissions.includes(permission);
}
