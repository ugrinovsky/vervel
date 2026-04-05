import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class UserExerciseStandard extends BaseModel {
  static table = 'user_exercise_standards'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare catalogExerciseId: string | null

  @column()
  declare displayLabel: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
