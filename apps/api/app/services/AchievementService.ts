import { DateTime } from 'luxon'
import Achievement from '#models/achievement'
import UserAchievement from '#models/user_achievement'
import type UserStreak from '#models/user_streak'

export default class AchievementService {
  /**
   * Проверить и разблокировать новые достижения
   */
  static async checkAndUnlockAchievements(
    userId: number,
    userStreak: UserStreak
  ): Promise<Achievement[]> {
    const allAchievements = await Achievement.query().where('isActive', true)

    const existingUserAchievements = await UserAchievement.query()
      .where('userId', userId)
      .select('achievementId')

    const existingIds = new Set(existingUserAchievements.map((ua) => ua.achievementId))

    const newlyUnlocked: Achievement[] = []

    for (const achievement of allAchievements) {
      // Пропустить уже полученные
      if (existingIds.has(achievement.id)) continue

      const shouldUnlock = this.checkAchievementCondition(achievement, userStreak)

      if (shouldUnlock) {
        await UserAchievement.create({
          userId,
          achievementId: achievement.id,
          unlockedAt: DateTime.now(),
          isSeen: false,
        })

        newlyUnlocked.push(achievement)
      }
    }

    return newlyUnlocked
  }

  /**
   * Получить все достижения пользователя
   */
  static async getUserAchievements(userId: number) {
    const userAchievements = await UserAchievement.query()
      .where('userId', userId)
      .preload('achievement')
      .orderBy('unlockedAt', 'desc')

    const allAchievements = await Achievement.query()
      .where('isActive', true)
      .orderBy('requirementValue', 'asc')

    const unlockedIds = new Set(userAchievements.map((ua) => ua.achievementId))

    const unlocked = userAchievements.map((ua) => ({
      ...ua.achievement.serialize(),
      unlockedAt: ua.unlockedAt.toISO(),
      isSeen: ua.isSeen,
    }))

    const locked = allAchievements
      .filter((a) => !unlockedIds.has(a.id))
      .map((a) => ({
        ...a.serialize(),
        locked: true,
      }))

    return {
      unlocked,
      locked,
      totalUnlocked: unlocked.length,
      totalAchievements: allAchievements.length,
    }
  }

  /**
   * Отметить достижения как просмотренные
   */
  static async markAchievementsSeen(userId: number, achievementIds: number[]) {
    await UserAchievement.query()
      .where('userId', userId)
      .whereIn('achievementId', achievementIds)
      .update({ isSeen: true })
  }

  /**
   * Проверка условия достижения
   */
  private static checkAchievementCondition(
    achievement: Achievement,
    userStreak: UserStreak
  ): boolean {
    switch (achievement.requirementType) {
      case 'streak_days':
        return userStreak.currentStreak >= (achievement.requirementValue || 0)

      default:
        return false
    }
  }
}
