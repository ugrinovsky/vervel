import { DateTime } from 'luxon'
import Achievement from '#models/achievement'
import UserAchievement from '#models/user_achievement'
import Workout from '#models/workout'
import TrainerAthlete from '#models/trainer_athlete'
import db from '@adonisjs/lucid/services/db'
import type UserStreak from '#models/user_streak'
import { XpService } from './XpService.js'
import type { XpRewardKey } from './xp_logic.js'
import { ProgressionService } from './ProgressionService.js'

export default class AchievementService {
  /**
   * Проверить и разблокировать новые достижения.
   * userStreak необязателен — нужен только для streak-типов.
   */
  static async checkAndUnlockAchievements(
    userId: number,
    userStreak?: UserStreak | null
  ): Promise<Achievement[]> {
    const allAchievements = await Achievement.query().where('isActive', true)

    const existingUserAchievements = await UserAchievement.query()
      .where('userId', userId)
      .select('achievementId')

    const existingIds = new Set(existingUserAchievements.map((ua) => ua.achievementId))

    const unearnedTypes = new Set(
      allAchievements.filter((a) => !existingIds.has(a.id)).map((a) => a.requirementType)
    )

    // Ленивая загрузка счётчиков — только нужных типов
    let workoutCount = 0
    if (unearnedTypes.has('total_workouts')) {
      const result = await Workout.query().where('userId', userId).count('* as total')
      workoutCount = Number((result[0] as any).$extras.total ?? 0)
    }

    let aiChatCount = 0
    if (unearnedTypes.has('ai_chat_messages')) {
      const result = await db
        .from('balance_transactions')
        .where('user_id', userId)
        .where('description', 'like', 'AI-чат%')
        .count('* as total')
      aiChatCount = Number((result[0] as any).total ?? 0)
    }

    let groupsJoined = 0
    if (unearnedTypes.has('groups_joined')) {
      const result = await db.from('group_athletes').where('athlete_id', userId).count('* as total')
      groupsJoined = Number((result[0] as any).total ?? 0)
    }

    let trainersConnected = 0
    if (unearnedTypes.has('trainers_connected')) {
      const result = await TrainerAthlete.query()
        .where('athleteId', userId)
        .where('status', 'active')
        .count('* as total')
      trainersConnected = Number((result[0] as any).$extras.total ?? 0)
    }

    let trainerMessages = 0
    if (unearnedTypes.has('trainer_messages')) {
      const result = await db
        .from('messages')
        .join('chats', 'chats.id', 'messages.chat_id')
        .where('messages.sender_id', userId)
        .where('chats.type', 'personal')
        .count('messages.id as total')
      trainerMessages = Number((result[0] as any).total ?? 0)
    }

    let personalRecords = 0
    if (unearnedTypes.has('personal_records')) {
      personalRecords = await ProgressionService.countPersonalRecords(userId)
    }

    let progressionCoeff: number | null = null
    if (unearnedTypes.has('progression_coeff')) {
      progressionCoeff = await ProgressionService.getProgressionCoeff(userId)
    }

    const newlyUnlocked: Achievement[] = []

    for (const achievement of allAchievements) {
      if (existingIds.has(achievement.id)) continue

      const shouldUnlock = this.checkAchievementCondition(achievement, {
        userStreak: userStreak ?? null,
        workoutCount,
        aiChatCount,
        groupsJoined,
        trainerMessages,
        trainersConnected,
        personalRecords,
        progressionCoeff,
      })

      if (shouldUnlock) {
        await UserAchievement.create({
          userId,
          achievementId: achievement.id,
          unlockedAt: DateTime.now(),
          isSeen: false,
        })

        // XP за ачивку в зависимости от категории
        const xpKey: XpRewardKey =
          achievement.category === 'progress'
            ? 'ACHIEVEMENT_LARGE'
            : achievement.category === 'workout'
              ? 'ACHIEVEMENT_MEDIUM'
              : 'ACHIEVEMENT_SMALL'
        await XpService.award(userId, xpKey)

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
    ctx: {
      userStreak: UserStreak | null
      workoutCount: number
      aiChatCount: number
      groupsJoined: number
      trainerMessages: number
      trainersConnected: number
      personalRecords: number
      progressionCoeff: number | null
    }
  ): boolean {
    const val = achievement.requirementValue || 0
    switch (achievement.requirementType) {
      case 'streak_days':
        return ctx.userStreak ? ctx.userStreak.currentStreak >= val : false

      case 'total_workouts':
        return ctx.workoutCount >= val

      case 'ai_chat_messages':
        return ctx.aiChatCount >= val

      case 'groups_joined':
        return ctx.groupsJoined >= val

      case 'trainer_messages':
        return ctx.trainerMessages >= val

      case 'trainers_connected':
        return ctx.trainersConnected >= val

      case 'streak_intensive_weeks':
        return (
          ctx.userStreak !== null &&
          ctx.userStreak.mode === 'intensive' &&
          ctx.userStreak.currentStreak >= val
        )

      case 'personal_records':
        return ctx.personalRecords >= val

      case 'progression_coeff':
        return ctx.progressionCoeff !== null && ctx.progressionCoeff >= val

      default:
        return false
    }
  }
}
