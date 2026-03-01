import { publicApi } from './http/publicApi';

export type UserRole = 'athlete' | 'trainer' | 'both';

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RegisterDTO {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  gender?: 'male' | 'female';
}

export interface AuthResponse {
  user: {
    id: number;
    email: string;
    fullName: string;
    role: UserRole;
  };
  token: {
    type: string;
    name: string | null;
    token: string;
    abilities: string[];
    lastUsedAt: string | null;
    expiresAt: string | null;
  };
}

export interface SetRoleDTO {
  userId: number;
  role: UserRole;
}

export const authApi = {
  login: (data: LoginDTO) => publicApi.post<AuthResponse>('/login', data),
  register: (data: RegisterDTO) => publicApi.post<AuthResponse>('/register', data),

  // OAuth
  setRole: (data: SetRoleDTO) =>
    publicApi.post<{ success: boolean; user: AuthResponse['user'] }>('/oauth/set-role', data),
};

// OAuth helper to get redirect URLs
export const getOAuthRedirectUrl = (provider: 'vk' | 'yandex'): string => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3333'
  return `${apiUrl}/oauth/${provider}/redirect`
};
