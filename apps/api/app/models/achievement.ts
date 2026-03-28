import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Achievement extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare key: string

  @column()
  declare category: 'streak' | 'workout' | 'usage' | 'social' | 'progress'

  @column()
  declare title: string

  @column()
  declare description: string

  @column()
  declare icon: string

  @column()
  declare color: string

  @column()
  declare requirementValue: number | null

  @column()
  declare requirementType: string | null

  @column()
  declare isActive: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
