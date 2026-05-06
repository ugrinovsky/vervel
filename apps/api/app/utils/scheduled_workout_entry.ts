import ScheduledWorkout from '#models/scheduled_workout'
import { isRecord } from '#utils/type_guards'

/** Тип записи в JSON workoutData (в т.ч. intro / rest_day, не отражённые в узком типе модели). */
export function scheduledWorkoutEntryType(w: ScheduledWorkout): string {
  const raw: unknown = w.workoutData
  if (typeof raw === 'string') {
    try {
      const p: unknown = JSON.parse(raw)
      if (!isRecord(p)) return 'crossfit'
      const t = p.type
      return typeof t === 'string' ? t : 'crossfit'
    } catch {
      return 'crossfit'
    }
  }
  if (isRecord(raw) && 'type' in raw) {
    const t = raw.type
    return typeof t === 'string' ? t : 'crossfit'
  }
  return 'crossfit'
}

export function isScheduledRestDay(w: ScheduledWorkout): boolean {
  return scheduledWorkoutEntryType(w) === 'rest_day'
}
