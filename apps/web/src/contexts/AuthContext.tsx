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
  /** Current active cabinet when role === 'both'. Otherwise matches the single role. */
  activeMode: 'trainer' | 'athlete';
  switchMode: () => void;
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

function getStoredMode(user: AuthUser | null): 'trainer' | 'athlete' {
  const stored = localStorage.getItem('activeMode') as 'trainer' | 'athlete' | null;
  if (stored === 'trainer' || stored === 'athlete') return stored;
  // Default: trainer if has trainer role
  if (user?.role === 'trainer' || user?.role === 'both') return 'trainer';
  return 'athlete';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(getStoredUser);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [activeMode, setActiveMode] = useState<'trainer' | 'athlete'>(() => getStoredMode(getStoredUser()));

  const login = useCallback((u: AuthUser, t: string) => {
    localStorage.setItem('user', JSON.stringify(u));
    localStorage.setItem('token', t);
    setUser(u);
    setToken(t);
    // Reset mode to match role on login
    const mode = u.role === 'athlete' ? 'athlete' : 'trainer';
    localStorage.setItem('activeMode', mode);
    setActiveMode(mode);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('activeMode');
    setUser(null);
    setToken(null);
    setActiveMode('trainer');
  }, []);

  const switchMode = useCallback(() => {
    setActiveMode((prev) => {
      const next = prev === 'trainer' ? 'athlete' : 'trainer';
      localStorage.setItem('activeMode', next);
      return next;
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isTrainer: user?.role === 'trainer' || user?.role === 'both',
      isAthlete: user?.role === 'athlete' || user?.role === 'both',
      activeMode,
      switchMode,
      login,
      logout,
    }),
    [user, token, activeMode, switchMode, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
