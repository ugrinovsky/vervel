import type { ExerciseData } from '@/api/trainer'
import type { AiExercise, AiWorkoutResult } from '@/api/ai'
import type { WorkoutType } from '@/components/WorkoutTypeTabs'
import { canonicalCustomExerciseKey } from '@/utils/canonicalCustomExerciseKey'

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
    // Импорт из AI (parse-notes-text) уже приходит в формате силовой: полный setsDetail.
    // Раньше при oldType===newType===bodybuilding мы всё равно затирали setsDetail тремя копиями
    // из ex.reps/ex.weight (часто null у ИИ) → пустые кг и «10» вместо реальных повторов.
    if (oldType === newType) return exercises

    return exercises.map((ex) => {
      if (newType === 'crossfit') {
        const { setsDetail, sets: _c, blockId: _b, ...rest } = ex
        return {
          ...rest,
          reps: setsDetail?.[0]?.reps ?? ex.reps ?? 10,
          weight: setsDetail?.[0]?.weight ?? ex.weight,
          // сохраняем подходы — при переключении обратно на силовую данные не потеряются
          setsDetail: setsDetail?.length ? setsDetail : undefined,
        }
      }
      const { wodType: _w, timeCap: _t, rounds: _r, ...rest } = ex
      if (rest.duration != null) return rest
      if (rest.setsDetail && rest.setsDetail.length > 0) {
        return { ...rest, sets: rest.setsDetail.length }
      }
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
  return convertAiExercises(result.exercises, result.workoutType)
}

export function convertAiExercises(
  exercises: AiExercise[],
  workoutType: WorkoutType,
): ExerciseData[] {
  // Map supersetGroup letter → shared blockId UUID
  const supersetBlockIds = new Map<string, string>()

  return exercises.map((ex) => {
    const base: ExerciseData = {
      exerciseId:
        ex.exerciseId ?? `custom:${canonicalCustomExerciseKey(ex.displayName ?? ex.name)}`,
      name: ex.displayName ?? ex.name,
      notes: ex.notes,
      zones: ex.zones && ex.zones.length > 0 ? ex.zones : undefined,
      zoneWeights:
        ex.zoneWeights && Object.keys(ex.zoneWeights).length > 0 ? ex.zoneWeights : undefined,
    }

    // Assign blockId for superset grouping (bodybuilding only)
    if (ex.supersetGroup && workoutType === 'bodybuilding') {
      if (!supersetBlockIds.has(ex.supersetGroup)) {
        supersetBlockIds.set(ex.supersetGroup, crypto.randomUUID())
      }
      base.blockId = supersetBlockIds.get(ex.supersetGroup)
    }

    if (workoutType === 'cardio') {
      return { ...base, duration: ex.duration ?? 20 }
    }
    if (workoutType === 'crossfit') {
      return { ...base, reps: ex.reps ?? 10, weight: ex.weight }
    }
    // bodybuilding
    const setsDetail = ex.setData && ex.setData.length > 0
      ? ex.setData.map((s) => ({ reps: s.reps ?? ex.reps ?? 10, weight: s.weight ?? ex.weight }))
      : Array.from({ length: ex.sets ?? 3 }, () => ({ reps: ex.reps ?? 10, weight: ex.weight }))
    return { ...base, sets: setsDetail.length, reps: ex.reps, weight: ex.weight, setsDetail }
  })
}
