import { DateTime } from 'luxon'
import UserStreak from '#models/user_streak'
import StreakHistory from '#models/streak_history'
import type Achievement from '#models/achievement'
import AchievementService from './AchievementService.js'

export interface StreakUpdateResult {
  streak: UserStreak
  newAchievements: Achievement[]
  streakStatus: 'continued' | 'started' | 'broken'
}

export class StreakService {
  /**
   * Обновить streak после создания тренировки
   */
  static async updateStreakAfterWorkout(
    userId: number,
    workoutDate: DateTime
  ): Promise<StreakUpdateResult> {
    // Получить или создать streak record
    let userStreak = await UserStreak.query().where('userId', userId).first()

    if (!userStreak) {
      userStreak = await UserStreak.create({
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastWorkoutDate: workoutDate.startOf('day'),
        streakStartedAt: DateTime.now(),
      })

      await this.logStreakEvent(userId, workoutDate.startOf('day'), 'workout_completed', 1, {
        isFirst: true,
      })

      return {
        streak: userStreak,
        newAchievements: [],
        streakStatus: 'started',
      }
    }

    const lastDate = userStreak.lastWorkoutDate
      ? DateTime.fromJSDate(userStreak.lastWorkoutDate.toJSDate()).startOf('day')
      : null

    const currentDate = workoutDate.startOf('day')

    // Если тренировка в тот же день - не обновляем streak
    if (lastDate && lastDate.hasSame(currentDate, 'day')) {
      return {
        streak: userStreak,
        newAchievements: [],
        streakStatus: 'continued',
      }
    }

    const daysDiff = lastDate ? Math.floor(currentDate.diff(lastDate, 'days').days) : 999

    let streakStatus: StreakUpdateResult['streakStatus'] = 'continued'

    if (daysDiff === 1) {
      // Продолжение streak
      userStreak.currentStreak += 1
      streakStatus = 'continued'
    } else {
      // Streak сломался
      await this.logStreakEvent(userId, currentDate, 'streak_broken', userStreak.currentStreak, {
        daysMissed: daysDiff - 1,
      })

      userStreak.currentStreak = 1
      userStreak.streakStartedAt = DateTime.now()
      streakStatus = 'broken'
    }

    // Обновление рекорда
    if (userStreak.currentStreak > userStreak.longestStreak) {
      userStreak.longestStreak = userStreak.currentStreak
      userStreak.longestStreakAchievedAt = DateTime.now()

      await this.logStreakEvent(userId, currentDate, 'new_record', userStreak.currentStreak)
    }

    userStreak.lastWorkoutDate = currentDate
    await userStreak.save()

    await this.logStreakEvent(userId, currentDate, 'streak_continued', userStreak.currentStreak)

    // Проверка достижений
    const newAchievements = await AchievementService.checkAndUnlockAchievements(
      userId,
      userStreak
    )

    return {
      streak: userStreak,
      newAchievements,
      streakStatus,
    }
  }

  /**
   * Получить текущий streak пользователя
   */
  static async getUserStreak(userId: number): Promise<UserStreak | null> {
    return await UserStreak.query().where('userId', userId).first()
  }

  /**
   * Получить историю streak
   */
  static async getStreakHistory(userId: number, limit = 30): Promise<StreakHistory[]> {
    return await StreakHistory.query()
      .where('userId', userId)
      .orderBy('date', 'desc')
      .limit(limit)
  }

  /**
   * Логирование события streak
   */
  private static async logStreakEvent(
    userId: number,
    date: DateTime,
    eventType: StreakHistory['eventType'],
    streakValue: number,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await StreakHistory.create({
      userId,
      date,
      eventType,
      streakValue,
      metadata,
    })
  }
}
