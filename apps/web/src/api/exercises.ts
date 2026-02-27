import { privateApi } from './http/privateApi';
import { Exercise, ExerciseFull } from '@/types/Exercise';

export const exercisesApi = {
  list: async (): Promise<Exercise[]> => {
    const res = await privateApi.get<Exercise[]>('/exercises');
    return res.data;
  },

  get: async (id: string): Promise<ExerciseFull> => {
    const res = await privateApi.get<ExerciseFull>(`/exercises/${id}`);
    return res.data;
  },
};
