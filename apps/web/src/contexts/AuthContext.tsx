import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { UserRole } from '@/api/auth';

interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isTrainer: boolean;
  isAthlete: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  const login = useCallback((u: AuthUser, t: string) => {
    localStorage.setItem('user', JSON.stringify(u));
    localStorage.setItem('token', t);
    setUser(u);
    setToken(t);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isTrainer: user?.role === 'trainer' || user?.role === 'both',
      isAthlete: user?.role === 'athlete' || user?.role === 'both',
      login,
      logout,
    }),
    [user, token, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
