import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export type JobStatus = 'queued' | 'processing' | 'succeeded' | 'failed'

export type JobRow = {
  id: number
  type: string
  payload: unknown
  status: JobStatus
  attempts: number
  max_attempts: number
  run_at: Date
  locked_at: Date | null
  locked_by: string | null
  last_error: string | null
}

export class JobQueueService {
  static async enqueue(opts: {
    type: string
    payload: unknown
    runAt?: DateTime
    maxAttempts?: number
  }): Promise<number> {
    const runAt = (opts.runAt ?? DateTime.now()).toJSDate()
    const maxAttempts = opts.maxAttempts ?? 5

    const [row] = await db
      .table('jobs')
      .insert({
        type: opts.type,
        payload: JSON.stringify(opts.payload),
        status: 'queued',
        attempts: 0,
        max_attempts: maxAttempts,
        run_at: runAt,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning(['id'])

    return Number(row.id)
  }
}
