import { privateApi } from './http/privateApi';

export interface ProfileUser {
  id: number;
  fullName: string | null;
  email: string;
  role: string;
  createdAt: string;
  bio: string | null;
  specializations: string[] | null;
  education: string | null;
  photoUrl: string | null;
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

export interface TrainerPublicProfile {
  id: number;
  fullName: string | null;
  email: string;
  bio: string | null;
  specializations: string[] | null;
  education: string | null;
  photoUrl: string | null;
}

export const profileApi = {
  getProfile: () =>
    privateApi.get<{ success: boolean; data: ProfileData }>('/profile'),

  updateProfile: (data: {
    fullName?: string;
    email?: string;
    bio?: string;
    specializations?: string[];
    education?: string;
  }) =>
    privateApi.put<{ success: boolean; data: { user: ProfileUser } }>('/profile', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    privateApi.put<{ success: boolean; message: string }>('/profile/password', data),

  becomeAthlete: () =>
    privateApi.post<{ success: boolean; data: { user: ProfileUser } }>('/profile/become-athlete'),

  uploadPhoto: (file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return privateApi.post<{ success: boolean; data: { photoUrl: string } }>('/profile/photo', form);
  },

  getTrainerPublicProfile: (trainerId: number) =>
    privateApi.get<{ success: boolean; data: TrainerPublicProfile }>(
      `/athlete/trainers/${trainerId}/profile`
    ),
};
