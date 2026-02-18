import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import User from './user.js'
import ScheduledWorkout from './scheduled_workout.js'

export type WorkoutType = 'crossfit' | 'bodybuilding' | 'cardio'

export interface ExerciseData {
  name: string
  sets?: number
  reps?: number
  weight?: number
  duration?: number
  distance?: number
  notes?: string
}

export default class WorkoutTemplate extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare trainerId: number

  @column()
  declare name: string

  @column()
  declare workoutType: WorkoutType

  @column({
    prepare: (value: ExerciseData[]) => JSON.stringify(value),
    consume: (value: string | ExerciseData[]) =>
      typeof value === 'string' ? JSON.parse(value) : value,
  })
  declare exercises: ExerciseData[]

  @column()
  declare description: string | null

  @column()
  declare isPublic: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User, { foreignKey: 'trainerId' })
  declare trainer: BelongsTo<typeof User>

  @hasMany(() => ScheduledWorkout, { foreignKey: 'templateId' })
  declare scheduledWorkouts: HasMany<typeof ScheduledWorkout>
}
