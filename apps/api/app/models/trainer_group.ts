import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class TrainerGroup extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare trainerId: number

  @column()
  declare name: string

  @belongsTo(() => User, { foreignKey: 'trainerId' })
  declare trainer: BelongsTo<typeof User>

  @manyToMany(() => User, {
    pivotTable: 'group_athletes',
    localKey: 'id',
    pivotForeignKey: 'group_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'athlete_id',
  })
  declare athletes: ManyToMany<typeof User>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null
}
