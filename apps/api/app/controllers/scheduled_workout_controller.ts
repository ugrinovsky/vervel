import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import ScheduledWorkout from '#models/scheduled_workout'
import { isScheduledRestDay } from '#utils/scheduled_workout_entry'
import Workout from '#models/workout'
import { JobQueueService } from '#services/JobQueueService'
import type { AssignedToItem } from '#services/ScheduledWorkoutFanoutService'
import { parseDateRange } from '#utils/date'
import { isScheduledWorkoutCalendarPayload } from '#utils/scheduled_workout_types'
import { isRecord } from '#utils/type_guards'

function isAssignedToItem(v: unknown): v is AssignedToItem {
  return (
    isRecord(v) &&
    (v.type === 'group' || v.type === 'athlete') &&
    typeof v.id === 'number' &&
    Number.isFinite(v.id) &&
    typeof v.name === 'string' &&
    v.name.trim().length > 0
  )
}

function parseAssignedTo(v: unknown): AssignedToItem[] {
  if (!Array.isArray(v)) return []
  return v.filter(isAssignedToItem)
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

    const sessions = workouts.filter((w) => !isScheduledRestDay(w))

    return response.ok({
      success: true,
      data: sessions.map((w) => ({
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
    if (!isScheduledWorkoutCalendarPayload(workoutData)) {
      return response.badRequest({ message: 'Некорректный workoutData' })
    }

    // Client sends wall-clock local datetime without timezone suffix (e.g. "2026-04-07T15:00:00").
    // Parse it as UTC to preserve the same wall-clock time end-to-end.
    const parsedDate = DateTime.fromISO(scheduledDate, { zone: 'utc' })

    if (workoutData.type === 'rest_day') {
      const dayStart = parsedDate.startOf('day')
      const dayEnd = dayStart.plus({ days: 1 })
      const sameDay = await ScheduledWorkout.query()
        .where('trainerId', trainer.id)
        .whereBetween('scheduledDate', [dayStart.toJSDate(), dayEnd.toJSDate()])
        .where('status', 'scheduled')
      for (const row of sameDay) {
        if (isScheduledRestDay(row)) await row.delete()
      }
    }

    const workout = await ScheduledWorkout.create({
      trainerId: trainer.id,
      scheduledDate: parsedDate,
      workoutData,
      assignedTo: parseAssignedTo(assignedTo),
      status: 'scheduled',
      notes: notes || null,
      templateId: templateId || null,
    })

    // Durable fan-out: create/sync athlete Workouts + send push notifications via jobs.
    if (workout.assignedTo.length > 0) {
      await JobQueueService.enqueue({
        type: 'scheduled_workout_fanout',
        payload: { scheduledWorkoutId: workout.id },
        maxAttempts: 10,
      })
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

    if (scheduledDate) {
      // Preserve wall-clock time (see create()).
      workout.scheduledDate = DateTime.fromISO(scheduledDate, { zone: 'utc' })
    }
    if (workoutData) {
      if (!isScheduledWorkoutCalendarPayload(workoutData)) {
        return response.badRequest({ message: 'Некорректный workoutData' })
      }
      workout.workoutData = workoutData
    }
    if (assignedTo !== undefined) {
      workout.assignedTo = parseAssignedTo(assignedTo)
    }
    if (status) workout.status = status
    if (notes !== undefined) workout.notes = notes

    await workout.save()

    // Durable sync of athlete workouts
    const newAssignedTo = workout.assignedTo as AssignedToItem[]
    if (newAssignedTo.length > 0) {
      await JobQueueService.enqueue({
        type: 'scheduled_workout_fanout',
        payload: { scheduledWorkoutId: workout.id },
        maxAttempts: 10,
      })
    } else {
      // Keep DB consistent: if assignments removed, delete child workouts synchronously.
      await Workout.query().where('scheduledWorkoutId', workout.id).delete()
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
