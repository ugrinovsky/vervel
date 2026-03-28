import db from '@adonisjs/lucid/services/db'
import { computeLevel, XP_REWARDS, type XpRewardKey } from './xpLogic.js'

export class XpService {
  /**
   * Начислить XP пользователю. Атомарный инкремент через DB.
   * Возвращает новый общий XP.
   */
  static async award(userId: number, reward: XpRewardKey): Promise<number> {
    const amount = XP_REWARDS[reward]
    await db.from('users').where('id', userId).increment('xp', amount)
    const row = await db.from('users').where('id', userId).select('xp').firstOrFail()
    return Number(row.xp)
  }

  /**
   * Получить текущий XP и уровень пользователя.
   */
  static async getLevelInfo(userId: number) {
    const row = await db.from('users').where('id', userId).select('xp').firstOrFail()
    return computeLevel(Number(row.xp))
  }
}
