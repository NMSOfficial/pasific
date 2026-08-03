import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AppUser } from '../types/entities';
import { mockStore } from '../mock/useMockStore';

interface AuthContextValue {
  user: AppUser | null;
  login: (username: string, password: string) => { ok: true } | { ok: false; errorKey: string };
  logout: () => void;
  /** Development-only: swap the active user without a real login, for demoing role-based views. */
  devSwitchUser: (userId: string) => void;
}

const STORAGE_KEY = 'pasific.session.userId';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(() => {
    const storedId = localStorage.getItem(STORAGE_KEY);
    if (!storedId) return null;
    return resolveUserById(storedId);
  });

  const login = useCallback((username: string, password: string) => {
    if (!password) return { ok: false as const, errorKey: 'auth.login.invalidCredentials' };
    const found = mockStore.findUserByUsername(username.trim());
    if (!found) return { ok: false as const, errorKey: 'auth.login.invalidCredentials' };
    setUser(found);
    localStorage.setItem(STORAGE_KEY, found.id);
    mockStore.markLogin(found.id);
    return { ok: true as const };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const devSwitchUser = useCallback((userId: string) => {
    const found = resolveUserById(userId);
    if (found) {
      setUser(found);
      localStorage.setItem(STORAGE_KEY, found.id);
    }
  }, []);

  const value = useMemo(() => ({ user, login, logout, devSwitchUser }), [user, login, logout, devSwitchUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function resolveUserById(id: string): AppUser | null {
  const s = mockStore.getState();
  return s.students.find((u) => u.id === id)
    ?? s.teachers.find((u) => u.id === id)
    ?? (s.admins.find((u) => u.id === id) as AppUser | undefined)
    ?? null;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
