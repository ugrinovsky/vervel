import { useState, useCallback, useMemo, useEffect, useRef, type ReactNode } from 'react';
import { ThemeController } from '@/util/ThemeController';
import { clearAuxiliaryOAuthSessionStorage } from '@/auth/auxiliarySessionStorage';
import { setApiAccessToken } from '@/api/http/baseApi';
import type { AuthUser, AuthContextValue, BalanceContextValue, RoleContextValue } from './auth-types';
import { AuthContext, BalanceContext, RoleContext } from './auth-contexts';
import { migrateLocalOnboardingToServer } from '@/util/clientPreferencesMigration';

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
  const raw = localStorage.getItem('activeMode');
  if (raw === 'trainer' || raw === 'athlete') return raw;
  if (user?.role === 'trainer' || user?.role === 'both') return 'trainer';
  return 'athlete';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const storedUser = getStoredUser();
  const [user, setUser] = useState<AuthUser | null>(storedUser);
  const [activeMode, setActiveMode] = useState<'trainer' | 'athlete'>(() => getStoredMode(storedUser));
  const [balance, setBalance] = useState<number | null>(storedUser?.balance ?? null);

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

  const lastMigratedUserId = useRef<number | null>(null);
  useEffect(() => {
    if (!user) {
      lastMigratedUserId.current = null;
      return;
    }
    if (lastMigratedUserId.current === user.id) return;
    void migrateLocalOnboardingToServer(user, updateUser).then((ok) => {
      if (ok) lastMigratedUserId.current = user.id;
    });
  }, [user, updateUser]);

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
        <BalanceContext.Provider value={balanceValue}>{children}</BalanceContext.Provider>
      </RoleContext.Provider>
    </AuthContext.Provider>
  );
}
