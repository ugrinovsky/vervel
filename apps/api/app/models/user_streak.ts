import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class UserStreak extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare currentStreak: number

  @column()
  declare longestStreak: number

  @column.date()
  declare lastWorkoutDate: DateTime | null

  @column.dateTime()
  declare streakStartedAt: DateTime | null

  @column.dateTime()
  declare longestStreakAchievedAt: DateTime | null

  @column()
  declare mode: string  // 'simple' | 'intensive'

  @column()
  declare currentWeekWorkouts: number

  @column.date()
  declare currentWeekStart: DateTime | null

  @column()
  declare currentWeekCompleted: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
