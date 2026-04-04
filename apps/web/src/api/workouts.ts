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
  getByScheduledId: (scheduledWorkoutId: number) => privateApi.get(`/workouts/by-scheduled/${scheduledWorkoutId}`),
  update: (id: number, data: Partial<CreateWorkoutDTO>) => privateApi.put(`/workouts/${id}`, data),
  delete: (id: number) => privateApi.delete(`/workouts/${id}`),
  stats: (from: string, to: string) => privateApi.get('/workouts/stats', { params: { from, to } }),
  byZone: (zone: string, limit = 5) =>
    privateApi.get<ZoneWorkout[]>('/workouts/by-zone', { params: { zone, limit } }),
  getDraft: () => privateApi.get<{ success: boolean; data: Record<string, any> | null }>('/workouts/draft'),
  saveDraft: (payload: Record<string, any>) => privateApi.put('/workouts/draft', payload),
  clearDraft: () => privateApi.delete('/workouts/draft'),
};
