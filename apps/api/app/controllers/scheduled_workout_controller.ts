import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import emitter from '@adonisjs/core/services/emitter'
import ScheduledWorkout from '#models/scheduled_workout'
import Workout from '#models/workout'
import { WorkoutCalculator } from '#services/WorkoutCalculator'
import { toWorkoutExercises, type ExerciseData } from '#services/WorkoutConverter'
import { parseDateRange } from '#utils/date'

/**
 * Resolve assignedTo list to a flat array of athlete user IDs.
 */
async function resolveAthleteIds(
  assignedTo: { type: 'group' | 'athlete'; id: number }[]
): Promise<number[]> {
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
 * Create Workout entries for all assigned athletes.
 */
async function createAthleteWorkouts(
  scheduledWorkoutId: number,
  scheduledDate: DateTime,
  workoutData: { type: 'crossfit' | 'bodybuilding' | 'cardio'; exercises: ExerciseData[]; notes?: string },
  assignedTo: { type: 'group' | 'athlete'; id: number }[]
): Promise<void> {
  const athleteIds = await resolveAthleteIds(assignedTo)
  if (athleteIds.length === 0) return

  const workoutExercises = toWorkoutExercises(workoutData.exercises, workoutData.type)

  let calculated = { zonesLoad: {} as Record<string, number>, totalIntensity: 0, totalVolume: 0 }
  if (workoutExercises.length > 0) {
    try {
      calculated = await WorkoutCalculator.calculateZoneLoads(workoutExercises, workoutData.type)
    } catch (err) {
      logger.warn({ err }, 'scheduled_workout:calculateZoneLoads failed — using empty zones')
    }
  }

  await Promise.all(
    athleteIds.map((athleteId) =>
      Workout.create({
        userId: athleteId,
        date: scheduledDate,
        workoutType: workoutData.type,
        exercises: workoutExercises,
        notes: workoutData.notes || '',
        zonesLoad: calculated.zonesLoad,
        totalIntensity: calculated.totalIntensity,
        totalVolume: calculated.totalVolume,
        scheduledWorkoutId,
      })
    )
  )
}

export default class ScheduledWorkoutController {
  /**
   * Get scheduled workouts for a period
   * GET /trainer/scheduled-workouts?from=&to=
   */
  async list({ auth, request, response }: HttpContext) {
    const trainer = auth.user!
    const range = parseDateRange(request.input('from'), request.input('to'), response)
    if (!range) return
    const { from, to } = range

    const workouts = await ScheduledWorkout.query()
      .where('trainerId', trainer.id)
      .whereBetween('scheduledDate', [from, to])
      .orderBy('scheduledDate', 'asc')

    return response.ok({
      success: true,
      data: workouts.map((w) => ({
        id: w.id,
        scheduledDate: w.scheduledDate,
        workoutData: w.workoutData,
        assignedTo: w.assignedTo,
        status: w.status,
        notes: w.notes,
        templateId: w.templateId,
        createdAt: w.createdAt,
      })),
    })
  }

  /**
   * Get scheduled workouts for today
   * GET /trainer/scheduled-workouts/today
   */
  async today({ auth, response }: HttpContext) {
    const trainer = auth.user!
    const today = DateTime.now().startOf('day')
    const tomorrow = today.plus({ days: 1 })

    const workouts = await ScheduledWorkout.query()
      .where('trainerId', trainer.id)
      .whereBetween('scheduledDate', [today.toJSDate(), tomorrow.toJSDate()])
      .where('status', 'scheduled')
      .orderBy('scheduledDate', 'asc')

    return response.ok({
      success: true,
      data: workouts.map((w) => ({
        id: w.id,
        scheduledDate: w.scheduledDate,
        workoutData: w.workoutData,
        assignedTo: w.assignedTo,
        status: w.status,
        notes: w.notes,
      })),
    })
  }

  /**
   * Create scheduled workout and corresponding athlete Workout entries
   * POST /trainer/scheduled-workouts
   */
  async create({ auth, request, response }: HttpContext) {
    const trainer = auth.user!
    const { scheduledDate, workoutData, assignedTo, notes, templateId } = request.only([
      'scheduledDate',
      'workoutData',
      'assignedTo',
      'notes',
      'templateId',
    ])

    if (!scheduledDate || !workoutData) {
      return response.badRequest({
        message: 'scheduledDate и workoutData обязательны',
      })
    }

    const parsedDate = DateTime.fromISO(scheduledDate)

    const workout = await ScheduledWorkout.create({
      trainerId: trainer.id,
      scheduledDate: parsedDate,
      workoutData,
      assignedTo: assignedTo || [],
      status: 'scheduled',
      notes: notes || null,
      templateId: templateId || null,
    })

    // Create Workout entries for each assigned athlete + send push notifications
    if (Array.isArray(assignedTo) && assignedTo.length > 0) {
      await createAthleteWorkouts(workout.id, parsedDate, workoutData, assignedTo).catch(() => {})
      resolveAthleteIds(assignedTo).then((athleteIds) => {
        if (athleteIds.length > 0) {
          emitter.emit('push:workout_scheduled', {
            athleteIds,
            scheduledDate: parsedDate.toFormat('d MMM', { locale: 'ru' }),
            trainerName: trainer.fullName ?? trainer.email,
          })
        }
      }).catch(() => {})
    }

    return response.created({
      success: true,
      data: {
        id: workout.id,
        scheduledDate: workout.scheduledDate,
        workoutData: workout.workoutData,
        assignedTo: workout.assignedTo,
        status: workout.status,
        notes: workout.notes,
      },
    })
  }

  /**
   * Update scheduled workout and sync athlete Workout entries
   * PUT /trainer/scheduled-workouts/:id
   */
  async update({ auth, params, request, response }: HttpContext) {
    const trainer = auth.user!

    const workout = await ScheduledWorkout.query()
      .where('id', params.id)
      .where('trainerId', trainer.id)
      .first()

    if (!workout) {
      return response.notFound({ message: 'Тренировка не найдена' })
    }

    const { scheduledDate, workoutData, assignedTo, status, notes } = request.only([
      'scheduledDate',
      'workoutData',
      'assignedTo',
      'status',
      'notes',
    ])

    if (scheduledDate) workout.scheduledDate = DateTime.fromISO(scheduledDate)
    if (workoutData) workout.workoutData = workoutData
    if (assignedTo) workout.assignedTo = assignedTo
    if (status) workout.status = status
    if (notes !== undefined) workout.notes = notes

    await workout.save()

    // Sync: delete old athlete workouts and recreate them
    const newData = workoutData ?? workout.workoutData
    const newAssignedTo = assignedTo ?? workout.assignedTo
    if (newAssignedTo.length > 0) {
      await Workout.query().where('scheduledWorkoutId', workout.id).delete()
      await createAthleteWorkouts(
        workout.id,
        workout.scheduledDate,
        newData,
        newAssignedTo
      ).catch(() => {})
    }

    return response.ok({
      success: true,
      data: {
        id: workout.id,
        scheduledDate: workout.scheduledDate,
        workoutData: workout.workoutData,
        assignedTo: workout.assignedTo,
        status: workout.status,
        notes: workout.notes,
      },
    })
  }

  /**
   * Delete scheduled workout and its athlete Workout entries
   * DELETE /trainer/scheduled-workouts/:id
   */
  async delete({ auth, params, response }: HttpContext) {
    const trainer = auth.user!

    const workout = await ScheduledWorkout.query()
      .where('id', params.id)
      .where('trainerId', trainer.id)
      .first()

    if (!workout) {
      return response.notFound({ message: 'Тренировка не найдена' })
    }

    // Delete linked athlete Workout entries first
    await Workout.query().where('scheduledWorkoutId', workout.id).delete()

    await workout.delete()

    return response.ok({ success: true, message: 'Тренировка удалена' })
  }
}
