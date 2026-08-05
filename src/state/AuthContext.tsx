import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppUser } from '../types/entities';
import { supabase } from '../services/supabaseClient';
import { fetchAppUser, markLogin } from '../services/profile';
import { usernameToAuthEmail } from '../utils/authEmail';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ ok: true } | { ok: false; errorKey: string }>;
  logout: () => Promise<void>;
  /** Re-fetch the current session's profile — use after creating it server-side (e.g. activation). */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * `status`/`expiresAt` were being fetched into AppUser but never actually
 * checked anywhere — a suspended account (or, once activation codes started
 * carrying an account expiry, an expired one) could still sign in and use
 * the app freely. This is the one place that matters: block here and every
 * other check (RoleGuard, RLS, ...) never needs to know about either.
 */
function isAccountUsable(appUser: AppUser): boolean {
  if (appUser.status === 'suspended') return false;
  if (appUser.expiresAt && new Date(appUser.expiresAt).getTime() <= Date.now()) return false;
  return true;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const appUser = session?.user ? await fetchAppUser(session.user.id) : null;
      if (appUser && !isAccountUsable(appUser)) {
        await supabase.auth.signOut();
        if (active) { setUser(null); setLoading(false); }
        return;
      }
      if (active) {
        setUser(appUser);
        setLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const appUser = session?.user ? await fetchAppUser(session.user.id) : null;
      if (appUser && !isAccountUsable(appUser)) {
        await supabase.auth.signOut();
        if (active) setUser(null);
        return;
      }
      if (active) setUser(appUser);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    if (!password) return { ok: false as const, errorKey: 'auth.login.invalidCredentials' };

    const email = usernameToAuthEmail(username);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { ok: false as const, errorKey: 'auth.login.invalidCredentials' };

    const appUser = await fetchAppUser(data.user.id);
    if (!appUser) return { ok: false as const, errorKey: 'auth.login.invalidCredentials' };

    if (!isAccountUsable(appUser)) {
      await supabase.auth.signOut();
      const errorKey = appUser.status === 'suspended' ? 'auth.login.accountSuspended' : 'auth.login.accountExpired';
      return { ok: false as const, errorKey };
    }

    setUser(appUser);
    void markLogin(data.user.id);
    return { ok: true as const };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const appUser = session?.user ? await fetchAppUser(session.user.id) : null;
    setUser(appUser);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshUser }),
    [user, loading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
