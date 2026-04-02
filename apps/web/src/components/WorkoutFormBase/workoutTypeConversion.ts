import type { ExerciseData } from '@/api/trainer'
import type { AiWorkoutResult } from '@/api/ai'
import type { WorkoutType } from '@/components/WorkoutTypeTabs'

/**
 * Normalizes exercises when the workout type changes.
 * Pure function — no side effects.
 */
export function convertExercisesForType(
  exercises: ExerciseData[],
  oldType: WorkoutType,
  newType: WorkoutType,
): ExerciseData[] {
  if (oldType !== 'cardio' && newType !== 'cardio') {
    return exercises.map((ex) => {
      if (newType === 'crossfit') {
        const { setsDetail, sets: _c, blockId: _b, ...rest } = ex
        return { ...rest, reps: setsDetail?.[0]?.reps ?? ex.reps ?? 10, weight: setsDetail?.[0]?.weight ?? ex.weight }
      }
      const { wodType: _w, timeCap: _t, rounds: _r, ...rest } = ex
      if (rest.duration != null) return rest
      return {
        ...rest,
        setsDetail: [
          { reps: ex.reps ?? 10, weight: ex.weight },
          { reps: ex.reps ?? 10, weight: ex.weight },
          { reps: ex.reps ?? 10, weight: ex.weight },
        ],
      }
    })
  }

  if (newType === 'cardio') {
    return exercises.map((ex) => {
      const { setsDetail: _s, sets: _c, reps: _r, weight: _w, blockId: _b,
              wodType: _wt, timeCap: _tc, rounds: _ro, distance: _d, ...rest } = ex
      return { ...rest, duration: 20 }
    })
  }

  // cardio → strength (crossfit or bodybuilding)
  return exercises.map((ex) => {
    if (ex.duration == null) return ex
    const { duration: _d, ...rest } = ex
    if (newType === 'crossfit') return { ...rest, reps: 10 }
    return { ...rest, sets: 3, reps: 10, setsDetail: [{ reps: 10 }, { reps: 10 }, { reps: 10 }] }
  })
}

/**
 * Maps an AI workout result to ExerciseData[].
 * Pure function — no side effects.
 */
export function convertAiResult(result: AiWorkoutResult): ExerciseData[] {
  return result.exercises.map((ex, i) => {
    const base: ExerciseData = {
      exerciseId: ex.exerciseId ?? `ai-${i}`,
      name: ex.displayName ?? ex.name,
      notes: ex.notes,
    }
    if (result.workoutType === 'cardio') {
      return { ...base, duration: ex.duration ?? 20 }
    }
    if (result.workoutType === 'crossfit') {
      return { ...base, reps: ex.reps ?? 10, weight: ex.weight }
    }
    // bodybuilding
    const setsDetail = ex.setData && ex.setData.length > 0
      ? ex.setData.map((s) => ({ reps: s.reps ?? ex.reps ?? 10, weight: s.weight ?? ex.weight }))
      : Array.from({ length: ex.sets ?? 3 }, () => ({ reps: ex.reps ?? 10, weight: ex.weight }))
    return { ...base, sets: setsDetail.length, reps: ex.reps, weight: ex.weight, setsDetail }
  })
}
