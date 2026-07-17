'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authAPI, setAuthToken } from '@/lib/api';

interface AuthContextType {
  /** Whether the backend requires login at all. */
  authEnabled: boolean;
  /** Whether the current client holds a valid session. */
  isAuthenticated: boolean;
  /** True while the initial auth-status check is in flight. */
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  authEnabled: false,
  isAuthenticated: false,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authEnabled, setAuthEnabled] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Determine whether auth is required and whether we already have a session.
  useEffect(() => {
    let cancelled = false;
    authAPI
      .getStatus()
      .then((s) => {
        if (cancelled) return;
        setAuthEnabled(s.enabled);
        setIsAuthenticated(s.authenticated);
      })
      .catch(() => {
        // If the status check itself fails (e.g. backend down), fall back to
        // assuming auth is disabled so the dashboard remains usable.
        if (cancelled) return;
        setAuthEnabled(false);
        setIsAuthenticated(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Redirect to the login screen whenever auth is required but we lack a
  // valid session — except when we are already on the login page.
  useEffect(() => {
    if (loading) return;
    if (authEnabled && !isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    }
  }, [loading, authEnabled, isAuthenticated, pathname, router]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await authAPI.login(username, password);
    if (res.token) {
      setAuthToken(res.token);
      setIsAuthenticated(true);
    } else {
      throw new Error('Login is not enabled');
    }
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setIsAuthenticated(false);
    authAPI.logout().catch(() => {});
    router.replace('/login');
  }, [router]);

  // Keep auth state in sync if another tab logs in/out.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'selfhost_auth_token') {
        setIsAuthenticated(!!e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // While the auth status is being determined, render nothing to avoid
  // flashing protected content (or an unnecessary redirect).
  if (loading) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{ authEnabled, isAuthenticated, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
