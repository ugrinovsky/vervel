import { apiClient } from './apiClient';
import { Exercise } from '@/types/Exercise';

export async function getExercises(): Promise<Exercise[]> {
  const res = await apiClient.get<Exercise[]>('/exercises');
  return res.data;
}
