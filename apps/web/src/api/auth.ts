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

export const authApi = {
  login: (data: LoginDTO) => publicApi.post<AuthResponse>('/login', data),
  register: (data: RegisterDTO) => publicApi.post<AuthResponse>('/register', data),
};
