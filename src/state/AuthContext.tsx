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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const appUser = session?.user ? await fetchAppUser(session.user.id) : null;
      if (active) {
        setUser(appUser);
        setLoading(false);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const appUser = session?.user ? await fetchAppUser(session.user.id) : null;
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
