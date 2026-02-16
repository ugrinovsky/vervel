import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class TrainerAthlete extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare trainerId: number

  @column()
  declare athleteId: number | null

  @column()
  declare status: 'active' | 'pending'

  @column()
  declare inviteToken: string | null

  @belongsTo(() => User, { foreignKey: 'trainerId' })
  declare trainer: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'athleteId' })
  declare athlete: BelongsTo<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
