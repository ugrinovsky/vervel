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

export type FanoutAction =
  | { action: 'create'; athleteId: number }
  | { action: 'update'; athleteId: number; workoutId: number }
  | { action: 'delete'; athleteId: number; workoutId: number }
  | { action: 'skip_detached'; athleteId: number }

/**
 * Pure function — no DB calls.
 * Given target athlete IDs and existing Workout rows, returns the list of
 * actions the fanout should perform.
 *
 * mode='create': always creates, never updates (used on first save).
 * mode='update': skips detached athletes, updates non-detached, creates
 *   newly-assigned athletes, deletes removed non-detached athletes (detached
 *   rows become the athlete's personal workout and are left alone).
 */
export function computeFanoutActions(opts: {
  mode: 'create' | 'update'
  targetAthleteIds: number[]
  existingRows: Array<{ id: number; userId: number; isDetached: boolean }>
}): FanoutAction[] {
  const { mode, targetAthleteIds, existingRows } = opts
  const actions: FanoutAction[] = []

  if (mode === 'create') {
    for (const athleteId of targetAthleteIds) {
      actions.push({ action: 'create', athleteId })
    }
    // Also delete any stale rows (shouldn't exist on create, but be safe)
    for (const row of existingRows) {
      if (!targetAthleteIds.includes(row.userId)) {
        actions.push({ action: 'delete', athleteId: row.userId, workoutId: row.id })
      }
    }
    return actions
  }

  // mode === 'update'
  const existingByAthleteId = new Map(existingRows.map((r) => [r.userId, r]))
  const targetSet = new Set(targetAthleteIds)

  // Handle athletes no longer in assignedTo
  for (const row of existingRows) {
    if (!targetSet.has(row.userId)) {
      if (row.isDetached) {
        // Athlete owns their copy now — leave it as a personal workout
        actions.push({ action: 'skip_detached', athleteId: row.userId })
      } else {
        actions.push({ action: 'delete', athleteId: row.userId, workoutId: row.id })
      }
    }
  }

  // Handle currently assigned athletes
  for (const athleteId of targetAthleteIds) {
    const existing = existingByAthleteId.get(athleteId)
    if (existing) {
      if (existing.isDetached) {
        actions.push({ action: 'skip_detached', athleteId })
      } else {
        actions.push({ action: 'update', athleteId, workoutId: existing.id })
      }
    } else {
      actions.push({ action: 'create', athleteId })
    }
  }

  return actions
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

/**
 * Sync athlete Workout rows for a scheduled workout.
 *
 * mode='create' — initial fanout on first save.
 * mode='update' — trainer edited existing scheduled workout; detached athletes
 *   keep their local versions.
 */
export async function syncAthleteWorkoutsForScheduledWorkout(opts: {
  scheduledWorkoutId: number
  scheduledDate: DateTime
  workoutData: ScheduledWorkoutData
  assignedTo: AssignedToItem[]
  mode: 'create' | 'update'
}): Promise<{ athleteIds: number[]; skippedDetached: number[] }> {
  const athleteIds = await resolveAthleteIds(opts.assignedTo)

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

  const skippedDetached: number[] = []

  await db.transaction(async (trx) => {
    const existingRows = await Workout.query({ client: trx })
      .where('scheduledWorkoutId', opts.scheduledWorkoutId)
      .select('id', 'userId', 'isDetached')

    const actions = computeFanoutActions({
      mode: opts.mode,
      targetAthleteIds: athleteIds,
      existingRows: existingRows.map((r) => ({
        id: r.id,
        userId: r.userId,
        isDetached: r.isDetached,
      })),
    })

    for (const act of actions) {
      if (act.action === 'skip_detached') {
        skippedDetached.push(act.athleteId)
        continue
      }

      if (act.action === 'delete') {
        await Workout.query({ client: trx }).where('id', act.workoutId).delete()
        continue
      }

      const workoutFields = {
        date: opts.scheduledDate,
        workoutType: opts.workoutData.type,
        exercises: workoutExercises,
        notes: opts.workoutData.notes || '',
        zonesLoad: calculated.zonesLoad,
        zonesLoadAbs: calculated.zonesLoadAbs,
        totalIntensity: calculated.totalIntensity,
        totalVolume: calculated.totalVolume,
      }

      if (act.action === 'create') {
        await Workout.create(
          {
            userId: act.athleteId,
            scheduledWorkoutId: opts.scheduledWorkoutId,
            isDetached: false,
            ...workoutFields,
          },
          { client: trx }
        )
        continue
      }

      if (act.action === 'update') {
        await Workout.query({ client: trx }).where('id', act.workoutId).update(workoutFields)
      }
    }
  })

  return { athleteIds, skippedDetached }
}
