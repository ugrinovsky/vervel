import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import ScheduledWorkout from '#models/scheduled_workout'

export default class ScheduledWorkoutController {
  /**
   * Get scheduled workouts for a period
   * GET /trainer/scheduled-workouts?from=&to=
   */
  async list({ auth, request, response }: HttpContext) {
    const trainer = auth.user!
    const from = request.input('from')
    const to = request.input('to')

    if (!from || !to) {
      return response.badRequest({ message: 'Параметры "from" и "to" обязательны' })
    }

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
   * Create scheduled workout
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

    if (!scheduledDate || !workoutData || !assignedTo || assignedTo.length === 0) {
      return response.badRequest({
        message: 'scheduledDate, workoutData и assignedTo обязательны',
      })
    }

    const workout = await ScheduledWorkout.create({
      trainerId: trainer.id,
      scheduledDate: DateTime.fromISO(scheduledDate),
      workoutData,
      assignedTo,
      status: 'scheduled',
      notes: notes || null,
      templateId: templateId || null,
    })

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
   * Update scheduled workout
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
      workout.scheduledDate = DateTime.fromISO(scheduledDate)
    }
    if (workoutData) {
      workout.workoutData = workoutData
    }
    if (assignedTo) {
      workout.assignedTo = assignedTo
    }
    if (status) {
      workout.status = status
    }
    if (notes !== undefined) {
      workout.notes = notes
    }

    await workout.save()

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
   * Delete scheduled workout
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

    await workout.delete()

    return response.ok({ success: true, message: 'Тренировка удалена' })
  }
}
