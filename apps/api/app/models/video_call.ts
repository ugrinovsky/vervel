import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import TrainerGroup from '#models/trainer_group'

export default class VideoCall extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare roomName: string

  @column()
  declare trainerId: number

  @column()
  declare athleteId: number | null

  @column()
  declare groupId: number | null

  @column()
  declare status: 'pending' | 'active' | 'ended'

  @column.dateTime()
  declare startedAt: DateTime | null

  @column.dateTime()
  declare endedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User, { foreignKey: 'trainerId' })
  declare trainer: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'athleteId' })
  declare athlete: BelongsTo<typeof User>

  @belongsTo(() => TrainerGroup, { foreignKey: 'groupId' })
  declare group: BelongsTo<typeof TrainerGroup>
}
