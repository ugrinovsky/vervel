import { privateApi } from './http/privateApi';

export interface ProfileUser {
  id: number;
  fullName: string | null;
  email: string;
  role: string;
  gender: 'male' | 'female' | null;
  createdAt: string;
  bio: string | null;
  specializations: string[] | null;
  education: string | null;
  photoUrl: string | null;
  balance: number;
  themeHue: number | null;
  donatePhone: string | null;
  donateCard: string | null;
  donateYookassaLink: string | null;
}

export interface ProfileData {
  user: ProfileUser;
  stats: {
    totalWorkouts: number;
    streak: number;
    longestStreak: number;
    topZones: Array<{ zone: string; total: number }>;
    streakMode: 'simple' | 'intensive';
    currentWeekWorkouts: number;
    weeklyRequired: number;
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
  donatePhone: string | null;
  donateCard: string | null;
  donateYookassaLink: string | null;
}

export const profileApi = {
  getProfile: () =>
    privateApi.get<{ success: boolean; data: ProfileData }>('/profile'),

  updateProfile: (data: {
    fullName?: string;
    email?: string;
    gender?: 'male' | 'female' | null;
    bio?: string;
    specializations?: string[];
    education?: string;
    themeHue?: number | null;
    donatePhone?: string | null;
    donateCard?: string | null;
    donateYookassaLink?: string | null;
  }) =>
    privateApi.put<{ success: boolean; data: { user: ProfileUser } }>('/profile', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    privateApi.put<{ success: boolean; message: string }>('/profile/password', data),

  becomeAthlete: () =>
    privateApi.post<{ success: boolean; data: { user: ProfileUser } }>('/profile/become-athlete'),

  becomeTrainer: () =>
    privateApi.post<{ success: boolean; data: { user: ProfileUser } }>('/profile/become-trainer'),

  uploadPhoto: (file: File) => {
    const form = new FormData();
    form.append('photo', file);
    return privateApi.post<{ success: boolean; data: { photoUrl: string } }>('/profile/photo', form, {
      headers: { 'Content-Type': undefined },
    });
  },

  getTrainerPublicProfile: (trainerId: number) =>
    privateApi.get<{ success: boolean; data: TrainerPublicProfile }>(
      `/athlete/trainers/${trainerId}/profile`
    ),

  sendFeedback: (data: { type: 'general' | 'bug' | 'feature' | 'other'; message: string; contact?: string }) =>
    privateApi.post<{ success: boolean; message: string }>('/feedback', data),
};
