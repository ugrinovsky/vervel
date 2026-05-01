import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import { StreakService } from '#services/StreakService'
import { errorMessage } from '#utils/error'
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
            mode: 'simple',
            currentWeekWorkouts: 0,
            weeklyRequired: 3,
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
          mode: streak.mode,
          currentWeekWorkouts: streak.currentWeekWorkouts,
          weeklyRequired: streak.mode === 'intensive' ? 5 : 3,
        },
      })
    } catch (error) {
      logger.error({ err: errorMessage(error) }, 'streak: get error')
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
      logger.error({ err: errorMessage(error) }, 'streak: history error')
      return response.internalServerError({
        success: false,
        message: 'Ошибка при получении истории',
      })
    }
  }

  /**
   * Сменить режим ударного режима
   */
  async setMode({ auth, request, response }: HttpContext) {
    try {
      const user = auth.user!
      const { mode } = request.only(['mode'])
      if (!['simple', 'intensive'].includes(mode)) {
        return response.badRequest({ success: false, message: 'Invalid mode' })
      }
      const safeMode: 'simple' | 'intensive' = mode === 'intensive' ? 'intensive' : 'simple'
      await StreakService.setMode(user.id, safeMode)
      return response.json({ success: true, data: { mode } })
    } catch (error) {
      logger.error({ err: errorMessage(error) }, 'streak: set mode error')
      return response.internalServerError({ success: false, message: 'Ошибка при смене режима' })
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
      logger.error({ err: errorMessage(error) }, 'streak: achievements error')
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
      logger.error({ err: errorMessage(error) }, 'streak: check achievements error')
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
      logger.error({ err: errorMessage(error) }, 'streak: mark seen error')
      return response.internalServerError({
        success: false,
        message: 'Ошибка при обновлении достижений',
      })
    }
  }
}
