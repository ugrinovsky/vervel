import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import TrainerAthlete from '#models/trainer_athlete'
import AchievementService from '#services/AchievementService'
import { AiBalanceService } from '#services/AiBalanceService'

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

    // Check if ANY binding exists (active or inactive) — unique constraint (trainer_id, athlete_id)
    const existing = await TrainerAthlete.query()
      .where('trainerId', invite.trainerId)
      .where('athleteId', user.id)
      .first()

    if (existing) {
      // Delete the pending invite token record first
      await invite.delete()

      if (existing.status === 'active') {
        return response.conflict({ message: 'Вы уже привязаны к этому тренеру' })
      }

      // Reactivate removed binding
      existing.status = 'active'
      await existing.save()
      AchievementService.checkAndUnlockAchievements(user.id).catch(() => {})
      return response.ok({ success: true, message: 'Вы привязаны к тренеру' })
    }

    // No existing binding — reuse the pending invite record
    invite.athleteId = user.id
    invite.status = 'active'
    invite.inviteToken = null
    await invite.save()

    AchievementService.checkAndUnlockAchievements(user.id).catch(() => {})
    return response.ok({ success: true, message: 'Вы привязаны к тренеру' })
  }

  async getReferralStats({ auth, response }: HttpContext) {
    const user = auth.user!

    const countRow = await db.from('users').where('referred_by_id', user.id).count('* as total').first()
    const count = Number(countRow?.total ?? 0)
    const totalEarned = count * AiBalanceService.REFERRAL_BONUS

    return response.ok({
      success: true,
      data: { count, totalEarned, bonusPerReferral: AiBalanceService.REFERRAL_BONUS },
    })
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

  /**
   * Get trainer info for an invite token (no auth required)
   * GET /invite/info/:token
   */
  async getInviteInfo({ params, response }: HttpContext) {
    const invite = await TrainerAthlete.query()
      .where('inviteToken', params.token)
      .where('status', 'pending')
      .preload('trainer')
      .first()

    if (!invite) {
      return response.notFound({ message: 'Приглашение не найдено или уже использовано' })
    }

    return response.ok({
      success: true,
      data: {
        trainerName: invite.trainer.fullName || invite.trainer.email,
        trainerPhotoUrl: invite.trainer.photoUrl ?? null,
        trainerSpecializations: invite.trainer.specializations ?? null,
      },
    })
  }
}
