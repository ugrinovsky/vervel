import { DateTime } from 'luxon'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { SoftDeletes } from 'adonis-lucid-soft-deletes'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import WorkoutTemplate from './workout_template.js'
import type { ExerciseData } from './workout_template.js'

export type WorkoutStatus = 'scheduled' | 'completed' | 'cancelled'

export interface AssignedTo {
  type: 'group' | 'athlete'
  id: number
  name: string
}

export interface WorkoutData {
  type: 'crossfit' | 'bodybuilding' | 'cardio'
  exercises: ExerciseData[]
  duration?: number
  notes?: string
}

export default class ScheduledWorkout extends compose(BaseModel, SoftDeletes) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare trainerId: number

  @column.dateTime()
  declare scheduledDate: DateTime

  @column({
    prepare: (value: WorkoutData) => JSON.stringify(value),
    consume: (value: string | WorkoutData) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare workoutData: WorkoutData

  @column({
    prepare: (value: AssignedTo[]) => JSON.stringify(value),
    consume: (value: string | AssignedTo[]) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare assignedTo: AssignedTo[]

  @column()
  declare status: WorkoutStatus

  @column()
  declare notes: string | null

  @column()
  declare templateId: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User, { foreignKey: 'trainerId' })
  declare trainer: BelongsTo<typeof User>

  @belongsTo(() => WorkoutTemplate, { foreignKey: 'templateId' })
  declare template: BelongsTo<typeof WorkoutTemplate>
}
