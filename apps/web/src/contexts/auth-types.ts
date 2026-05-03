import type { UserRole } from '@/api/auth';
import type { ClientPreferences } from '@/types/clientPreferences';

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
  /** Настройки клиента с сервера (онбординг, подсказки UI) — следуют за аккаунтом. */
  clientPreferences?: ClientPreferences;
}

export interface AuthContextValue {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  updateUser: (user: AuthUser) => void;
  logout: () => void;
}

export interface RoleContextValue {
  isTrainer: boolean;
  isAthlete: boolean;
  /** Current active cabinet when role === 'both'. Otherwise matches the single role. */
  activeMode: 'trainer' | 'athlete';
  switchMode: () => void;
}

export interface BalanceContextValue {
  /** Wallet balance in rubles — for AI features, donations. null = not yet loaded. */
  balance: number | null;
  setBalance: (balance: number) => void;
}
