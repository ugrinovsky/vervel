import { privateApi } from './http/privateApi';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: string | null;
  streakStartedAt: string | null;
  longestStreakAchievedAt: string | null;
}

export interface StreakHistoryItem {
  date: string;
  eventType:
    | 'workout_completed'
    | 'streak_continued'
    | 'streak_broken'
    | 'new_record';
  streakValue: number;
  metadata: Record<string, any> | null;
  createdAt: string;
}

export interface Achievement {
  id: number;
  key: string;
  category: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  requirementValue: number | null;
  requirementType: string | null;
  unlockedAt?: string;
  isSeen?: boolean;
  locked?: boolean;
}

export interface AchievementsData {
  unlocked: Achievement[];
  locked: Achievement[];
  totalUnlocked: number;
  totalAchievements: number;
}

export const streakApi = {
  getStreak: () =>
    privateApi.get<{ success: boolean; data: StreakData }>('/streak'),

  getHistory: (limit = 30) =>
    privateApi.get<{ success: boolean; data: StreakHistoryItem[] }>('/streak/history', {
      params: { limit },
    }),

  getAchievements: () =>
    privateApi.get<{ success: boolean; data: AchievementsData }>('/achievements'),

  checkAndUnlock: () =>
    privateApi.post<{ success: boolean; data: { newlyUnlocked: Achievement[] } }>('/achievements/check'),

  markAchievementsSeen: (achievementIds: number[]) =>
    privateApi.post<{ success: boolean; message: string }>('/achievements/seen', {
      achievementIds,
    }),
};
