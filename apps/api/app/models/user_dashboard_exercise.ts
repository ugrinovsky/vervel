import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class UserDashboardExercise extends BaseModel {
  static table = 'user_dashboard_exercises'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare exerciseId: string

  @column()
  declare sortOrder: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
