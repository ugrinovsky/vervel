import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Chat from '#models/chat'
import Message from '#models/message'
import ChatRead from '#models/chat_read'
import TrainerGroup from '#models/trainer_group'
import TrainerAthlete from '#models/trainer_athlete'
import Workout from '#models/workout'

export default class AthleteController {
  /**
   * Groups the athlete is a member of (with trainer + chatId)
   * GET /athlete/my-groups
   */
  async getMyGroups({ auth, response }: HttpContext) {
    const athlete = auth.user!

    const groups = await TrainerGroup.query()
      .whereHas('athletes', (q) => q.where('athlete_id', athlete.id))
      .preload('trainer')
      .preload('athletes')

    const result = await Promise.all(
      groups.map(async (group) => {
        const chat = await Chat.query()
          .where('type', 'group')
          .where('groupId', group.id)
          .first()

        return {
          id: group.id,
          name: group.name,
          trainer: {
            id: group.trainer.id,
            fullName: group.trainer.fullName,
            email: group.trainer.email,
          },
          memberCount: group.athletes.length,
          chatId: chat?.id ?? null,
        }
      })
    )

    return response.ok({ success: true, data: result })
  }

  /**
   * Personal trainers the athlete works with (with chatId)
   * GET /athlete/my-trainers
   */
  async getMyTrainers({ auth, response }: HttpContext) {
    const athlete = auth.user!

    const bindings = await TrainerAthlete.query()
      .where('athleteId', athlete.id)
      .where('status', 'active')
      .preload('trainer')

    const result = await Promise.all(
      bindings.map(async (binding) => {
        const chat = await Chat.query()
          .where('type', 'personal')
          .where('trainerId', binding.trainerId)
          .where('athleteId', athlete.id)
          .first()

        return {
          id: binding.trainer.id,
          fullName: binding.trainer.fullName,
          email: binding.trainer.email,
          bio: binding.trainer.bio ?? null,
          specializations: binding.trainer.specializations ?? null,
          photoUrl: binding.trainer.photoUrl ?? null,
          chatId: chat?.id ?? null,
        }
      })
    )

    return response.ok({ success: true, data: result })
  }

  /**
   * Unread message count for athlete across all their chats
   * GET /athlete/unread-counts
   */
  async getUnreadCounts({ auth, response }: HttpContext) {
    const athlete = auth.user!

    // Personal chats (trainer → athlete)
    const personalChats = await Chat.query()
      .where('type', 'personal')
      .where('athleteId', athlete.id)

    // Group chats (groups the athlete is a member of)
    const groupRows = await db.from('group_athletes').where('athlete_id', athlete.id)
    const groupIds = groupRows.map((r: any) => r.group_id)
    const groupChats = groupIds.length > 0
      ? await Chat.query().where('type', 'group').whereIn('groupId', groupIds)
      : []

    const allChats = [...personalChats, ...groupChats]
    if (allChats.length === 0) {
      return response.ok({ success: true, data: { total: 0 } })
    }

    const chatIds = allChats.map((c) => c.id)
    const reads = await ChatRead.query().whereIn('chatId', chatIds).where('userId', athlete.id)
    const readMap = new Map(reads.map((r) => [r.chatId, r.lastReadAt]))

    let total = 0
    const chats: { chatId: number; unread: number }[] = []
    for (const chat of allChats) {
      const lastRead = readMap.get(chat.id)
      let query = Message.query()
        .where('chatId', chat.id)
        .whereNot('senderId', athlete.id)
      if (lastRead) {
        query = query.where('createdAt', '>', lastRead.toISO()!)
      }
      const count = await query.count('* as total')
      const unread = Number(count[0].$extras.total)
      total += unread
      chats.push({ chatId: chat.id, unread })
    }

    return response.ok({ success: true, data: { total, chats } })
  }

  /**
   * Get or create group chat (athlete side)
   * GET /athlete/chats/group/:groupId
   */
  async getOrCreateGroupChat({ auth, params, response }: HttpContext) {
    const athlete = auth.user!

    // Verify athlete is a member of the group
    const membership = await db
      .from('group_athletes')
      .where('group_id', params.groupId)
      .where('athlete_id', athlete.id)
      .first()

    if (!membership) {
      return response.forbidden({ message: 'Вы не состоите в этой группе' })
    }

    // Chat is created by the trainer; athlete finds the existing one
    const chat = await Chat.query().where('type', 'group').where('groupId', params.groupId).first()

    if (!chat) {
      return response.notFound({ message: 'Чат группы ещё не открыт тренером' })
    }

    return response.ok({ success: true, data: { chatId: chat.id } })
  }

  /**
   * Get or create personal chat with trainer (athlete side)
   * GET /athlete/chats/trainer/:trainerId
   */
  async getOrCreatePersonalChat({ auth, params, response }: HttpContext) {
    const athlete = auth.user!

    const binding = await TrainerAthlete.query()
      .where('trainerId', params.trainerId)
      .where('athleteId', athlete.id)
      .where('status', 'active')
      .first()

    if (!binding) {
      return response.forbidden({ message: 'Нет активной связи с этим тренером' })
    }

    let chat = await Chat.query()
      .where('type', 'personal')
      .where('trainerId', params.trainerId)
      .where('athleteId', athlete.id)
      .first()

    if (!chat) {
      chat = await Chat.create({
        type: 'personal',
        trainerId: Number(params.trainerId),
        groupId: null,
        athleteId: athlete.id,
      })
    }

    return response.ok({ success: true, data: { chatId: chat.id } })
  }

  /**
   * Upcoming trainer-assigned workouts for the next 14 days
   * GET /athlete/upcoming-workouts
   */
  async getUpcomingWorkouts({ auth, response }: HttpContext) {
    const athlete = auth.user!
    const today = DateTime.now().startOf('day')
    const end = today.plus({ days: 14 })

    const workouts = await Workout.query()
      .where('userId', athlete.id)
      .whereNotNull('scheduledWorkoutId')
      .where('date', '>=', today.toJSDate())
      .where('date', '<=', end.toJSDate())
      .orderBy('date', 'asc')
      .limit(10)

    return response.ok({
      success: true,
      data: workouts.map((w) => ({
        id: w.id,
        date: w.date,
        workoutType: w.workoutType,
        exercises: (w.exercises as any[]).slice(0, 3).map((ex) => ({
          exerciseId: ex.exerciseId,
          sets: ex.sets?.length ?? 0,
        })),
        exerciseCount: (w.exercises as any[]).length,
        notes: w.notes,
      })),
    })
  }

  /**
   * GET /athlete/periodization
   * ATL/CTL/TSB по модели PMC (Banister) для самого атлета.
   */
  async getMyPeriodization({ auth, response }: HttpContext) {
    const athlete = auth.user!

    const DAYS = 132
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(today.getDate() - DAYS)

    const workouts = await Workout.query()
      .where('userId', athlete.id)
      .where('date', '>=', startDate)
      .orderBy('date', 'asc')

    const tlByDay = new Map<string, number>()
    for (const w of workouts) {
      const dateObj = w.date.toJSDate ? w.date.toJSDate() : new Date(w.date.toString())
      const key = dateObj.toISOString().slice(0, 10)
      const intensity = typeof w.totalIntensity === 'string' ? parseFloat(w.totalIntensity) : (w.totalIntensity || 0)
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
      const key = date.toISOString().slice(0, 10)
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
      const weekKey = monday.toISOString().slice(0, 10)
      if (tl > 0) {
        const prev = weeklyMap.get(weekKey) ?? { load: 0, workouts: 0 }
        weeklyMap.set(weekKey, { load: prev.load + tl, workouts: prev.workouts + 1 })
      }
    }

    const current = series[series.length - 1] ?? { atl: 0, ctl: 0, tsb: 0 }
    const twoWeeksAgo = series[series.length - 15] ?? series[0] ?? { ctl: 0, atl: 0 }
    const trendCtl = current.ctl - twoWeeksAgo.ctl
    const tsb = current.tsb

    let phase: { name: string; emoji: string; advice: string }
    if (tsb > 15) {
      phase = { name: 'Deload / Восстановление', emoji: '🔄', advice: 'Вы хорошо отдохнули. Пора добавить нагрузку — иначе форма начнёт снижаться.' }
    } else if (trendCtl > 2 && tsb < -5) {
      phase = { name: 'Накопление', emoji: '📈', advice: 'Форма растёт. Продуктивная усталость — держите интенсивность, дайте телу адаптироваться.' }
    } else if (trendCtl > 0 && tsb >= -5 && tsb <= 5) {
      phase = { name: 'Интенсификация', emoji: '⚡', advice: 'Хороший баланс нагрузки и восстановления. Можно добавить интенсивные сессии.' }
    } else if (tsb >= 5 && tsb <= 15) {
      phase = { name: 'Пик / Реализация', emoji: '🏆', advice: 'Вы свежи и в форме. Оптимальный момент для максимальных попыток.' }
    } else if (tsb < -20) {
      phase = { name: 'Перегрузка', emoji: '⚠️', advice: 'Усталость критическая. Нужна разгрузочная неделя или полный отдых.' }
    } else {
      phase = { name: 'Поддержание', emoji: '→', advice: 'Нагрузка стабильна. Поддерживайте текущий режим или начните новый цикл.' }
    }

    const sortedWeeks = [...weeklyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([weekStart, data]) => {
        const d = new Date(weekStart)
        const label = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
        return { week: label, load: Math.round(data.load), workouts: data.workouts }
      })

    return response.ok({
      success: true,
      data: {
        current: {
          atl: Math.round(current.atl * 10) / 10,
          ctl: Math.round(current.ctl * 10) / 10,
          tsb: Math.round(current.tsb * 10) / 10,
        },
        phase,
        series,
        weeklyLoad: sortedWeeks,
      },
    })
  }
}
