import { DateTime } from 'luxon'
import UserStreak from '#models/user_streak'
import StreakHistory from '#models/streak_history'
import type Achievement from '#models/achievement'
import AchievementService from './AchievementService.js'
import { computeWeeklyStreakUpdate, type StreakMode } from './streakLogic.js'

export interface StreakUpdateResult {
  streak: UserStreak
  newAchievements: Achievement[]
  streakStatus: 'continued' | 'started' | 'broken'
}

export class StreakService {
  static async updateStreakAfterWorkout(
    userId: number,
    workoutDate: DateTime
  ): Promise<StreakUpdateResult> {
    let userStreak = await UserStreak.query().where('userId', userId).first()

    if (!userStreak) {
      const weekStart = workoutDate.startOf('week')
      userStreak = await UserStreak.create({
        userId,
        currentStreak: 0,
        longestStreak: 0,
        lastWorkoutDate: workoutDate.startOf('day'),
        currentWeekStart: weekStart,
        currentWeekWorkouts: 1,
        currentWeekCompleted: false,
        mode: 'simple',
        streakStartedAt: DateTime.now(),
      })

      await this.logStreakEvent(userId, workoutDate.startOf('day'), 'workout_completed', 1, {
        isFirst: true,
      })

      return { streak: userStreak, newAchievements: [], streakStatus: 'started' }
    }

    const currentWeekStart = userStreak.currentWeekStart
      ? DateTime.fromJSDate(userStreak.currentWeekStart.toJSDate())
      : null

    const computation = computeWeeklyStreakUpdate({
      currentWeekStart,
      currentWeekWorkouts: userStreak.currentWeekWorkouts,
      currentWeekCompleted: userStreak.currentWeekCompleted,
      workoutDate,
      currentStreak: userStreak.currentStreak,
      longestStreak: userStreak.longestStreak,
      mode: userStreak.mode as StreakMode,
    })

    userStreak.currentStreak = computation.newCurrentStreak
    userStreak.longestStreak = computation.newLongestStreak
    userStreak.currentWeekWorkouts = computation.newCurrentWeekWorkouts
    userStreak.currentWeekStart = computation.newCurrentWeekStart
    userStreak.currentWeekCompleted = computation.newCurrentWeekCompleted
    userStreak.lastWorkoutDate = workoutDate.startOf('day')

    if (computation.newRecord) {
      userStreak.longestStreakAchievedAt = DateTime.now()
    }

    if (computation.status === 'week_broken') {
      userStreak.streakStartedAt = DateTime.now()
    }

    await userStreak.save()
    await this.logStreakEvent(
      userId,
      workoutDate.startOf('day'),
      'workout_completed',
      userStreak.currentWeekWorkouts
    )

    if (computation.status === 'week_broken') {
      await this.logStreakEvent(
        userId,
        workoutDate.startOf('day'),
        'streak_broken',
        userStreak.currentStreak
      )
    } else if (computation.status === 'week_completed') {
      if (computation.newRecord) {
        await this.logStreakEvent(
          userId,
          workoutDate.startOf('day'),
          'new_record',
          userStreak.currentStreak
        )
      }
      await this.logStreakEvent(
        userId,
        workoutDate.startOf('day'),
        'streak_continued',
        userStreak.currentStreak
      )
    }

    const streakStatus =
      computation.status === 'week_broken'
        ? 'broken'
        : computation.status === 'started'
          ? 'started'
          : 'continued'

    const newAchievements = await AchievementService.checkAndUnlockAchievements(userId, userStreak)

    return { streak: userStreak, newAchievements, streakStatus }
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

  static async setMode(userId: number, mode: StreakMode): Promise<UserStreak | null> {
    const userStreak = await UserStreak.query().where('userId', userId).first()
    if (!userStreak) return null
    userStreak.mode = mode
    await userStreak.save()
    return userStreak
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
    await StreakHistory.create({ userId, date, eventType, streakValue, metadata })
  }
}
