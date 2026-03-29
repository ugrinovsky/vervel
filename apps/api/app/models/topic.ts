import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Chat from './chat.js'
import TrainerGroup from './trainer_group.js'

export default class Topic extends BaseModel {
  static table = 'topics'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare groupId: number

  @column()
  declare chatId: number

  @column()
  declare name: string

  @column()
  declare emoji: string | null

  @column()
  declare order: number

  @column()
  declare isDefault: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => TrainerGroup, { foreignKey: 'groupId' })
  declare group: BelongsTo<typeof TrainerGroup>

  @belongsTo(() => Chat, { foreignKey: 'chatId' })
  declare chat: BelongsTo<typeof Chat>
}
