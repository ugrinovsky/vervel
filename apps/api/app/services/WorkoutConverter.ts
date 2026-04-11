import type { WorkoutExercise, WorkoutSet } from '#models/workout'
import type { AiExercise } from '#services/YandexAiService'
import { canonicalCustomExerciseKey } from '#services/exercise_match_helpers'

export interface ExerciseData {
  exerciseId?: string
  name: string
  sets?: number
  reps?: number
  weight?: number
  duration?: number
  notes?: string
  blockId?: string
  /** AI-provided zones (used when exerciseId is custom:* or missing in catalog) */
  zones?: string[]
  /** Bodyweight movement — weight can be omitted/0 */
  bodyweight?: boolean
}

/**
 * Convert simplified ExerciseData (from trainer form / scheduled workouts) to
 * WorkoutExercise format required by WorkoutCalculator.
 * Skips exercises without exerciseId.
 */
export function toWorkoutExercises(
  exercises: ExerciseData[],
  workoutType: 'crossfit' | 'bodybuilding' | 'cardio'
): WorkoutExercise[] {
  return exercises
    .filter((ex) => !!ex.exerciseId)
    .map((ex) => {
      if (workoutType === 'cardio') {
        const set: WorkoutSet = { id: crypto.randomUUID(), time: (ex.duration ?? 20) * 60 }
        return {
          exerciseId: ex.exerciseId!,
          name: ex.name,
          zones: ex.zones && ex.zones.length > 0 ? ex.zones : undefined,
          type: 'cardio' as const,
          sets: [set],
          blockId: ex.blockId,
          bodyweight: ex.bodyweight,
        }
      }
      const sets: WorkoutSet[] = Array.from({ length: ex.sets ?? 3 }, () => ({
        id: crypto.randomUUID(),
        reps: ex.reps,
        weight: ex.weight,
      }))
      return {
        exerciseId: ex.exerciseId!,
        name: ex.name,
        zones: ex.zones && ex.zones.length > 0 ? ex.zones : undefined,
        type: workoutType === 'crossfit' ? ('wod' as const) : ('strength' as const),
        sets,
        blockId: ex.blockId,
        bodyweight: ex.bodyweight,
      }
    })
}

/**
 * Convert AiExercise[] (after catalog matching) to WorkoutExercise[] for
 * saving in Workout. Preserves zones, superset groups, and per-set data.
 */
export function aiExercisesToWorkoutExercises(
  exercises: AiExercise[],
  workoutType: 'crossfit' | 'bodybuilding' | 'cardio'
): WorkoutExercise[] {
  return exercises.map((ex) => {
    const exerciseId =
      ex.exerciseId ?? `custom:${canonicalCustomExerciseKey(ex.displayName ?? ex.name)}`
    const name = ex.displayName ?? ex.name
    const zones = ex.zones && ex.zones.length > 0 ? ex.zones : undefined
    const zoneWeights =
      ex.zoneWeights && Object.keys(ex.zoneWeights).length > 0 ? ex.zoneWeights : undefined

    if (workoutType === 'cardio') {
      const set: WorkoutSet = { id: crypto.randomUUID(), time: (ex.duration ?? 20) * 60 }
      return {
        exerciseId,
        name,
        zones,
        zoneWeights,
        type: 'cardio' as const,
        sets: [set],
        blockId: ex.supersetGroup ?? undefined,
      }
    }

    const sets: WorkoutSet[] = ex.setData?.length
      ? ex.setData.map((s) => ({
          id: crypto.randomUUID(),
          reps: s.reps,
          weight: s.weight,
        }))
      : Array.from({ length: ex.sets ?? 3 }, () => ({
          id: crypto.randomUUID(),
          reps: ex.reps,
          weight: ex.weight,
        }))

    return {
      exerciseId,
      name,
      zones,
      zoneWeights,
      type: workoutType === 'crossfit' ? ('wod' as const) : ('strength' as const),
      sets,
      blockId: ex.supersetGroup ?? undefined,
    }
  })
}
