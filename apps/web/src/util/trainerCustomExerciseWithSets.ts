import type { ExerciseSet, ExerciseWithSets } from '@/types/Exercise';

/** Сохранённые тренером названия попадают в exerciseId как `custom:<displayName>` (как в CustomExercisePicker). */
export function buildTrainerCustomExerciseWithSets(
  workoutType: string,
  displayName: string,
  newId: () => string = () => crypto.randomUUID()
): ExerciseWithSets {
  const isCardio = workoutType === 'cardio';
  const sets: ExerciseSet[] = isCardio
    ? [{ id: newId(), reps: 1, weight: 0 }]
    : [
        { id: newId(), reps: 10, weight: 0 },
        { id: newId(), reps: 10, weight: 0 },
        { id: newId(), reps: 10, weight: 0 },
      ];
  return {
    exerciseId: `custom:${displayName}`,
    title: displayName,
    sets,
    duration: isCardio ? 20 : undefined,
  };
}
