import { privateApi } from './http/privateApi';

export interface ProfileUser {
  id: number;
  fullName: string | null;
  email: string;
  role: string;
  createdAt: string;
}

export interface ProfileData {
  user: ProfileUser;
  stats: {
    totalWorkouts: number;
    streak: number;
    longestStreak: number;
    topZones: Array<{ zone: string; total: number }>;
  };
}

export const profileApi = {
  getProfile: () =>
    privateApi.get<{ success: boolean; data: ProfileData }>('/profile'),

  updateProfile: (data: { fullName?: string; email?: string }) =>
    privateApi.put<{ success: boolean; data: { user: ProfileUser } }>('/profile', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    privateApi.put<{ success: boolean; message: string }>('/profile/password', data),

  becomeAthlete: () =>
    privateApi.post<{ success: boolean; data: { user: ProfileUser } }>('/profile/become-athlete'),
};
