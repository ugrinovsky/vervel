import type { ExerciseData } from '@/api/trainer';
import type { WorkoutExercise } from '@/api/workouts';
import type { WorkoutType } from '@/components/WorkoutTypeTabs';
import type { ExerciseWithSets } from '@/types/Exercise';

/**
 * Выбор из каталога → черновик ExerciseData (минуты кардио, как в форме).
 * Используется WorkoutExercisesEditor и вставка в лист атлета.
 */
export function exerciseWithSetsToExerciseData(
  ex: ExerciseWithSets,
  workoutType: WorkoutType
): ExerciseData {
  if (workoutType === 'cardio') {
    return { exerciseId: String(ex.exerciseId), name: ex.title, duration: ex.duration ?? 20 };
  }
  if (workoutType === 'crossfit') {
    return { exerciseId: String(ex.exerciseId), name: ex.title, reps: ex.sets?.[0]?.reps ?? 10 };
  }
  const setsDetail = ex.sets?.length
    ? ex.sets.map((s) => ({ reps: s.reps, weight: s.weight || undefined }))
    : [{ reps: 10 }, { reps: 10 }, { reps: 10 }];
  return {
    exerciseId: String(ex.exerciseId),
    name: ex.title,
    sets: setsDetail.length,
    reps: setsDetail[0]?.reps ?? 10,
    setsDetail,
  };
}

/**
 * ExerciseData → тело PATCH/POST тренировки. Кардио: duration в API в секундах (в форме — минуты).
 */
export function exerciseDataToWorkoutExercise(
  ex: ExerciseData,
  workoutType: WorkoutType
): WorkoutExercise {
  if (workoutType === 'cardio') {
    const minutes = ex.duration ?? 20;
    return {
      exerciseId: ex.exerciseId!,
      name: ex.name,
      zones: ex.zones,
      type: 'cardio',
      duration: minutes * 60,
    };
  }
  if (workoutType === 'crossfit') {
    return {
      exerciseId: ex.exerciseId!,
      name: ex.name,
      zones: ex.zones,
      type: 'wod',
      wodType: ex.wodType,
      timeCap: ex.timeCap,
      rounds: ex.rounds,
      bodyweight: ex.bodyweight,
      sets: [{ id: crypto.randomUUID(), reps: ex.reps ?? 0, weight: ex.bodyweight ? undefined : (ex.weight ?? 0) }],
    };
  }
  return {
    exerciseId: ex.exerciseId!,
    name: ex.name,
    zones: ex.zones,
    type: 'strength',
    bodyweight: ex.bodyweight,
    sets: (ex.setsDetail ?? []).map((s) => ({
      id: crypto.randomUUID(),
      reps: s.reps ?? 0,
      weight: ex.bodyweight ? undefined : (s.weight ?? 0),
    })),
    blockId: ex.blockId,
  };
}

/** Каталог → сразу формат API тренировки (атлетский sheet, создание тренировки). */
export function exerciseWithSetsToWorkoutExercise(
  picked: ExerciseWithSets,
  workoutType: WorkoutType
): WorkoutExercise {
  return exerciseDataToWorkoutExercise(exerciseWithSetsToExerciseData(picked, workoutType), workoutType);
}
