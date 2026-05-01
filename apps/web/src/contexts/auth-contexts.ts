import { createContext } from 'react';
import type { AuthContextValue, BalanceContextValue, RoleContextValue } from './auth-types';

export const AuthContext = createContext<AuthContextValue | null>(null);
export const RoleContext = createContext<RoleContextValue | null>(null);
export const BalanceContext = createContext<BalanceContextValue | null>(null);
