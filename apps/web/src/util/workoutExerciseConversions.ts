import type { ExerciseData } from '@/api/trainer';
import type { WorkoutExercise, WorkoutSet } from '@/api/workouts';
import type { WorkoutType } from '@/components/WorkoutTypeTabs';
import type { ExerciseWithSets } from '@/types/Exercise';
import { canonicalCustomExerciseKey } from '@/utils/canonicalCustomExerciseKey';

function makeSet(partial: Omit<WorkoutSet, 'id'>): WorkoutSet {
  return { id: crypto.randomUUID(), ...partial };
}

function pickedExerciseIdString(id: number | string): string {
  return typeof id === 'number' ? String(id) : id;
}

/** Выбор из каталога (ExercisePicker) → ExerciseData для редактора формы */
export function exerciseWithSetsToExerciseData(
  picked: ExerciseWithSets,
  workoutType: WorkoutType
): ExerciseData {
  const name = picked.title;
  const exerciseId = pickedExerciseIdString(picked.exerciseId);

  if (workoutType === 'cardio') {
    return {
      name,
      exerciseId,
      duration: picked.duration ?? 20,
      bodyweight: picked.bodyweight,
    };
  }

  if (workoutType === 'bodybuilding') {
    const setsDetail =
      picked.sets.length > 0
        ? picked.sets.map((s) => ({ reps: s.reps, weight: s.weight }))
        : [
            { reps: 10, weight: 0 },
            { reps: 10, weight: 0 },
            { reps: 10, weight: 0 },
          ];
    return {
      name,
      exerciseId,
      bodyweight: picked.bodyweight,
      sets: setsDetail.length,
      setsDetail,
    };
  }

  const first = picked.sets[0];
  return {
    name,
    exerciseId,
    bodyweight: picked.bodyweight,
    reps: first?.reps ?? 10,
    weight: picked.bodyweight ? 0 : (first?.weight ?? 0),
  };
}

/** Выбор из каталога при редактировании сохранённой тренировки → WorkoutExercise */
export function exerciseWithSetsToWorkoutExercise(
  picked: ExerciseWithSets,
  workoutType: WorkoutType
): WorkoutExercise {
  const exerciseId = pickedExerciseIdString(picked.exerciseId);
  const shared = {
    exerciseId,
    bodyweight: picked.bodyweight,
  };

  if (workoutType === 'cardio') {
    const minutes = picked.duration ?? 20;
    const seconds = minutes * 60;
    return {
      ...shared,
      type: 'cardio' as const,
      sets: [makeSet({ time: seconds })],
      duration: seconds,
    };
  }

  if (workoutType === 'bodybuilding') {
    const sets: WorkoutSet[] =
      picked.sets.length > 0
        ? picked.sets.map((s) =>
            makeSet({
              reps: s.reps,
              weight: picked.bodyweight ? 0 : s.weight,
            })
          )
        : [makeSet({ reps: 10, weight: 0 })];
    return {
      ...shared,
      type: 'strength' as const,
      sets,
    };
  }

  const sets: WorkoutSet[] =
    picked.sets.length > 0
      ? picked.sets.map((s) =>
          makeSet({
            reps: s.reps,
            weight: picked.bodyweight ? 0 : s.weight,
          })
        )
      : [makeSet({ reps: 10, weight: 0 })];

  return {
    ...shared,
    type: 'wod',
    sets,
  };
}

/**
 * Форма атлета (ExerciseData) → payload POST /workouts (совпадает с валидатором API).
 */
export function exerciseDataToWorkoutExercise(
  ex: ExerciseData,
  workoutType: WorkoutType
): WorkoutExercise {
  const exerciseId = ex.exerciseId ?? `custom:${canonicalCustomExerciseKey(ex.name)}`;
  const zones = ex.zones && ex.zones.length > 0 ? ex.zones : undefined;
  const zoneWeights =
    ex.zoneWeights && Object.keys(ex.zoneWeights).length > 0 ? ex.zoneWeights : undefined;

  const shared = {
    exerciseId,
    name: ex.name,
    zones,
    zoneWeights,
    blockId: ex.blockId,
    bodyweight: ex.bodyweight,
  };

  if (workoutType === 'cardio') {
    const minutes = ex.duration ?? 20;
    const seconds = minutes * 60;
    return {
      ...shared,
      type: 'cardio' as const,
      sets: [makeSet({ time: seconds })],
      duration: seconds,
    };
  }

  if (workoutType === 'bodybuilding') {
    if (ex.setsDetail && ex.setsDetail.length > 0) {
      return {
        ...shared,
        type: 'strength' as const,
        sets: ex.setsDetail.map((s) => makeSet({ reps: s.reps, weight: s.weight })),
      };
    }
    const n = ex.sets ?? 3;
    return {
      ...shared,
      type: 'strength' as const,
      sets: Array.from({ length: n }, () =>
        makeSet({ reps: ex.reps ?? 10, weight: ex.weight })
      ),
    };
  }

  // crossfit → wod
  const sets: WorkoutSet[] =
    ex.setsDetail && ex.setsDetail.length > 0
      ? ex.setsDetail.map((s) => makeSet({ reps: s.reps, weight: s.weight }))
      : [makeSet({ reps: ex.reps ?? 10, weight: ex.weight ?? 0 })];

  const out: WorkoutExercise = {
    ...shared,
    type: 'wod',
    sets,
    wodType: ex.wodType,
    rounds: ex.rounds,
  };

  if (ex.duration != null) {
    out.duration = ex.duration * 60;
  }

  return out;
}
