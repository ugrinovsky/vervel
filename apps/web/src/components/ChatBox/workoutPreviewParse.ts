import type { ExerciseData } from '@/api/trainer';
import { isRecord } from '@/utils/typeGuards';

export interface WorkoutPreviewData {
  __type: 'workout_preview';
  date: string;
  time: string;
  workoutType: 'crossfit' | 'bodybuilding' | 'cardio';
  exercises: ExerciseData[];
  notes?: string;
  scheduledWorkoutId?: number;
}

function isWorkoutPreviewData(v: unknown): v is WorkoutPreviewData {
  if (!isRecord(v)) return false;
  if (v.__type !== 'workout_preview') return false;
  if (typeof v.date !== 'string' || typeof v.time !== 'string') return false;
  const wt = v.workoutType;
  if (wt !== 'crossfit' && wt !== 'bodybuilding' && wt !== 'cardio') return false;
  if (!Array.isArray(v.exercises)) return false;
  return true;
}

export function parseWorkoutPreview(content: string): WorkoutPreviewData | null {
  try {
    const parsed: unknown = JSON.parse(content);
    return isWorkoutPreviewData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
