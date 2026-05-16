import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import TrainerAthlete from './trainer_athlete.js'
import TrainerAthletePassUsage from './trainer_athlete_pass_usage.js'

export type PassStatus = 'active' | 'depleted' | 'expired' | 'cancelled'

export default class TrainerAthletePass extends BaseModel {
  static table = 'trainer_athlete_passes'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare trainerAthleteId: number

  @column()
  declare title: string

  @column()
  declare priceAmount: number

  @column()
  declare sessionsTotal: number

  @column.date()
  declare validFrom: DateTime

  @column.date()
  declare validUntil: DateTime | null

  @column()
  declare status: PassStatus

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => TrainerAthlete)
  declare trainerAthlete: BelongsTo<typeof TrainerAthlete>

  @hasMany(() => TrainerAthletePassUsage, { foreignKey: 'passId' })
  declare usages: HasMany<typeof TrainerAthletePassUsage>
}
