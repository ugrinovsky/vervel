import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import TrainerGroup from './trainer_group.js'
import Message from './message.js'

export type ChatType = 'group' | 'personal'

export default class Chat extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare type: ChatType

  @column()
  declare trainerId: number

  @column()
  declare groupId: number | null

  @column()
  declare athleteId: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User, { foreignKey: 'trainerId' })
  declare trainer: BelongsTo<typeof User>

  @belongsTo(() => TrainerGroup, { foreignKey: 'groupId' })
  declare group: BelongsTo<typeof TrainerGroup>

  @belongsTo(() => User, { foreignKey: 'athleteId' })
  declare athlete: BelongsTo<typeof User>

  @hasMany(() => Message, { foreignKey: 'chatId' })
  declare messages: HasMany<typeof Message>
}
