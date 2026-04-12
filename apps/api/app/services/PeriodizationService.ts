import Workout from '#models/workout'
import { toLocalDateKey } from '#utils/date'

type Phase = { name: string; emoji: string; advice: string }

export type PeriodizationResult = {
  current: { atl: number; ctl: number; tsb: number }
  phase: Phase
  series: { date: string; atl: number; ctl: number; tsb: number }[]
  weeklyLoad: { week: string; load: number; workouts: number }[]
}

const PHASES = {
  deload: {
    name: 'Deload / Восстановление',
    emoji: '🔄',
    trainer: 'Атлет хорошо отдохнул. Пора добавить нагрузку — иначе форма начнёт снижаться.',
    athlete: 'Вы хорошо отдохнули. Пора добавить нагрузку — иначе форма начнёт снижаться.',
  },
  accumulation: {
    name: 'Накопление',
    emoji: '📈',
    trainer:
      'Форма растёт. Продуктивная усталость — держите интенсивность, дайте телу адаптироваться.',
    athlete:
      'Форма растёт. Продуктивная усталость — держите интенсивность, дайте телу адаптироваться.',
  },
  intensification: {
    name: 'Интенсификация',
    emoji: '⚡',
    trainer: 'Хороший баланс нагрузки и восстановления. Можно добавить интенсивные сессии.',
    athlete: 'Хороший баланс нагрузки и восстановления. Можно добавить интенсивные сессии.',
  },
  peak: {
    name: 'Пик / Реализация',
    emoji: '🏆',
    trainer: 'Атлет свеж и в форме. Оптимальный момент для соревнований или максимальных попыток.',
    athlete: 'Вы свежи и в форме. Оптимальный момент для максимальных попыток.',
  },
  overload: {
    name: 'Перегрузка',
    emoji: '⚠️',
    trainer: 'Усталость критическая. Необходима разгрузочная неделя или полный отдых.',
    athlete: 'Усталость критическая. Нужна разгрузочная неделя или полный отдых.',
  },
  maintenance: {
    name: 'Поддержание',
    emoji: '→',
    trainer: 'Нагрузка стабильна. Поддерживайте текущий режим или ставьте новый цикл.',
    athlete: 'Нагрузка стабильна. Поддерживайте текущий режим или начните новый цикл.',
  },
}

export class PeriodizationService {
  static async calculate(
    userId: number,
    perspective: 'trainer' | 'athlete' = 'athlete'
  ): Promise<PeriodizationResult> {
    // 90 days output + 42 days CTL warm-up = 132 total
    const DAYS = 132
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - DAYS)

    const workouts = await Workout.query()
      .where('userId', userId)
      .where('date', '>=', startDate)
      .orderBy('date', 'asc')

    const tlByDay = new Map<string, number>()
    for (const w of workouts) {
      const dateObj = w.date.toJSDate ? w.date.toJSDate() : new Date(w.date.toString())
      const key = toLocalDateKey(dateObj)
      const intensity =
        typeof w.totalIntensity === 'string'
          ? Number.parseFloat(w.totalIntensity)
          : w.totalIntensity || 0
      const volume = Number(w.totalVolume) || 0
      const tl = (intensity * 0.7 + Math.min(volume / 5000, 1) * 0.3) * 100
      tlByDay.set(key, (tlByDay.get(key) ?? 0) + tl)
    }

    let atl = 0
    let ctl = 0
    const series: { date: string; atl: number; ctl: number; tsb: number }[] = []
    const weeklyMap = new Map<string, { load: number; workouts: number }>()

    for (let d = 0; d < DAYS; d++) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + d)
      const key = toLocalDateKey(date)
      const tl = tlByDay.get(key) ?? 0

      atl = atl * (6 / 7) + tl * (1 / 7)
      ctl = ctl * (41 / 42) + tl * (1 / 42)
      const tsb = ctl - atl

      if (d >= DAYS - 90) {
        series.push({
          date: key,
          atl: Math.round(atl * 10) / 10,
          ctl: Math.round(ctl * 10) / 10,
          tsb: Math.round(tsb * 10) / 10,
        })
      }

      const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay()
      const monday = new Date(date)
      monday.setDate(date.getDate() - (dayOfWeek - 1))
      const weekKey = toLocalDateKey(monday)
      if (tl > 0) {
        const prev = weeklyMap.get(weekKey) ?? { load: 0, workouts: 0 }
        weeklyMap.set(weekKey, { load: prev.load + tl, workouts: prev.workouts + 1 })
      }
    }

    const current = series[series.length - 1] ?? { atl: 0, ctl: 0, tsb: 0 }
    const twoWeeksAgo = series[series.length - 15] ?? series[0] ?? { ctl: 0, atl: 0 }
    const trendCtl = current.ctl - twoWeeksAgo.ctl
    const tsb = current.tsb

    const phaseKey =
      tsb > 15
        ? 'deload'
        : trendCtl > 2 && tsb < -5
          ? 'accumulation'
          : trendCtl > 0 && tsb >= -5 && tsb <= 5
            ? 'intensification'
            : tsb >= 5 && tsb <= 15
              ? 'peak'
              : tsb < -20
                ? 'overload'
                : 'maintenance'

    const p = PHASES[phaseKey]
    const phase: Phase = { name: p.name, emoji: p.emoji, advice: p[perspective] }

    const weeklyLoad = [...weeklyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([weekStart, data]) => {
        const d = new Date(weekStart)
        const label = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
        return { week: label, load: Math.round(data.load), workouts: data.workouts }
      })

    return {
      current: {
        atl: Math.round(current.atl * 10) / 10,
        ctl: Math.round(current.ctl * 10) / 10,
        tsb: Math.round(current.tsb * 10) / 10,
      },
      phase,
      series,
      weeklyLoad,
    }
  }
}
