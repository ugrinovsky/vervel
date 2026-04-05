import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import UserExerciseStandard from './user_exercise_standard.js'

export default class UserExerciseStandardAlias extends BaseModel {
  static table = 'user_exercise_standard_aliases'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare sourceExerciseId: string

  @column()
  declare standardId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => UserExerciseStandard, { foreignKey: 'standardId' })
  declare standard: BelongsTo<typeof UserExerciseStandard>
}
