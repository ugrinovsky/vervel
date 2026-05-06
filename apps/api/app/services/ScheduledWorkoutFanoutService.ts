import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import Workout from '#models/workout'
import type { ExerciseData } from '#services/WorkoutConverter'
import { toWorkoutExercises } from '#services/WorkoutConverter'
import { WorkoutCalculator } from '#services/WorkoutCalculator'

export type AssignedToItem = { type: 'group' | 'athlete'; id: number; name: string }

export type ScheduledWorkoutData = {
  type: 'crossfit' | 'bodybuilding' | 'cardio'
  exercises: ExerciseData[]
  notes?: string
}

export async function resolveAthleteIds(assignedTo: AssignedToItem[]): Promise<number[]> {
  const ids = new Set<number>()
  for (const a of assignedTo) {
    if (a.type === 'athlete') {
      ids.add(a.id)
    } else {
      const rows = await db.from('group_athletes').where('group_id', a.id)
      for (const r of rows) ids.add(r.athlete_id)
    }
  }
  return [...ids]
}

export async function syncAthleteWorkoutsForScheduledWorkout(opts: {
  scheduledWorkoutId: number
  scheduledDate: DateTime
  workoutData: ScheduledWorkoutData
  assignedTo: AssignedToItem[]
}): Promise<{ athleteIds: number[] }> {
  const athleteIds = await resolveAthleteIds(opts.assignedTo)

  await db.transaction(async (trx) => {
    await Workout.query({ client: trx })
      .where('scheduledWorkoutId', opts.scheduledWorkoutId)
      .delete()

    if (athleteIds.length === 0) return

    const workoutExercises = toWorkoutExercises(opts.workoutData.exercises, opts.workoutData.type)

    let calculated = {
      zonesLoad: {} as Record<string, number>,
      zonesLoadAbs: {} as Record<string, number>,
      totalIntensity: 0,
      totalVolume: 0,
    }
    if (workoutExercises.length > 0) {
      try {
        calculated = await WorkoutCalculator.calculateZoneLoads(
          workoutExercises,
          opts.workoutData.type
        )
      } catch (err) {
        logger.warn({ err }, 'scheduled_workout:calculateZoneLoads failed — using empty zones')
      }
    }

    await Promise.all(
      athleteIds.map((athleteId) =>
        Workout.create(
          {
            userId: athleteId,
            date: opts.scheduledDate,
            workoutType: opts.workoutData.type,
            exercises: workoutExercises,
            notes: opts.workoutData.notes || '',
            zonesLoad: calculated.zonesLoad,
            zonesLoadAbs: calculated.zonesLoadAbs,
            totalIntensity: calculated.totalIntensity,
            totalVolume: calculated.totalVolume,
            scheduledWorkoutId: opts.scheduledWorkoutId,
          },
          { client: trx }
        )
      )
    )
  })

  return { athleteIds }
}
