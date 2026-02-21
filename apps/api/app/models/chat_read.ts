import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class ChatRead extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare chatId: number

  @column()
  declare userId: number

  @column.dateTime()
  declare lastReadAt: DateTime
}
