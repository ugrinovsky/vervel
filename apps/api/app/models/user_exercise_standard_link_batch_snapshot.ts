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
      if (Array.isArray(value)) {
        return value.map((t) => ({
          source: typeof t?.source === 'string' ? t.source : '',
          beforeStandardId: typeof t?.beforeStandardId === 'number' ? t.beforeStandardId : null,
        }))
      }
      if (typeof value === 'string') {
        try {
          const parsed: string | number | boolean | null | object = JSON.parse(value)
          if (!Array.isArray(parsed)) return []
          return parsed.map((t) => ({
            source: typeof t?.source === 'string' ? t.source : '',
            beforeStandardId: typeof t?.beforeStandardId === 'number' ? t.beforeStandardId : null,
          }))
        } catch {
          return []
        }
      }
      return []
    },
  })
  declare touchesJson: StandardLinkTouch[]

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
