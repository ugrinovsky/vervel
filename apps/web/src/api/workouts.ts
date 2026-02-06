import { privateApi } from './http/privateApi'; // твой экземпляр axios

export interface WorkoutExercise {
  exerciseId: string;
  sets?: number;
  reps?: number;
  weight?: number;
  rounds?: number;
  time?: number;
  wodType?: string;
}

export interface CreateWorkoutDTO {
  date: string;
  workoutType: 'crossfit' | 'bodybuilding' | 'mixed';
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
