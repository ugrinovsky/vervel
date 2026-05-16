import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import TrainerAthletePass from './trainer_athlete_pass.js'

export default class TrainerAthletePassUsage extends BaseModel {
  static table = 'trainer_athlete_pass_usages'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare passId: number

  @column()
  declare workoutId: number | null

  @column()
  declare scheduledWorkoutId: number | null

  @column.dateTime()
  declare consumedAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => TrainerAthletePass)
  declare pass: BelongsTo<typeof TrainerAthletePass>
}
