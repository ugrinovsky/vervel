import type { HttpContext } from '@adonisjs/core/http'
import TrainerAthlete from '#models/trainer_athlete'

export default class InviteController {
  async acceptInvite({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { token } = request.only(['token'])

    if (!token) {
      return response.badRequest({ message: 'Токен обязателен' })
    }

    const invite = await TrainerAthlete.query()
      .where('inviteToken', token)
      .where('status', 'pending')
      .first()

    if (!invite) {
      return response.notFound({ message: 'Приглашение не найдено или уже использовано' })
    }

    if (invite.trainerId === user.id) {
      return response.badRequest({ message: 'Нельзя принять своё приглашение' })
    }

    // Check if already linked to this trainer
    const existing = await TrainerAthlete.query()
      .where('trainerId', invite.trainerId)
      .where('athleteId', user.id)
      .where('status', 'active')
      .first()

    if (existing) {
      // Clean up pending invite
      await invite.delete()
      return response.conflict({ message: 'Вы уже привязаны к этому тренеру' })
    }

    invite.athleteId = user.id
    invite.status = 'active'
    invite.inviteToken = null
    await invite.save()

    return response.ok({ success: true, message: 'Вы привязаны к тренеру' })
  }

  async getQrData({ auth, response }: HttpContext) {
    const user = auth.user!

    return response.ok({
      success: true,
      data: {
        athleteId: user.id,
        fullName: user.fullName,
        email: user.email,
      },
    })
  }
}
