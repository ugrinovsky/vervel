import { privateApi } from './http/privateApi';
import { Exercise } from '@/types/Exercise';

export const exercisesApi = {
  list: async (): Promise<Exercise[]> => {
    const res = await privateApi.get<Exercise[]>('/exercises');
    return res.data;
  },

  get: async (id: string): Promise<Exercise> => {
    const res = await privateApi.get<Exercise>(`/exercises/${id}`);
    return res.data;
  },

  // на будущее
  create: async (data: Partial<Exercise>): Promise<Exercise> => {
    const res = await privateApi.post<Exercise>('/exercises', data);
    return res.data;
  },
};
