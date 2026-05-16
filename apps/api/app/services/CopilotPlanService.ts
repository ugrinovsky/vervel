import { DateTime } from 'luxon'
import ScheduledWorkout from '#models/scheduled_workout'
import { YandexAiService } from '#services/YandexAiService'
import type { CopilotInsights } from '#services/CopilotInsightsService'
import { clock } from '#utils/date'

export interface CopilotSuggestion {
  suggestedDates: string[]
  chatMessage: string
}

/**
 * Выбирает оптимальные свободные дни для тренировок на неделе (без AI).
 * Обязательное условие: минимум 1 день отдыха между тренировками.
 * Если нужное количество не вмещается — возвращает меньше, но без смежных дней.
 */
function pickDays(available: number[], count: number): number[] {
  if (available.length === 0 || count === 0) return []

  const sorted = [...available].sort((a, b) => a - b)
  const result: number[] = []

  for (const day of sorted) {
    const last = result[result.length - 1]
    if (last === undefined || day - last > 1) {
      result.push(day)
      if (result.length === count) break
    }
  }

  return result
}

export class CopilotPlanService {
  static async build(params: {
    trainerId: number
    athleteId: number
    weekStart: string
    insights: CopilotInsights
  }): Promise<CopilotSuggestion> {
    const { trainerId, athleteId, weekStart, insights } = params

    // Автовыбор количества тренировок по состоянию атлета
    const sessionsPerWeek =
      insights.tsb < -10 || insights.phase === 'deload'
        ? 2
        : insights.tsb > 10 || insights.phase === 'peak'
          ? 4
          : 3

    const weekStartDt = DateTime.fromISO(weekStart).setLocale('ru')
    const weekEndDt = weekStartDt.plus({ days: 6 })

    // Уже назначенные тренировки на эту неделю
    const existing = await ScheduledWorkout.query()
      .where('trainerId', trainerId)
      .where((q) => {
        q.whereRaw(`assigned_to::text like ?`, [`%"id":${athleteId}%`]).orWhereRaw(
          `assigned_to::text like ?`,
          [`%"id": ${athleteId}%`]
        )
      })
      .whereBetween('scheduledDate', [weekStartDt.toJSDate(), weekEndDt.toJSDate()])
      .where('status', 'scheduled')

    const existingOffsets = existing.map((w) => {
      const d = DateTime.fromJSDate(
        w.scheduledDate.toJSDate ? w.scheduledDate.toJSDate() : new Date(w.scheduledDate.toString())
      )
      return d.startOf('day').diff(weekStartDt.startOf('day'), 'days').days
    })

    // Блокируем прошедшие дни и уже занятые
    const todayOffset = Math.floor(
      clock.now().startOf('day').diff(weekStartDt.startOf('day'), 'days').days
    )
    const pastOffsets = Array.from({ length: Math.max(0, todayOffset) }, (_, i) => i)
    const blockedSet = new Set([...existingOffsets, ...pastOffsets])

    const availableOffsets = Array.from({ length: 7 }, (_, i) => i).filter(
      (i) => !blockedSet.has(i)
    )

    const futureExistingCount = existingOffsets.filter((o) => o >= todayOffset).length
    const freeSessions = Math.max(0, sessionsPerWeek - futureExistingCount)

    if (freeSessions === 0) {
      return { suggestedDates: [], chatMessage: 'На этой неделе все тренировки уже запланированы.' }
    }

    const pickedOffsets = pickDays(availableOffsets, freeSessions)
    const suggestedDates = pickedOffsets.map(
      (offset) => weekStartDt.plus({ days: offset }).toISODate()!
    )

    // AI генерирует только сообщение
    const DAY_NAMES = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
    const suggestedDatesLabel = suggestedDates
      .map((date) => {
        const dt = DateTime.fromISO(date).setLocale('ru')
        return dt.toLocaleString({ weekday: 'long', day: 'numeric', month: 'long' })
      })
      .join(', ')

    let chatMessage = ''
    try {
      chatMessage = await YandexAiService.generateCopilotMessage({
        tsb: insights.tsb,
        phase: insights.phase,
        overloadedZones: insights.overloadedZones,
        daysSinceLastWorkout: insights.daysSinceLastWorkout,
        suggestedDatesLabel,
      })
    } catch {
      // Не критично — тренер напишет сам
      const shortDays = pickedOffsets.map((o) => DAY_NAMES[o]).join(', ')
      chatMessage = `Привет! Запланировал тренировки на эту неделю: ${shortDays}.`
    }

    return { suggestedDates, chatMessage }
  }
}
