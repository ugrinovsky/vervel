import type { HttpContext } from '@adonisjs/core/http'
import { StreakService } from '#services/StreakService'
import AchievementService from '#services/AchievementService'

export default class StreakController {
  /**
   * Получить информацию о streak
   */
  async show({ auth, response }: HttpContext) {
    try {
      const user = auth.user!
      const streak = await StreakService.getUserStreak(user.id)

      if (!streak) {
        return response.json({
          success: true,
          data: {
            currentStreak: 0,
            longestStreak: 0,
            lastWorkoutDate: null,
            streakStartedAt: null,
          },
        })
      }

      return response.json({
        success: true,
        data: {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          lastWorkoutDate: streak.lastWorkoutDate?.toISO(),
          streakStartedAt: streak.streakStartedAt?.toISO(),
          longestStreakAchievedAt: streak.longestStreakAchievedAt?.toISO(),
        },
      })
    } catch (error) {
      console.error('Get streak error:', error)
      return response.internalServerError({
        success: false,
        message: 'Ошибка при получении streak',
      })
    }
  }

  /**
   * Получить историю streak
   */
  async history({ auth, request, response }: HttpContext) {
    try {
      const user = auth.user!
      const limit = request.input('limit', 30)

      const history = await StreakService.getStreakHistory(user.id, limit)

      return response.json({
        success: true,
        data: history.map((h) => ({
          date: h.date.toISODate(),
          eventType: h.eventType,
          streakValue: h.streakValue,
          metadata: h.metadata,
          createdAt: h.createdAt.toISO(),
        })),
      })
    } catch (error) {
      console.error('Get streak history error:', error)
      return response.internalServerError({
        success: false,
        message: 'Ошибка при получении истории',
      })
    }
  }

  /**
   * Получить достижения
   */
  async achievements({ auth, response }: HttpContext) {
    try {
      const user = auth.user!
      const achievements = await AchievementService.getUserAchievements(user.id)

      return response.json({
        success: true,
        data: achievements,
      })
    } catch (error) {
      console.error('Get achievements error:', error)
      return response.internalServerError({
        success: false,
        message: 'Ошибка при получении достижений',
      })
    }
  }

  /**
   * Проверить и разблокировать достижения (вызывается при старте приложения)
   */
  async checkAndUnlock({ auth, response }: HttpContext) {
    try {
      const user = auth.user!
      const newlyUnlocked = await AchievementService.checkAndUnlockAchievements(user.id)
      return response.json({ success: true, data: { newlyUnlocked } })
    } catch (error) {
      console.error('Check achievements error:', error)
      return response.internalServerError({
        success: false,
        message: 'Ошибка при проверке достижений',
      })
    }
  }

  /**
   * Отметить достижения как просмотренные
   */
  async markAchievementsSeen({ auth, request, response }: HttpContext) {
    try {
      const user = auth.user!
      const { achievementIds } = request.only(['achievementIds'])

      if (!Array.isArray(achievementIds) || achievementIds.length === 0) {
        return response.badRequest({
          success: false,
          message: 'Invalid achievement IDs',
        })
      }

      await AchievementService.markAchievementsSeen(user.id, achievementIds)

      return response.json({
        success: true,
        message: 'Достижения отмечены как просмотренные',
      })
    } catch (error) {
      console.error('Mark achievements seen error:', error)
      return response.internalServerError({
        success: false,
        message: 'Ошибка при обновлении достижений',
      })
    }
  }
}
