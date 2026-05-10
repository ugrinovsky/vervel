import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import ScheduledWorkout from '#models/scheduled_workout'
import TrainerLead from '#models/trainer_lead'
import { isScheduledRestDay } from '#utils/scheduled_workout_entry'
import Workout from '#models/workout'
import { JobQueueService } from '#services/JobQueueService'
import type { AssignedToItem } from '#services/ScheduledWorkoutFanoutService'
import { parseDateRange } from '#utils/date'
import { isScheduledWorkoutCalendarPayload } from '#utils/scheduled_workout_types'
import { isRecord } from '#utils/type_guards'

function payloadHasTrainerLeadId(body: Record<string, unknown>): boolean {
  return Object.prototype.hasOwnProperty.call(body, 'trainerLeadId')
}

/** Разрешение FK лида для вводной: null снимает привязку */
async function resolveIntroTrainerLeadFk(
  trainerId: number,
  leadIdRaw: unknown
): Promise<{ ok: true; fk: number | null } | { ok: false; msg: string }> {
  if (leadIdRaw === null || leadIdRaw === undefined) {
    return { ok: true, fk: null }
  }
  if (typeof leadIdRaw !== 'number' || !Number.isInteger(leadIdRaw) || leadIdRaw < 1) {
    return { ok: false, msg: 'Некорректный trainerLeadId' }
  }
  const lead = await TrainerLead.query()
    .where('id', leadIdRaw)
    .where('trainerId', trainerId)
    .first()
  if (!lead) {
    return { ok: false, msg: 'Лид не найден' }
  }
  return { ok: true, fk: lead.id }
}

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
        trainerLeadId: w.trainerLeadId ?? null,
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
        trainerLeadId: w.trainerLeadId ?? null,
      })),
    })
  }

  /**
   * Create scheduled workout and corresponding athlete Workout entries
   * POST /trainer/scheduled-workouts
   */
  async create({ auth, request, response }: HttpContext) {
    const trainer = auth.user!
    const bodyPayload = request.all() as Record<string, unknown>
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

    let trainerLeadId: number | null = null
    if (workoutData.type === 'intro') {
      const resolved = await resolveIntroTrainerLeadFk(trainer.id, bodyPayload['trainerLeadId'])
      if (!resolved.ok) {
        return response.badRequest({ message: resolved.msg })
      }
      trainerLeadId = resolved.fk
    } else if (
      payloadHasTrainerLeadId(bodyPayload) &&
      bodyPayload['trainerLeadId'] !== null &&
      bodyPayload['trainerLeadId'] !== undefined
    ) {
      return response.badRequest({
        message: 'trainerLeadId допустим только для вводной тренировки',
      })
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
      trainerLeadId: workoutData.type === 'intro' ? trainerLeadId : null,
    })

    // Durable fan-out: create/sync athlete Workouts + send push notifications via jobs.
    if (workout.assignedTo.length > 0) {
      await JobQueueService.enqueue({
        type: 'scheduled_workout_fanout',
        payload: { scheduledWorkoutId: workout.id, mode: 'create' },
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
        trainerLeadId: workout.trainerLeadId ?? null,
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

    const bodyPayload = request.all() as Record<string, unknown>

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

    const mergedType = workout.workoutData.type

    if (mergedType !== 'intro') {
      workout.trainerLeadId = null
    } else if (payloadHasTrainerLeadId(bodyPayload)) {
      const resolved = await resolveIntroTrainerLeadFk(trainer.id, bodyPayload['trainerLeadId'])
      if (!resolved.ok) {
        return response.badRequest({ message: resolved.msg })
      }
      workout.trainerLeadId = resolved.fk
    }

    await workout.save()

    // Durable sync of athlete workouts
    const newAssignedTo = workout.assignedTo as AssignedToItem[]
    if (newAssignedTo.length > 0) {
      await JobQueueService.enqueue({
        type: 'scheduled_workout_fanout',
        payload: { scheduledWorkoutId: workout.id, mode: 'update' },
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
        trainerLeadId: workout.trainerLeadId ?? null,
      },
    })
  }

  /**
   * Get athlete results for a specific scheduled workout (trainer only)
   * GET /trainer/scheduled-workouts/:id/results
   *
   * Returns all Workout rows linked via scheduledWorkoutId that belong to
   * athletes of this trainer. Includes isDetached flag so the trainer can see
   * who customised their plan.
   */
  async results({ auth, params, response }: HttpContext) {
    const trainer = auth.user!

    const scheduledWorkout = await ScheduledWorkout.query()
      .where('id', params.id)
      .where('trainerId', trainer.id)
      .first()

    if (!scheduledWorkout) {
      return response.notFound({ message: 'Тренировка не найдена' })
    }

    const athleteWorkouts = await Workout.query()
      .where('scheduledWorkoutId', scheduledWorkout.id)
      .orderBy('userId', 'asc')

    return response.ok({
      success: true,
      data: athleteWorkouts.map((w) => ({
        id: w.id,
        athleteId: w.userId,
        date: w.date,
        workoutType: w.workoutType,
        exercises: w.exercises,
        notes: w.notes,
        rpe: w.rpe,
        totalVolume: w.totalVolume,
        totalIntensity: w.totalIntensity,
        isDetached: w.isDetached,
        scheduledWorkoutId: w.scheduledWorkoutId,
      })),
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
