import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Chat from '#models/chat'
import TrainerGroup from '#models/trainer_group'
import TrainerAthlete from '#models/trainer_athlete'

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
          chatId: chat?.id ?? null,
        }
      })
    )

    return response.ok({ success: true, data: result })
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
}
