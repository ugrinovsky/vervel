import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export type StandardLinkTouch = { source: string; beforeStandardId: number | null }

export default class UserExerciseStandardLinkBatchSnapshot extends BaseModel {
  static table = 'user_exercise_standard_link_batch_snapshots'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column({
    columnName: 'touches_json',
    prepare: (value: StandardLinkTouch[]) => JSON.stringify(value),
    consume: (value: unknown) => {
      if (typeof value !== 'string') return value as StandardLinkTouch[]
      try {
        return JSON.parse(value) as StandardLinkTouch[]
      } catch {
        return []
      }
    },
  })
  declare touchesJson: StandardLinkTouch[]

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
