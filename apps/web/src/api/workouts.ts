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
  type: 'strength' | 'cardio' | 'wod';
  sets?: WorkoutSet[];
  wodType?: 'amrap' | 'fortime' | 'emom' | 'tabata';
  duration?: number;
  rounds?: number;
}

export interface CreateWorkoutDTO {
  date: string;
  workoutType: 'crossfit' | 'bodybuilding' | 'cardio';
  exercises: WorkoutExercise[];
  notes?: string;
}

export const workoutsApi = {
  create: (data: CreateWorkoutDTO) => privateApi.post('/workouts', data),
  list: (page = 1, limit = 20) => privateApi.get('/workouts', { params: { page, limit } }),
  get: (id: number) => privateApi.get(`/workouts/${id}`),
  update: (id: number, data: Partial<CreateWorkoutDTO>) => privateApi.put(`/workouts/${id}`, data),
  delete: (id: number) => privateApi.delete(`/workouts/${id}`),
  stats: (from: string, to: string) => privateApi.get('/workouts/stats', { params: { from, to } }),
};
