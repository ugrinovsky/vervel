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
      if (Array.isArray(value)) return value.map((z) => String(z))
      if (typeof value === 'string') {
        try {
          const parsed: string | number | boolean | null | object = JSON.parse(value)
          return Array.isArray(parsed) ? parsed.map((z) => String(z)) : null
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
