import { DateTime } from 'luxon'
import Workout from '#models/workout'
import UserMeasurement from '#models/user_measurement'
import db from '@adonisjs/lucid/services/db'
import type { WorkoutSet } from '#models/workout'

/**
 * Формула Эпли: расчёт условного 1RM
 * 1RM = weight × (1 + reps/30)
 * Используется для нормализации нагрузки по разным схемам подходов.
 */
export function epley1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

/**
 * Максимальный 1RM среди всех сетов упражнения
 */
export function maxEpley(sets: WorkoutSet[]): number {
  let best = 0
  for (const s of sets) {
    if (s.weight && s.reps) {
      const rm = epley1RM(s.weight, s.reps)
      if (rm > best) best = rm
    }
  }
  return best
}

export interface ExerciseProgression {
  exerciseId: string
  exerciseName: string
  currentBest: number    // максимальный 1RM за текущий период
  previousBest: number   // максимальный 1RM за предыдущий период
  progressionPct: number | null  // % прироста, null если нет данных за прошлый период
  isPersonalRecord: boolean
}

export interface WeekPoint {
  date: string        // ISO дата начала периода (день или неделя)
  workouts: number
  volume: number
}

export interface GroupLeaderboardEntry {
  userId: number
  fullName: string | null
  photoUrl: string | null
  workouts: number
  volume: number
  relativeVolume: number | null
  progressionCoeff: number | null
  streakWeeks: number
  xp: number
  level: number
  weeklySeries: WeekPoint[]  // временной ряд за период
}

export class ProgressionService {
  /**
   * Прогрессия по упражнениям для одного пользователя.
   * Сравниваем текущий месяц с предыдущим.
   */
  static async getUserProgression(userId: number): Promise<ExerciseProgression[]> {
    const now = DateTime.now()
    const currentStart = now.startOf('month').toJSDate()
    const previousStart = now.minus({ months: 1 }).startOf('month').toJSDate()
    const previousEnd = now.startOf('month').toJSDate()

    const [currentWorkouts, previousWorkouts] = await Promise.all([
      Workout.query()
        .where('userId', userId)
        .where('date', '>=', currentStart)
        .whereNull('deleted_at'),
      Workout.query()
        .where('userId', userId)
        .where('date', '>=', previousStart)
        .where('date', '<', previousEnd)
        .whereNull('deleted_at'),
    ])

    // exerciseId → best 1RM
    const currentBestMap = new Map<string, number>()
    const previousBestMap = new Map<string, number>()

    for (const w of currentWorkouts) {
      for (const ex of w.exercises ?? []) {
        if (ex.type !== 'strength' || !ex.sets?.length) continue
        const rm = maxEpley(ex.sets)
        if (rm > (currentBestMap.get(ex.exerciseId) ?? 0)) {
          currentBestMap.set(ex.exerciseId, rm)
        }
      }
    }

    for (const w of previousWorkouts) {
      for (const ex of w.exercises ?? []) {
        if (ex.type !== 'strength' || !ex.sets?.length) continue
        const rm = maxEpley(ex.sets)
        if (rm > (previousBestMap.get(ex.exerciseId) ?? 0)) {
          previousBestMap.set(ex.exerciseId, rm)
        }
      }
    }

    if (currentBestMap.size === 0) return []

    // Загружаем названия упражнений
    const exerciseIds = [...currentBestMap.keys()]
    const exercises = await db
      .from('exercises')
      .whereIn('id', exerciseIds)
      .select('id', 'title')

    const nameMap = new Map<string, string>(exercises.map((e: any) => [e.id, e.title]))

    const result: ExerciseProgression[] = []

    for (const [exId, currentBest] of currentBestMap.entries()) {
      const previousBest = previousBestMap.get(exId) ?? 0
      const progressionPct =
        previousBest > 0
          ? Math.round(((currentBest - previousBest) / previousBest) * 100 * 10) / 10
          : null

      result.push({
        exerciseId: exId,
        exerciseName: nameMap.get(exId) ?? exId,
        currentBest: Math.round(currentBest * 10) / 10,
        previousBest: Math.round(previousBest * 10) / 10,
        progressionPct,
        isPersonalRecord: currentBest > previousBest && previousBest > 0,
      })
    }

    // Сортируем: сначала с прогрессом, потом остальные
    return result.sort((a, b) => {
      const ap = a.progressionPct ?? -Infinity
      const bp = b.progressionPct ?? -Infinity
      return bp - ap
    })
  }

  /**
   * Средний коэффициент прогресса по всем упражнениям пользователя за текущий месяц.
   * Возвращает null если нет данных.
   */
  static async getProgressionCoeff(userId: number): Promise<number | null> {
    const progression = await this.getUserProgression(userId)
    const withData = progression.filter((p) => p.progressionPct !== null)
    if (withData.length === 0) return null
    const avg = withData.reduce((sum, p) => sum + (p.progressionPct ?? 0), 0) / withData.length
    return Math.round(avg * 10) / 10
  }

  /**
   * Количество личных рекордов пользователя за текущий месяц.
   */
  static async countPersonalRecords(userId: number): Promise<number> {
    const progression = await this.getUserProgression(userId)
    return progression.filter((p) => p.isPersonalRecord).length
  }

  /**
   * Данные для лидерборда группы.
   * period: 7 или 30 дней
   */
  static async getGroupLeaderboard(
    athleteIds: number[],
    period: 7 | 30
  ): Promise<GroupLeaderboardEntry[]> {
    if (athleteIds.length === 0) return []

    const since = DateTime.now().minus({ days: period }).toJSDate()

    // Загружаем всё за один батч
    const [workouts, users, streaks, latestWeights] = await Promise.all([
      Workout.query()
        .whereIn('userId', athleteIds)
        .where('date', '>=', since)
        .whereNull('deleted_at'),

      db.from('users').whereIn('id', athleteIds).select('id', 'full_name', 'photo_url', 'xp'),

      db.from('user_streaks').whereIn('user_id', athleteIds).select('user_id', 'current_streak'),

      // Последний вес каждого атлета
      db
        .from('user_measurements as um')
        .whereIn('um.user_id', athleteIds)
        .where('um.type', 'body_weight')
        .whereRaw(
          `um.logged_at = (
            SELECT MAX(logged_at) FROM user_measurements
            WHERE user_id = um.user_id AND type = 'body_weight'
          )`
        )
        .select('um.user_id', 'um.value as weight_kg'),
    ])

    const weightMap = new Map<number, number>(
      latestWeights.map((r: any) => [r.user_id, Number(r.weight_kg)])
    )
    const streakMap = new Map<number, number>(
      streaks.map((r: any) => [r.user_id, r.current_streak])
    )
    const userMap = new Map<number, any>(users.map((u: any) => [u.id, u]))

    // Генерируем все бакеты периода (день для 7 дн, неделя для 30 дн)
    const granularity = period === 7 ? 'day' : 'week'
    const buckets: string[] = []
    let cursor = DateTime.now().minus({ days: period }).startOf(granularity)
    const endBucket = DateTime.now().startOf(granularity)
    while (cursor <= endBucket) {
      buckets.push(cursor.toISODate()!)
      cursor = cursor.plus(granularity === 'day' ? { days: 1 } : { weeks: 1 })
    }

    // Временные ряды и агрегаты по userId
    const statsMap = new Map<number, { workouts: number; volume: number }>()
    const seriesMap = new Map<number, Map<string, { workouts: number; volume: number }>>()
    for (const id of athleteIds) {
      statsMap.set(id, { workouts: 0, volume: 0 })
      seriesMap.set(id, new Map(buckets.map((b) => [b, { workouts: 0, volume: 0 }])))
    }

    for (const w of workouts) {
      const s = statsMap.get(w.userId)!
      s.workouts += 1
      s.volume += Number(w.totalVolume) || 0

      const bucket = DateTime.fromISO(String(w.date)).startOf(granularity).toISODate()!
      const athleteSeries = seriesMap.get(w.userId)
      if (athleteSeries?.has(bucket)) {
        const sp = athleteSeries.get(bucket)!
        sp.workouts += 1
        sp.volume += Number(w.totalVolume) || 0
      }
    }

    // Прогресс считаем только за месяц (независимо от period)
    const progressionMap = new Map<number, number | null>()
    await Promise.all(
      athleteIds.map(async (id) => {
        const coeff = await this.getProgressionCoeff(id)
        progressionMap.set(id, coeff)
      })
    )

    const { computeLevel } = await import('./xpLogic.js')

    return athleteIds.map((id) => {
      const s = statsMap.get(id)!
      const u = userMap.get(id)
      const bodyWeight = weightMap.get(id) ?? null
      const xp = Number(u?.xp ?? 0)

      return {
        userId: id,
        fullName: u?.full_name ?? null,
        photoUrl: u?.photo_url ?? null,
        workouts: s.workouts,
        volume: Math.round(s.volume),
        relativeVolume: bodyWeight ? Math.round((s.volume / bodyWeight) * 10) / 10 : null,
        progressionCoeff: progressionMap.get(id) ?? null,
        streakWeeks: streakMap.get(id) ?? 0,
        xp,
        level: computeLevel(xp).level,
        weeklySeries: buckets.map((date) => {
          const sp = seriesMap.get(id)?.get(date) ?? { workouts: 0, volume: 0 }
          return { date, workouts: sp.workouts, volume: Math.round(sp.volume) }
        }),
      }
    })
  }

  /**
   * Силовой журнал: последние 6 сессий по каждому силовому упражнению.
   */
  static async getStrengthLog(userId: number): Promise<StrengthLogEntry[]> {
    const since = DateTime.now().minus({ days: 365 }).toJSDate()

    const workouts = await Workout.query()
      .where('userId', userId)
      .where('date', '>=', since)
      .whereNull('deleted_at')
      .orderBy('date', 'desc')

    // Группируем по exerciseId → последние 6 сессий
    const exerciseSessionsMap = new Map<
      string,
      { name: string; sessions: StrengthLogEntry['sessions'] }
    >()

    for (const w of workouts) {
      for (const ex of w.exercises ?? []) {
        if (ex.type !== 'strength' || !ex.sets?.length) continue
        const hasWeightData = ex.sets.some((s) => s.weight && s.reps)
        if (!hasWeightData) continue

        if (!exerciseSessionsMap.has(ex.exerciseId)) {
          exerciseSessionsMap.set(ex.exerciseId, { name: ex.name ?? ex.exerciseId, sessions: [] })
        }
        const entry = exerciseSessionsMap.get(ex.exerciseId)!
        if (entry.sessions.length < 6) {
          entry.sessions.push({
            date: String(w.date),
            workoutId: w.id,
            sets: ex.sets.map((s) => ({ reps: s.reps, weight: s.weight })),
            notes: w.notes ?? undefined,
          })
        }
      }
    }

    // Обогащаем названиями из каталога
    const exerciseIds = [...exerciseSessionsMap.keys()]
    if (exerciseIds.length > 0) {
      const catalogExercises = await db
        .from('exercises')
        .whereIn('id', exerciseIds)
        .select('id', 'title')
      for (const row of catalogExercises as any[]) {
        const entry = exerciseSessionsMap.get(row.id)
        if (entry) entry.name = row.title
      }
    }

    // Если имя выглядит как slug (подчёркивания, нет пробелов) — форматируем
    for (const [, entry] of exerciseSessionsMap) {
      if (entry.name.includes('_') && !entry.name.includes(' ')) {
        entry.name = entry.name.replace(/_/g, ' ')
      }
    }

    return [...exerciseSessionsMap.entries()]
      .filter(([, v]) => v.sessions.length > 0)
      .map(([exerciseId, { name, sessions }]) => ({ exerciseId, exerciseName: name, sessions }))
      .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName, 'ru'))
  }
}

export interface StrengthLogEntry {
  exerciseId: string
  exerciseName: string
  sessions: {
    date: string
    workoutId: number
    sets: { reps?: number; weight?: number }[]
    notes?: string
  }[]
}
