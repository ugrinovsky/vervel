import { privateApi } from './http/privateApi';

/**
 * Атомарная единица нагрузки (совпадает с бэкендом)
 */
export interface WorkoutSet {
  id: string;
  reps?: number;
  weight?: number;
  time?: number;
  distance?: number;
  calories?: number;
  rpe?: number;
}

/**
 * Упражнение внутри тренировки (совпадает с бэкендом)
 */
export interface WorkoutExercise {
  exerciseId: string;
  name?: string;
  type: 'strength' | 'cardio' | 'wod';
  sets?: WorkoutSet[];
  wodType?: 'amrap' | 'fortime' | 'emom' | 'tabata';
  timeCap?: number;
  duration?: number;
  rounds?: number;
  blockId?: string;
  zones?: string[];
  zoneWeights?: Record<string, number>;
  bodyweight?: boolean;
}

export interface CreateWorkoutDTO {
  date: string;
  workoutType: 'crossfit' | 'bodybuilding' | 'cardio';
  exercises: WorkoutExercise[];
  notes?: string;
  rpe?: number; // 1-5 — субъективная оценка нагрузки (Rate of Perceived Exertion)
}

export interface ZoneWorkout {
  id: number;
  date: string;
  workoutType: string;
  zoneLoad: number;
  exercises: { exerciseId: string; name: string }[];
}

export const workoutsApi = {
  create: (data: CreateWorkoutDTO) => privateApi.post('/workouts', data),
  list: (page = 1, limit = 20) => privateApi.get('/workouts', { params: { page, limit } }),
  get: (id: number) => privateApi.get(`/workouts/${id}`),
  getByScheduledId: (scheduledWorkoutId: number) =>
    privateApi.get<{ id: number; date: string; workoutType: string }>(
      `/workouts/by-scheduled/${scheduledWorkoutId}`
    ),
  update: (id: number, data: Partial<CreateWorkoutDTO>) => privateApi.put(`/workouts/${id}`, data),
  delete: (id: number) => privateApi.delete(`/workouts/${id}`),
  skip: (id: number) => privateApi.patch(`/workouts/${id}/skip`),
  stats: (from: string, to: string) => privateApi.get('/workouts/stats', { params: { from, to } }),
  byZone: (zone: string, limit = 5) =>
    privateApi.get<ZoneWorkout[]>('/workouts/by-zone', { params: { zone, limit } }),
  getDraft: () => privateApi.get<{ success: boolean; data: unknown }>('/workouts/draft'),
  saveDraft: (payload: unknown) => privateApi.put('/workouts/draft', payload),
  clearDraft: () => privateApi.delete('/workouts/draft'),
};

// ─── Athlete Copilot ──────────────────────────────────────────────────────────

export type CopilotSource = 'trainer' | 'copilot';
export type CopilotMode = 'solo' | 'with_coach';

export interface CopilotExercise {
  name: string;
  sets?: number;
  reps?: number;
  zones?: string[];
}

export interface CopilotDraftWorkoutData {
  type: 'crossfit' | 'bodybuilding' | 'cardio';
  exercises: CopilotExercise[];
  notes?: string;
}

export interface CopilotWeekItem {
  date: string;
  kind: 'train' | 'rest' | 'empty';
  title: string;
  workoutType?: 'crossfit' | 'bodybuilding' | 'cardio';
  source: CopilotSource;
  scheduledWorkoutId?: number;
  draftWorkoutData?: CopilotDraftWorkoutData;
}

export interface CopilotTodaySuggestion {
  date: string;
  title: string;
  workoutType: 'crossfit' | 'bodybuilding' | 'cardio';
  source: CopilotSource | 'rest';
  scheduledWorkoutId?: number;
  draftWorkoutData?: CopilotDraftWorkoutData;
}

export interface CopilotExplainItem {
  key: string;
  title: string;
  detail: string;
}

export interface CopilotWeekResponse {
  todaySuggestion: CopilotTodaySuggestion | null;
  weekItems: CopilotWeekItem[];
  explain: CopilotExplainItem[];
  meta: {
    mode: CopilotMode;
    coldStart: boolean;
    canSendToCoach: boolean;
    workoutFrequency: number;
    message?: string;
  };
}

export interface CopilotStartParams {
  date?: string;
  scheduledWorkoutId?: number | null;
  durationMin?: number;
  mode?: 'gym' | 'home';
}

export interface CopilotSendToCoachParams {
  weekStart?: string;
  items?: Array<{ date: string; title: string }>;
  customMessage?: string;
}

export const athleteCopilotApi = {
  getWeek: (weekStart?: string) =>
    privateApi.get<{ success: boolean; data: CopilotWeekResponse }>('/athlete/copilot/week', {
      params: weekStart ? { weekStart } : undefined,
    }),
  start: (params: CopilotStartParams) =>
    privateApi.post<{ success: boolean; data: { draft: unknown; redirectTo: string } }>(
      '/athlete/copilot/start',
      params
    ),
  sendToCoach: (params: CopilotSendToCoachParams) =>
    privateApi.post<{ success: boolean; data: { chatId: number; messageId: number } }>(
      '/athlete/copilot/send-to-coach',
      params
    ),
};
