import type { ExerciseData } from '@/api/trainer';
import type { WorkoutType } from '@/components/WorkoutTypeTabs';

export function normalizeExerciseForType(type: WorkoutType, ex: ExerciseData): ExerciseData {
  if (type === 'cardio') return ex;
  if (type === 'crossfit') {
    const { setsDetail: _s, sets: _c, blockId: _b, ...rest } = ex;
    return { ...rest, reps: ex.reps ?? ex.setsDetail?.[0]?.reps ?? 10 };
  }
  if (ex.duration != null) return ex;
  return {
    ...ex,
    setsDetail: ex.setsDetail?.length
      ? ex.setsDetail
      : Array.from({ length: ex.sets ?? 3 }, () => ({ reps: ex.reps ?? 10, weight: ex.weight })),
  };
}

export function normalizeExercisesForType(type: WorkoutType, exs: ExerciseData[]): ExerciseData[] {
  return exs.map((ex) => normalizeExerciseForType(type, ex));
}
