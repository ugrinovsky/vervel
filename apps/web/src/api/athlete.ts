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

export interface StrengthLogDashboardMetric {
  best1RMLast30d: number | null;
  best1RMPrev30d: number | null;
  changePct: number | null;
  sessionsLast30d: number;
  lastWorkedAt: string | null;
}

export interface StrengthLogEntry {
  exerciseId: string;
  exerciseName: string;
  sessions: StrengthLogSession[];
  standardId: number | null;
  dashboardMetric: StrengthLogDashboardMetric | null;
}

export interface WeightedExerciseOption {
  exerciseId: string;
  exerciseName: string;
  /** Из ИИ / не из каталога (id вида custom:…) */
  isCustom: boolean;
}

export interface ExerciseStandardDTO {
  id: number;
  catalogExerciseId: string | null;
  displayLabel: string;
}

export interface ExerciseStandardAliasDTO {
  sourceExerciseId: string;
  standardId: number;
}

export interface StandardLinkSuggestionDTO {
  sourceExerciseId: string;
  standardId: number;
  exerciseName: string;
  standardLabel: string;
}

export interface StrengthLogPayload {
  entries: StrengthLogEntry[];
  pinnedExerciseIds: string[];
  /** Топ упражнений по числу сессий, когда закреплений ещё нет */
  suggestedPins: string[];
  /** Все упражнения с весом за год — в т.ч. custom: для ручного закрепления */
  weightedExerciseOptions: WeightedExerciseOption[];
  standards: ExerciseStandardDTO[];
  aliases: ExerciseStandardAliasDTO[];
  /** Макс. несвязанных упражнений в одном платном запросе ИИ к эталонам */
  aiStandardLinkSuggestMaxCandidates: number;
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

  getExerciseStandards: () =>
    privateApi.get<{ success: boolean; data: ExerciseStandardDTO[] }>('/progression/exercise-standards'),

  postExerciseStandard: (body: { displayLabel: string; catalogExerciseId?: string | null }) =>
    privateApi.post<{ success: boolean; data: ExerciseStandardDTO }>('/progression/exercise-standards', body),

  patchExerciseStandard: (id: number, body: { displayLabel: string }) =>
    privateApi.patch<{ success: boolean }>(`/progression/exercise-standards/${id}`, body),

  deleteExerciseStandard: (id: number) =>
    privateApi.delete<{ success: boolean }>(`/progression/exercise-standards/${id}`),

  postExerciseStandardAlias: (body: { sourceExerciseId: string; standardId: number }) =>
    privateApi.post<{ success: boolean }>('/progression/exercise-standard-aliases', body),

  removeExerciseStandardAlias: (sourceExerciseId: string) =>
    privateApi.delete<{ success: boolean }>('/progression/exercise-standard-aliases', {
      data: { sourceExerciseId },
    }),

  postAiSuggestStandardLinks: () =>
    privateApi.post<{
      success: boolean;
      data?: { suggestions: StandardLinkSuggestionDTO[]; balance: number };
      message?: string;
      balance?: number;
      required?: number;
    }>('/progression/ai-suggest-standard-links'),

  postApplyStandardAliasBatch: (
    links: Array<{ sourceExerciseId: string; standardId: number }>,
  ) =>
    privateApi.post<{
      success: boolean;
      data?: { revertId: number; applied: number };
      message?: string;
    }>('/progression/apply-standard-alias-batch', { links }),

  postRevertStandardAliasBatch: (revertId: number) =>
    privateApi.post<{ success: boolean; message?: string }>(
      `/progression/revert-standard-alias-batch/${revertId}`,
    ),
};
