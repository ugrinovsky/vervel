import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import type { JsonObject } from '#utils/type_guards'

export type StreakEventType =
  | 'workout_completed'
  | 'streak_continued'
  | 'streak_broken'
  | 'new_record'

export default class StreakHistory extends BaseModel {
  static table = 'streak_history'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column.date()
  declare date: DateTime

  @column()
  declare eventType: StreakEventType

  @column()
  declare streakValue: number

  @column()
  declare metadata: JsonObject | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
