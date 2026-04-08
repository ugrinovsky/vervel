import { privateApi } from './http/privateApi';

export interface ZoneState {
  intensity: number;
  lastTrainedDaysAgo: number;
  peakLoad: number;
}

export interface AvatarRecoveryStats {
  zones: Record<string, ZoneState>;
  missingWeights?: {
    workoutsCount: number;
    setsCount: number;
    lastWorkoutId: number | null;
    lastWorkoutDate: string | null;
  };
  /** Сессии без субъективной оценки нагрузки (RPE). */
  missingRpe?: {
    workoutsCount: number;
    lastWorkoutId: number | null;
    lastWorkoutDate: string | null;
  };
  totalWorkouts: number;
  lastWorkoutDaysAgo: number | null;
  allTimeWorkouts: number;
  thisWeekWorkouts: number;
}

export interface AvatarPeriodStats {
  zones: Record<string, number>;
  totalWorkouts: number;
  period: string;
}

export const avatarApi = {
  getRecoveryState: () =>
    privateApi.get<{ success: boolean; data: AvatarRecoveryStats }>('/avatar/stats', {
      params: { mode: 'recovery' },
    }),

  getZoneIntensities: (params?: {
    period?: 'day' | 'week' | 'month' | 'year' | 'all';
    from?: string;
    to?: string;
  }) =>
    privateApi.get<{ success: boolean; data: AvatarPeriodStats }>('/avatar/stats', {
      params: { mode: 'period', ...params },
    }),
};
