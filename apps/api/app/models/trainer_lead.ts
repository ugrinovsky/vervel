import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export type TrainerLeadCrmStatus = 'new' | 'contacted' | 'trial' | 'converted' | 'lost'

export default class TrainerLead extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare trainerId: number

  @column()
  declare name: string

  @column()
  declare phone: string

  @column()
  declare email: string | null

  @column()
  declare source: string | null

  @column()
  declare crmStatus: TrainerLeadCrmStatus

  @column()
  declare note: string | null

  @column.dateTime()
  declare nextFollowUpAt: DateTime | null

  @column()
  declare convertedAthleteId: number | null

  @belongsTo(() => User, { foreignKey: 'trainerId' })
  declare trainer: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'convertedAthleteId' })
  declare convertedAthlete: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
