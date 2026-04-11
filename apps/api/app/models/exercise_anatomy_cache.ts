import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class ExerciseAnatomyCache extends BaseModel {
  static table = 'exercise_anatomy_cache'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'normalized_label' })
  declare normalizedLabel: string

  @column()
  declare status: 'ok' | 'unknown'

  @column({
    prepare: (value: string[] | null | undefined) =>
      value === null || value === undefined ? null : JSON.stringify(value),
    consume: (value: unknown) => {
      if (value === null || value === undefined) return null
      if (Array.isArray(value)) return value as string[]
      if (typeof value === 'string') {
        try {
          return JSON.parse(value) as string[]
        } catch {
          return null
        }
      }
      return null
    },
  })
  declare zones: string[] | null

  @column({ columnName: 'prompt_version' })
  declare promptVersion: string

  @column({ columnName: 'model_id' })
  declare modelId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
