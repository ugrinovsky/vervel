import crypto from 'node:crypto'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import { PushNotificationService } from '#services/PushNotificationService'
import ScheduledWorkout from '#models/scheduled_workout'
import User from '#models/user'
import {
  syncAthleteWorkoutsForScheduledWorkout,
  type AssignedToItem,
  type ScheduledWorkoutData,
} from '#services/ScheduledWorkoutFanoutService'
import { isRecord } from '#utils/type_guards'

type PushJobPayload =
  | {
      event: 'push:message'
      data: { senderName: string; content: string; recipientIds: number[]; url: string }
    }
  | {
      event: 'push:athlete_added'
      data: { athleteId: number; trainerName: string }
    }
  | {
      event: 'push:invite_accepted'
      data: { trainerId: number; athleteName: string }
    }
  | {
      event: 'push:workout_scheduled'
      data: { athleteIds: number[]; scheduledDate: string; trainerName: string }
    }
  | {
      event: 'push:call_incoming'
      data: { recipientIds: number[]; trainerName: string }
    }

function parseJsonPayload(raw: unknown): unknown {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  }
  return raw
}

function isPushJobPayload(v: unknown): v is PushJobPayload {
  if (!isRecord(v) || typeof v.event !== 'string' || !('data' in v)) return false
  return String(v.event).startsWith('push:')
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

function isScheduledWorkoutData(v: unknown): v is ScheduledWorkoutData {
  if (!isRecord(v)) return false
  if (v.type !== 'crossfit' && v.type !== 'bodybuilding' && v.type !== 'cardio') return false
  if (!Array.isArray(v.exercises)) return false
  return true
}

export class JobWorkerService {
  private readonly workerId = crypto.randomBytes(8).toString('hex')

  async runOnce(): Promise<number> {
    const now = DateTime.now().toJSDate()

    const job = await db.transaction(async (trx) => {
      const row = await trx
        .from('jobs')
        .where('status', 'queued')
        .where('run_at', '<=', now)
        .orderBy('run_at', 'asc')
        .forUpdate()
        .skipLocked()
        .first()

      if (!row) return null

      await trx
        .from('jobs')
        .where('id', row.id)
        .update({
          status: 'processing',
          locked_at: new Date(),
          locked_by: this.workerId,
          attempts: Number(row.attempts ?? 0) + 1,
          updated_at: new Date(),
        })

      return row
    })

    if (!job) return 0

    const jobId = Number(job.id)
    const type = String(job.type)
    const maxAttempts = Number(job.max_attempts ?? 5)

    try {
      if (type === 'push_event') {
        const payload = parseJsonPayload(job.payload)
        if (!isPushJobPayload(payload)) {
          throw new Error('Invalid push job payload')
        }
        await this.handlePushEvent(payload)
      } else if (type === 'scheduled_workout_fanout') {
        const payload = parseJsonPayload(job.payload)
        if (!isRecord(payload) || typeof payload.scheduledWorkoutId !== 'number') {
          throw new Error('Invalid scheduled_workout_fanout payload')
        }
        await this.handleScheduledWorkoutFanout(payload.scheduledWorkoutId)
      } else {
        throw new Error(`Unknown job type: ${type}`)
      }

      await db.from('jobs').where('id', jobId).update({
        status: 'succeeded',
        locked_at: null,
        locked_by: null,
        last_error: null,
        updated_at: new Date(),
      })

      return 1
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err ? String(err.message) : String(err)
      logger.error({ jobId, type, err: message }, 'jobs: execution failed')

      const attempts = Number(job.attempts ?? 0) + 1
      const willRetry = attempts < maxAttempts
      const runAt = willRetry
        ? DateTime.now()
            .plus({ minutes: Math.min(30, attempts * 2) })
            .toJSDate()
        : null

      await db
        .from('jobs')
        .where('id', jobId)
        .update({
          status: willRetry ? 'queued' : 'failed',
          run_at: runAt ?? now,
          locked_at: null,
          locked_by: null,
          last_error: message.slice(0, 2000),
          updated_at: new Date(),
        })

      return 1
    }
  }

  private async handlePushEvent(job: PushJobPayload) {
    if (job.event === 'push:message') {
      const { senderName, content, recipientIds, url } = job.data
      try {
        const parsed = JSON.parse(content)
        if (parsed.__type) return
      } catch {
        // proceed
      }
      await PushNotificationService.sendToUsers(recipientIds, {
        title: senderName,
        body: String(content).slice(0, 100),
        url,
      })
      return
    }

    if (job.event === 'push:athlete_added') {
      await PushNotificationService.sendToUser(job.data.athleteId, {
        title: 'Новый тренер',
        body: `Тренер ${job.data.trainerName} добавил вас`,
        url: `/my-team`,
      })
      return
    }

    if (job.event === 'push:invite_accepted') {
      await PushNotificationService.sendToUser(job.data.trainerId, {
        title: 'Новый атлет',
        body: `${job.data.athleteName} принял ваше приглашение`,
        url: `/trainer/athletes`,
      })
      return
    }

    if (job.event === 'push:workout_scheduled') {
      await PushNotificationService.sendToUsers(job.data.athleteIds, {
        title: 'Новая тренировка',
        body: `Тренер ${job.data.trainerName} добавил тренировку на ${job.data.scheduledDate}`,
        url: `/home`,
      })
      return
    }

    if (job.event === 'push:call_incoming') {
      await PushNotificationService.sendToUsers(job.data.recipientIds, {
        title: 'Входящий звонок',
        body: `Тренер ${job.data.trainerName} звонит вам`,
        url: `/home`,
      })
      return
    }
  }

  private async handleScheduledWorkoutFanout(scheduledWorkoutId: number) {
    const scheduled = await ScheduledWorkout.find(scheduledWorkoutId)
    if (!scheduled) return

    if (!isScheduledWorkoutData(scheduled.workoutData)) {
      throw new Error('Invalid scheduled workoutData')
    }

    const { athleteIds } = await syncAthleteWorkoutsForScheduledWorkout({
      scheduledWorkoutId: scheduled.id,
      scheduledDate: scheduled.scheduledDate,
      workoutData: scheduled.workoutData,
      assignedTo: parseAssignedTo(scheduled.assignedTo),
    })

    if (athleteIds.length === 0) return

    const trainer = await User.find(scheduled.trainerId)
    const trainerName = trainer?.fullName ?? trainer?.email ?? 'Тренер'
    const scheduledDate = scheduled.scheduledDate.toFormat('d MMM', { locale: 'ru' })

    await PushNotificationService.sendToUsers(athleteIds, {
      title: 'Новая тренировка',
      body: `Тренер ${trainerName} добавил тренировку на ${scheduledDate}`,
      url: `/home`,
    })
  }
}
