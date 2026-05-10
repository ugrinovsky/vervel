import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class TrainerCustomExercise extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare trainerId: number

  @column()
  declare name: string

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
