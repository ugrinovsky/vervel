import type { ExerciseData } from '#models/workout_template'
import { isRecord } from '#utils/type_guards'

/**
 * Допустимые значения `workoutData.type` для запланированных тренировок (календарь тренера).
 * Единый список для валидаторов и проверок — не дублировать массив в контроллерах.
 */
export const SCHEDULED_WORKOUT_JSON_TYPES = [
  'crossfit',
  'bodybuilding',
  'cardio',
  'intro',
  'rest_day',
] as const

export type ScheduledWorkoutJsonType = (typeof SCHEDULED_WORKOUT_JSON_TYPES)[number]

const TYPE_SET: ReadonlySet<string> = new Set(SCHEDULED_WORKOUT_JSON_TYPES)

export function isScheduledWorkoutJsonType(value: string): value is ScheduledWorkoutJsonType {
  return TYPE_SET.has(value)
}

/** Тело `workoutData` в POST/PATCH календаря (все JSON-типы, не путать с {@link ScheduledWorkoutData} для fan-out). */
export type ScheduledWorkoutCalendarPayload = {
  type: ScheduledWorkoutJsonType
  exercises: ExerciseData[]
  notes?: string
  duration?: number
}

export function isScheduledWorkoutCalendarPayload(
  v: unknown
): v is ScheduledWorkoutCalendarPayload {
  if (!isRecord(v)) return false
  if (typeof v.type !== 'string' || !isScheduledWorkoutJsonType(v.type)) return false
  if (!Array.isArray(v.exercises)) return false
  return true
}
