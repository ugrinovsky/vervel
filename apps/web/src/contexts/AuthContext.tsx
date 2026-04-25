import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import type { UserRole } from '@/api/auth';
import { ThemeController } from '@/util/ThemeController';
import { clearAuxiliaryOAuthSessionStorage } from '@/auth/auxiliarySessionStorage';
import { setApiAccessToken } from '@/api/http/baseApi';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  /** null — после OAuth / мини-приложения, пока не выбрана роль на /select-role */
  role: UserRole | null;
  gender?: 'male' | 'female' | null;
  photoUrl?: string | null;
  balance?: number;
  themeHue?: number | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  updateUser: (user: AuthUser) => void;
  logout: () => void;
}

interface RoleContextValue {
  isTrainer: boolean;
  isAthlete: boolean;
  /** Current active cabinet when role === 'both'. Otherwise matches the single role. */
  activeMode: 'trainer' | 'athlete';
  switchMode: () => void;
}

interface BalanceContextValue {
  /** Wallet balance in rubles — for AI features, donations. null = not yet loaded. */
  balance: number | null;
  setBalance: (balance: number) => void;
}

// ─── Contexts ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);
const RoleContext = createContext<RoleContextValue | null>(null);
const BalanceContext = createContext<BalanceContextValue | null>(null);

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  if (user?.role === 'trainer' || user?.role === 'both') return 'trainer';
  return 'athlete';
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const storedUser = getStoredUser();
  const [user, setUser] = useState<AuthUser | null>(storedUser);
  const [activeMode, setActiveMode] = useState<'trainer' | 'athlete'>(() => getStoredMode(storedUser));
  const [balance, setBalance] = useState<number | null>(storedUser?.balance ?? null);

  // ThemeController.init() already runs in main.tsx — safety net if storage changed before React.
  useEffect(() => {
    const u = getStoredUser();
    if (u?.themeHue != null) {
      ThemeController.apply(u.themeHue);
    }
  }, []);

  const login = useCallback((u: AuthUser) => {
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    if (u.balance !== undefined) setBalance(u.balance);
    ThemeController.apply(u.themeHue ?? ThemeController.getStored());
    const mode =
      u.role === 'athlete'
        ? 'athlete'
        : u.role === 'trainer' || u.role === 'both'
          ? 'trainer'
          : 'athlete';
    localStorage.setItem('activeMode', mode);
    setActiveMode(mode);
  }, []);

  const updateUser = useCallback((u: AuthUser) => {
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    if (u.balance !== undefined) setBalance(u.balance);
    ThemeController.apply(u.themeHue ?? ThemeController.getStored());
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('activeMode');
    setApiAccessToken(null);
    clearAuxiliaryOAuthSessionStorage();
    setUser(null);
    setBalance(null);
    setActiveMode('trainer');
    ThemeController.reset();
  }, []);

  const switchMode = useCallback(() => {
    setActiveMode((prev) => {
      const next = prev === 'trainer' ? 'athlete' : 'trainer';
      localStorage.setItem('activeMode', next);
      return next;
    });
  }, []);

  const authValue = useMemo<AuthContextValue>(
    () => ({ user, login, updateUser, logout }),
    [user, login, updateUser, logout],
  );

  const roleValue = useMemo<RoleContextValue>(
    () => ({
      isTrainer: user?.role === 'trainer' || user?.role === 'both',
      isAthlete: user?.role === 'athlete' || user?.role === 'both',
      activeMode,
      switchMode,
    }),
    [user, activeMode, switchMode],
  );

  const balanceValue = useMemo<BalanceContextValue>(
    () => ({ balance, setBalance }),
    [balance],
  );

  return (
    <AuthContext.Provider value={authValue}>
      <RoleContext.Provider value={roleValue}>
        <BalanceContext.Provider value={balanceValue}>
          {children}
        </BalanceContext.Provider>
      </RoleContext.Provider>
    </AuthContext.Provider>
  );
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

/** Identity: user, login, logout. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Role & cabinet mode: isTrainer, isAthlete, activeMode, switchMode. */
export function useActiveMode(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useActiveMode must be used within AuthProvider');
  return ctx;
}

/** Wallet balance: balance, setBalance. */
export function useBalance(): BalanceContextValue {
  const ctx = useContext(BalanceContext);
  if (!ctx) throw new Error('useBalance must be used within AuthProvider');
  return ctx;
}
