import { MuscleZone } from './Exercise';

export interface WorkoutResult {
  _id?: string;

  userId: string;
  date: string;

  zonesLoad: Record<MuscleZone, number>;

  /** Суммарная нагрузка */
  totalLoad: number;

  /** low | medium | high */
  intensity: 'low' | 'medium' | 'high';

  createdAt: Date;
}
