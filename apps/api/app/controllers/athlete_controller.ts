import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

import db from '@adonisjs/lucid/services/db'
import { PeriodizationService } from '#services/PeriodizationService'
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

    if (!(await TrainerAthlete.isActiveBinding(Number(params.trainerId), athlete.id))) {
      return response.forbidden({ message: 'Нет активной связи с этим тренером' })
    }

    const chat = await Chat.findOrCreatePersonal(Number(params.trainerId), athlete.id)
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

    const data = await PeriodizationService.calculate(athlete.id, 'athlete')
    return response.ok({ success: true, data })
  }
}
