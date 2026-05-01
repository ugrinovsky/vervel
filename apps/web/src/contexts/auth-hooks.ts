import { useContext } from 'react';
import type { AuthContextValue, BalanceContextValue, RoleContextValue } from './auth-types';
import { AuthContext, BalanceContext, RoleContext } from './auth-contexts';

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
