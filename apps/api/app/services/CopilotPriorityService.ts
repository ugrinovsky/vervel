import { DateTime } from 'luxon'
import TrainerAthlete from '#models/trainer_athlete'
import User from '#models/user'
import ScheduledWorkout from '#models/scheduled_workout'
import Workout from '#models/workout'
import { PeriodizationService } from '#services/PeriodizationService'

export interface AthletePriorityItem {
  athleteId: number
  fullName: string | null
  photoUrl: string | null
  tsb: number
  phase: string
  daysSinceLastPlan: number
  daysSinceLastWorkout: number
  urgency: 'high' | 'medium' | 'low'
  label: string
}

export class CopilotPriorityService {
  static async list(trainerId: number): Promise<{
    needsAttention: AthletePriorityItem[]
    total: number
  }> {
    // Активные атлеты тренера
    const bindings = await TrainerAthlete.query()
      .where('trainerId', trainerId)
      .where('status', 'active')
      .whereNotNull('athleteId')
      .select('athleteId', 'nickname')

    if (bindings.length === 0) return { needsAttention: [], total: 0 }

    const athleteIds = bindings.map((b) => b.athleteId!)
    const weekStart = DateTime.now().startOf('week').toJSDate()
    const weekEnd = DateTime.now().endOf('week').toJSDate()

    // Параллельно: профили + расписание + последние тренировки
    const [users, scheduledThisWeek, lastWorkouts] = await Promise.all([
      User.query().whereIn('id', athleteIds).select('id', 'fullName', 'clientPreferences'),
      ScheduledWorkout.query()
        .where('trainerId', trainerId)
        .where('status', 'scheduled')
        .whereBetween('scheduledDate', [weekStart, weekEnd]),
      Workout.query()
        .whereIn('userId', athleteIds)
        .where('date', '>=', DateTime.now().minus({ days: 30 }).toJSDate())
        .select('userId', 'date')
        .orderBy('date', 'desc'),
    ])

    const userMap = new Map(users.map((u) => [u.id, u]))

    // Для каждого атлета — сколько дней нет плана
    const plannedAthleteIds = new Set<number>()
    for (const sw of scheduledThisWeek) {
      if (!Array.isArray(sw.assignedTo)) continue
      for (const at of sw.assignedTo) {
        if (at.type === 'athlete') plannedAthleteIds.add(at.id)
        // group — пропускаем для простоты (MVP)
      }
    }

    // Последняя тренировка по атлету
    const lastWorkoutByAthlete = new Map<number, Date>()
    for (const w of lastWorkouts) {
      if (!lastWorkoutByAthlete.has(w.userId)) {
        lastWorkoutByAthlete.set(
          w.userId,
          w.date.toJSDate ? w.date.toJSDate() : new Date(w.date.toString())
        )
      }
    }

    // Периодизацию считаем только для атлетов без плана или с высоким TSB
    // (оптимизация: не дёргаем PeriodizationService для всех)
    const needsPeriodization = athleteIds.filter((id) => !plannedAthleteIds.has(id))

    const periodizationMap = new Map<number, { tsb: number; phase: string }>()
    await Promise.all(
      needsPeriodization.slice(0, 15).map(async (id) => {
        // Ограничиваем 15 для производительности
        try {
          const p = await PeriodizationService.calculate(id, 'trainer')
          periodizationMap.set(id, {
            tsb: p.current.tsb,
            phase: p.phase.name,
          })
        } catch {
          // Нет данных — нет периодизации
        }
      })
    )

    const now = Date.now()
    const needsAttention: AthletePriorityItem[] = []

    for (const athleteId of athleteIds) {
      const user = userMap.get(athleteId)
      if (!user) continue

      const hasPlan = plannedAthleteIds.has(athleteId)
      const lastWorkout = lastWorkoutByAthlete.get(athleteId)
      const daysSinceLastWorkout = lastWorkout
        ? Math.floor((now - lastWorkout.getTime()) / (1000 * 60 * 60 * 24))
        : 999

      const p = periodizationMap.get(athleteId) ?? { tsb: 0, phase: 'maintenance' }
      const daysSinceLastPlan = hasPlan ? 0 : 7 // упрощение для MVP

      let urgency: 'high' | 'medium' | 'low' = 'low'
      let label = 'ok'

      if (!hasPlan) {
        if (p.tsb < -15 || p.tsb > 15) urgency = 'high'
        else if (daysSinceLastWorkout > 5) urgency = 'high'
        else urgency = 'medium'
        label =
          p.tsb < -15
            ? 'overload'
            : p.tsb > 15
              ? 'deload'
              : daysSinceLastWorkout > 5
                ? 'inactive'
                : 'no_plan'
      }

      const item: AthletePriorityItem = {
        athleteId,
        fullName: user.fullName,
        photoUrl: null,
        tsb: p.tsb,
        phase: p.phase,
        daysSinceLastPlan,
        daysSinceLastWorkout: Math.min(daysSinceLastWorkout, 99),
        urgency,
        label,
      }

      if (!hasPlan) needsAttention.push(item)
    }

    needsAttention.sort((a, b) => {
      const urgencyOrder = { high: 0, medium: 1, low: 2 }
      const ud = urgencyOrder[a.urgency] - urgencyOrder[b.urgency]
      if (ud !== 0) return ud
      return Math.abs(b.tsb) - Math.abs(a.tsb)
    })

    return { needsAttention, total: athleteIds.length }
  }
}
