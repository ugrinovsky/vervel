import { DateTime } from 'luxon'
import ScheduledWorkout from '#models/scheduled_workout'
import { ExerciseCatalog } from '#services/ExerciseCatalog'
import {
  adjustedSessions,
  recommendedBlock,
  SESSIONS_DAY_OFFSETS,
  UPPER_ZONES,
  LOWER_ZONES,
  CORE_ZONES,
} from '#services/CopilotSharedRules'
import type { CopilotInsights } from '#services/CopilotInsightsService'
import { isRecord } from '#utils/type_guards'

export type WorkoutKind = 'train' | 'rest' | 'empty'

export interface WeekItem {
  date: string
  kind: WorkoutKind
  title: string
  workoutType?: 'crossfit' | 'bodybuilding' | 'cardio'
  source: 'trainer' | 'copilot'
  scheduledWorkoutId?: number
  draftWorkoutData?: {
    type: 'crossfit' | 'bodybuilding' | 'cardio'
    exercises: Array<{
      name: string
      sets?: number
      reps?: number
      zones?: string[]
    }>
    notes?: string
  }
}

export interface TodaySuggestion {
  date: string
  title: string
  workoutType: 'crossfit' | 'bodybuilding' | 'cardio'
  source: 'trainer' | 'copilot' | 'rest'
  scheduledWorkoutId?: number
  draftWorkoutData?: WeekItem['draftWorkoutData']
}

export interface AthleteCopilotPlan {
  todaySuggestion: TodaySuggestion | null
  weekItems: WeekItem[]
  explain: Array<{ key: string; title: string; detail: string }>
}

// Названия мышечных блоков на русском
const BLOCK_LABELS = {
  upper: 'Верх тела',
  lower: 'Ноги',
  core: 'Кор',
  cardio: 'Кардио',
} as const

export class AthleteCopilotPlanService {
  private static isExerciseLike(
    v: unknown
  ): v is { name: string; sets?: number; reps?: number; zones?: string[] } {
    if (!isRecord(v)) return false
    if (typeof v.name !== 'string' || !v.name) return false
    if ('sets' in v && v.sets !== undefined && typeof v.sets !== 'number') return false
    if ('reps' in v && v.reps !== undefined && typeof v.reps !== 'number') return false
    const zonesValue = v['zones']
    if (zonesValue !== undefined && !Array.isArray(zonesValue)) return false
    if (Array.isArray(zonesValue) && !zonesValue.every((z) => typeof z === 'string')) return false
    return true
  }

  static async build(params: {
    athleteId: number
    trainerId: number | null
    weekStart: string
    workoutFrequency: number
    insights: CopilotInsights
  }): Promise<AthleteCopilotPlan> {
    const { athleteId, trainerId, weekStart, workoutFrequency, insights } = params

    const weekStartDt = DateTime.fromISO(weekStart)
    const weekEndDt = weekStartDt.plus({ days: 6 })
    const todayStr = DateTime.now().toISODate() ?? DateTime.now().toFormat('yyyy-LL-dd')

    // Тренерские назначения на неделю (приоритет)
    let trainerItems: WeekItem[] = []
    if (trainerId) {
      const scheduled = await ScheduledWorkout.query()
        .where('trainerId', trainerId)
        .where((q) => {
          q.whereRaw(`assigned_to::text like ?`, [`%"id":${athleteId}%`]).orWhereRaw(
            `assigned_to::text like ?`,
            [`%"id": ${athleteId}%`]
          )
        })
        .whereBetween('scheduledDate', [weekStartDt.toJSDate(), weekEndDt.toJSDate()])
        .where('status', 'scheduled')
        .orderBy('scheduledDate', 'asc')

      trainerItems = scheduled
        .filter((sw) => {
          const wd = sw.workoutData as { type?: string } | null
          return wd?.type !== 'rest_day'
        })
        .map((sw) => {
          const date = DateTime.fromJSDate(
            sw.scheduledDate.toJSDate
              ? sw.scheduledDate.toJSDate()
              : new Date(sw.scheduledDate.toString())
          ).toISODate()!
          const wd = sw.workoutData as { type: string; exercises?: unknown[] }
          const workoutType =
            wd.type === 'bodybuilding' || wd.type === 'cardio' || wd.type === 'crossfit'
              ? wd.type
              : 'bodybuilding'
          const typeLabel =
            workoutType === 'bodybuilding'
              ? 'Силовая'
              : workoutType === 'cardio'
                ? 'Кардио'
                : 'CrossFit'
          return {
            date,
            kind: 'train' as const,
            title: typeLabel,
            workoutType,
            source: 'trainer' as const,
            scheduledWorkoutId: sw.id,
            draftWorkoutData: {
              type: workoutType,
              exercises: Array.isArray(wd.exercises)
                ? wd.exercises
                    .filter(
                      (e): e is { name: string; sets?: number; reps?: number; zones?: string[] } =>
                        this.isExerciseLike(e)
                    )
                    .map((ex) => ({
                      name: ex.name,
                      sets: ex.sets,
                      reps: ex.reps,
                      zones: ex.zones,
                    }))
                : [],
              notes: '',
            },
          }
        })
    }

    const trainerDates = new Set(trainerItems.map((i) => i.date))

    // Целевое количество copilot-сессий (дополняем тренерские)
    const trainerCount = trainerItems.length
    const totalTarget = adjustedSessions(workoutFrequency, insights.tsb)
    const copilotCount = Math.max(0, totalTarget - trainerCount)

    // Слоты для copilot-сессий (не занятые тренером)
    const allOffsets = SESSIONS_DAY_OFFSETS[Math.min(totalTarget, 5)] ?? SESSIONS_DAY_OFFSETS[3]
    const freeOffsets = allOffsets
      .filter((o) => {
        const date = weekStartDt.plus({ days: o }).toISODate()!
        return !trainerDates.has(date)
      })
      .slice(0, copilotCount)

    // Мышечный блок по перегруженным зонам
    const block = recommendedBlock(insights.overloadedZones)

    // Copilot-сессии
    const copilotItems: WeekItem[] = []
    for (const [i, offset] of freeOffsets.entries()) {
      const date = weekStartDt.plus({ days: offset }).toISODate()!

      // Чередуем верх/низ
      const sessionBlock =
        block === 'upper' && i % 2 === 1
          ? 'lower'
          : block === 'lower' && i % 2 === 1
            ? 'upper'
            : block

      const workoutType = sessionBlock === 'cardio' ? 'cardio' : 'bodybuilding'
      const targetZones =
        sessionBlock === 'upper'
          ? UPPER_ZONES
          : sessionBlock === 'lower'
            ? [...LOWER_ZONES, ...CORE_ZONES]
            : sessionBlock === 'core'
              ? CORE_ZONES
              : [] // cardio — любые

      const exercises = this.pickExercises(targetZones, insights.overloadedZones, workoutType, 4)
      const label = BLOCK_LABELS[sessionBlock]

      copilotItems.push({
        date,
        kind: 'train',
        title: workoutType === 'cardio' ? 'Кардио ~30 мин' : `Силовая · ${label}`,
        workoutType,
        source: 'copilot',
        draftWorkoutData: {
          type: workoutType,
          exercises,
          notes: `Copilot: ${label.toLowerCase()}, ${insights.phaseAdvice.slice(0, 60)}`,
        },
      })
    }

    // Строим полную ленту недели
    const allTrainDates = new Set([...trainerItems, ...copilotItems].map((i) => i.date))
    const weekItems: WeekItem[] = []

    for (let o = 0; o < 7; o++) {
      const date = weekStartDt.plus({ days: o }).toISODate()!
      const trainer = trainerItems.find((i) => i.date === date)
      const copilot = copilotItems.find((i) => i.date === date)

      if (trainer) {
        weekItems.push(trainer)
      } else if (copilot) {
        weekItems.push(copilot)
      } else if (allTrainDates.size > 0) {
        weekItems.push({ date, kind: 'rest', title: 'Отдых', source: 'copilot' })
      } else {
        weekItems.push({ date, kind: 'empty', title: '', source: 'copilot' })
      }
    }

    // Рекомендация на сегодня
    const todayItem = weekItems.find((i) => i.date === todayStr)
    let todaySuggestion: TodaySuggestion | null = null

    if (todayItem) {
      if (todayItem.kind === 'train') {
        todaySuggestion = {
          date: todayStr,
          title: todayItem.title,
          workoutType: todayItem.workoutType!,
          source: todayItem.source,
          scheduledWorkoutId: todayItem.scheduledWorkoutId,
          draftWorkoutData: todayItem.draftWorkoutData,
        }
      } else {
        todaySuggestion = {
          date: todayStr,
          title: 'Отдых — запланировано',
          workoutType: 'bodybuilding',
          source: 'copilot',
        }
      }
    }

    // Объяснение
    const explain = this.buildExplain(insights, block)

    return { todaySuggestion, weekItems, explain }
  }

  private static pickExercises(
    targetZones: string[],
    overloadedZones: string[],
    workoutType: 'bodybuilding' | 'cardio' | 'crossfit',
    count: number
  ): Array<{ name: string; sets?: number; reps?: number; zones?: string[] }> {
    const catalog = ExerciseCatalog.all()

    const scored = catalog
      .filter((ex) => {
        // Исключаем упражнения на перегруженные зоны
        if (overloadedZones.some((z) => ex.zones.includes(z))) return false
        // Для кардио — только кардио-категория
        if (workoutType === 'cardio') return ex.category === 'cardio'
        // Для силовой — только strength/olympic
        if (workoutType === 'bodybuilding')
          return ex.category === 'strength' || ex.category === 'olympic'
        return true
      })
      .map((ex) => ({
        ex,
        score: targetZones.length > 0 ? ex.zones.filter((z) => targetZones.includes(z)).length : 1,
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)

    // Берём топ-N без повторов зон (жадный алгоритм)
    const picked: typeof scored = []
    const usedZones = new Set<string>()

    for (const item of scored) {
      if (picked.length >= count) break
      const newZones = item.ex.zones.filter((z) => !usedZones.has(z))
      if (picked.length < 2 || newZones.length > 0) {
        picked.push(item)
        item.ex.zones.forEach((z) => usedZones.add(z))
      }
    }

    return picked.map((x) => ({
      name: x.ex.title,
      sets: workoutType === 'cardio' ? undefined : 3,
      reps: workoutType === 'cardio' ? undefined : 10,
      zones: x.ex.zones,
    }))
  }

  private static buildExplain(
    insights: CopilotInsights,
    block: 'upper' | 'lower' | 'core' | 'cardio'
  ): Array<{ key: string; title: string; detail: string }> {
    const result: Array<{ key: string; title: string; detail: string }> = []

    if (insights.overloadedZones.length > 0) {
      const zonesList = insights.overloadedZones.slice(0, 3).join(', ')
      const blockLabel = BLOCK_LABELS[block]
      result.push({
        key: 'zones',
        title: `${insights.overloadedZones.length > 1 ? 'Зоны перегружены' : 'Зона перегружена'}: ${zonesList}`,
        detail: `Нагрузка выше 0.70 за 3 дня → сегодня ${blockLabel.toLowerCase()}`,
      })
    }

    result.push({
      key: 'phase',
      title: `TSB ${insights.tsb > 0 ? '+' : ''}${insights.tsb} · ${insights.phaseEmoji}`,
      detail: insights.phaseAdvice,
    })

    if (insights.daysSinceLastWorkout > 3 && insights.daysSinceLastWorkout < 99) {
      result.push({
        key: 'rest',
        title: `${insights.daysSinceLastWorkout} дней без тренировки`,
        detail: 'Тело восстановилось — самое время вернуться',
      })
    }

    return result
  }
}
