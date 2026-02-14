import { publicApi } from './http/publicApi';

export interface LoginDTO {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: {
    id: number;
    email: string;
    fullName: string;
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
  login: (data: LoginDTO) => publicApi.post<LoginResponse>('/login', data),
};
