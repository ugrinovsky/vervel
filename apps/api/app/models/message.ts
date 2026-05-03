import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import Chat from './chat.js'

export default class Message extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare chatId: number

  @column()
  declare senderId: number | null

  @column()
  declare content: string

  @column()
  declare aiGenerated: boolean

  /** Фактически списано ₽ за ответ ассистента (только при aiGenerated) */
  @column()
  declare aiCharge: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Chat, { foreignKey: 'chatId' })
  declare chat: BelongsTo<typeof Chat>

  @belongsTo(() => User, { foreignKey: 'senderId' })
  declare sender: BelongsTo<typeof User>

  serialize() {
    if (this.aiGenerated) {
      const charge =
        this.aiCharge === null || this.aiCharge === undefined ? null : Number(this.aiCharge)
      return {
        id: this.id,
        content: this.content,
        senderId: null,
        sender: null,
        createdAt: this.createdAt,
        aiGenerated: true,
        aiCharge: charge,
      }
    }

    return {
      id: this.id,
      content: this.content,
      senderId: this.senderId,
      sender: {
        id: this.sender.id,
        fullName: this.sender.fullName,
        email: this.sender.email,
      },
      createdAt: this.createdAt,
      aiGenerated: false,
      aiCharge: null,
    }
  }
}
