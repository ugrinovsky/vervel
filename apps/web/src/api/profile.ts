import { privateApi } from './http/privateApi';

export interface ProfileData {
  user: {
    id: number;
    fullName: string | null;
    email: string;
    createdAt: string;
  };
  stats: {
    totalWorkouts: number;
    streak: number;
    topZones: Array<{ zone: string; total: number }>;
  };
}

export const profileApi = {
  getProfile: () =>
    privateApi.get<{ success: boolean; data: ProfileData }>('/profile'),

  updateProfile: (data: { fullName?: string; email?: string }) =>
    privateApi.put<{ success: boolean; data: { user: ProfileData['user'] } }>('/profile', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    privateApi.put<{ success: boolean; message: string }>('/profile/password', data),
};
