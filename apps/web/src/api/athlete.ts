import { privateApi } from './http/privateApi';
import { publicApi } from './http/publicApi';
import type { PeriodizationData, LeaderboardEntry, LeaderboardResponse } from './trainer';

export interface StrengthLogSession {
  date: string;
  workoutId: number;
  sets: { reps?: number; weight?: number }[];
  /** Условный 1RM (Эпли), макс. по подходам сессии — с бэкенда */
  best1RM: number | null;
}

export interface StrengthLogEntry {
  exerciseId: string;
  exerciseName: string;
  sessions: StrengthLogSession[];
}

export interface WeightedExerciseOption {
  exerciseId: string;
  exerciseName: string;
  /** Из ИИ / не из каталога (id вида custom:…) */
  isCustom: boolean;
}

export interface StrengthLogPayload {
  entries: StrengthLogEntry[];
  pinnedExerciseIds: string[];
  /** Топ упражнений по числу сессий, когда закреплений ещё нет */
  suggestedPins: string[];
  /** Все упражнения с весом за год — в т.ч. custom: для ручного закрепления */
  weightedExerciseOptions: WeightedExerciseOption[];
}

export interface ExerciseDashboardMetric {
  exerciseId: string;
  exerciseName: string;
  best1RMLast30d: number | null;
  best1RMPrev30d: number | null;
  changePct: number | null;
  sessionsLast30d: number;
  lastWorkedAt: string | null;
}

export interface ExerciseDashboardPayload {
  metrics: ExerciseDashboardMetric[];
  trackedExerciseIds: string[];
  weightedExerciseOptions: WeightedExerciseOption[];
}

export interface AthleteGroup {
  id: number;
  name: string;
  trainer: {
    id: number;
    fullName: string | null;
    email: string;
  };
  memberCount: number;
  chatId: number | null;
}

export interface AthleteTrainer {
  id: number;
  fullName: string | null;
  email: string;
  chatId: number | null;
  bio: string | null;
  specializations: string[] | null;
  photoUrl: string | null;
}

export const athleteApi = {
  getMyGroups: () =>
    privateApi.get<{ success: boolean; data: AthleteGroup[] }>('/athlete/my-groups'),

  getMyTrainers: () =>
    privateApi.get<{ success: boolean; data: AthleteTrainer[] }>('/athlete/my-trainers'),

  getGroupChat: (groupId: number) =>
    privateApi.get<{ success: boolean; data: { chatId: number } }>(
      `/athlete/chats/group/${groupId}`
    ),

  getTrainerChat: (trainerId: number) =>
    privateApi.get<{ success: boolean; data: { chatId: number } }>(
      `/athlete/chats/trainer/${trainerId}`
    ),

  getUnreadCounts: () =>
    privateApi.get<{ success: boolean; data: { total: number; chats: { chatId: number; unread: number }[] } }>('/athlete/unread-counts'),

  getUpcomingWorkouts: () =>
    privateApi.get<{
      success: boolean;
      data: Array<{
        id: number;
        date: string;
        workoutType: string;
        exerciseCount: number;
        notes: string | null;
      }>;
    }>('/athlete/upcoming-workouts'),

  getInviteInfo: (token: string) =>
    publicApi.get<{
      success: boolean;
      data: { trainerName: string; trainerPhotoUrl: string | null; trainerSpecializations: string[] | null };
    }>(`/invite/info/${token}`),

  acceptInvite: (token: string) =>
    privateApi.post<{ success: boolean; message: string }>('/invite/accept', { token }),

  getMyPeriodization: () =>
    privateApi.get<{ success: boolean; data: PeriodizationData }>('/athlete/periodization'),

  getGroupLeaderboard: (groupId: number, period: 7 | 30 = 30) =>
    privateApi.get<{ success: boolean; data: LeaderboardResponse }>(
      `/athlete/groups/${groupId}/leaderboard?period=${period}`
    ),

  getStrengthLog: () =>
    privateApi.get<{ success: boolean; data: StrengthLogPayload }>('/progression/strength-log'),

  putStrengthLogPins: (exerciseIds: string[]) =>
    privateApi.put<{ success: boolean; data: StrengthLogPayload }>('/progression/strength-log/pins', {
      exerciseIds,
    }),

  getExerciseDashboard: () =>
    privateApi.get<{ success: boolean; data: ExerciseDashboardPayload }>('/progression/exercise-dashboard'),

  putExerciseDashboard: (exerciseIds: string[]) =>
    privateApi.put<{ success: boolean; data: ExerciseDashboardPayload }>('/progression/exercise-dashboard', {
      exerciseIds,
    }),
};
