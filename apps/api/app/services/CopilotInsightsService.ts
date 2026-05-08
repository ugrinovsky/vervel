import { PeriodizationService } from '#services/PeriodizationService'
import {
  computeOverloadedZones,
  ZONE_OVERLOAD_WINDOW_DAYS,
  COLD_START_MIN_WORKOUTS,
} from '#services/CopilotSharedRules'
import Workout from '#models/workout'

export interface CopilotInsights {
  athleteId: number
  phase: 'deload' | 'accumulation' | 'intensification' | 'peak' | 'overload' | 'maintenance'
  phaseEmoji: string
  phaseAdvice: string
  tsb: number
  atl: number
  ctl: number
  acwrZone: string
  overloadedZones: string[]
  daysSinceLastWorkout: number
  daysSinceLastPlan: number
  recentWorkoutsCount: number
  coldStart: boolean
}

const PHASE_NAME_TO_KEY: Record<string, CopilotInsights['phase']> = {
  'Deload / Восстановление': 'deload',
  'Накопление': 'accumulation',
  'Интенсификация': 'intensification',
  'Пик / Реализация': 'peak',
  'Перегрузка': 'overload',
  'Поддержание': 'maintenance',
}

export class CopilotInsightsService {
  static async collect(
    athleteId: number,
    opts: { daysSinceLastPlan?: number } = {}
  ): Promise<CopilotInsights> {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - Math.max(ZONE_OVERLOAD_WINDOW_DAYS, 14))

    const [periodization, recentWorkouts] = await Promise.all([
      PeriodizationService.calculate(athleteId, 'trainer'),
      Workout.query()
        .where('userId', athleteId)
        .where('date', '>=', cutoff)
        .select('date', 'zonesLoadAbs')
        .orderBy('date', 'desc'),
    ])

    const { current, phase, acwr } = periodization

    // Вычисляем перегруженные зоны по последним ZONE_OVERLOAD_WINDOW_DAYS дням
    const windowCutoff = new Date()
    windowCutoff.setDate(windowCutoff.getDate() - ZONE_OVERLOAD_WINDOW_DAYS)
    const windowWorkouts = recentWorkouts.filter((w) => {
      const d = w.date.toJSDate ? w.date.toJSDate() : new Date(w.date.toString())
      return d >= windowCutoff
    })

    const overloadedZones = computeOverloadedZones(
      windowWorkouts.map((w) => ({
        zonesLoadAbs: w.zonesLoadAbs,
      }))
    )

    // Дней с последней тренировки
    const lastWorkout = recentWorkouts[0]
    let daysSinceLastWorkout = 999
    if (lastWorkout) {
      const lastDate = lastWorkout.date.toJSDate
        ? lastWorkout.date.toJSDate()
        : new Date(lastWorkout.date.toString())
      daysSinceLastWorkout = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
    }

    const phaseKey = PHASE_NAME_TO_KEY[phase.name] ?? 'maintenance'

    return {
      athleteId,
      phase: phaseKey,
      phaseEmoji: phase.emoji,
      phaseAdvice: phase.advice,
      tsb: current.tsb,
      atl: current.atl,
      ctl: current.ctl,
      acwrZone: acwr.current.zone,
      overloadedZones,
      daysSinceLastWorkout,
      daysSinceLastPlan: opts.daysSinceLastPlan ?? 0,
      recentWorkoutsCount: recentWorkouts.length,
      coldStart: recentWorkouts.length < COLD_START_MIN_WORKOUTS,
    }
  }
}
