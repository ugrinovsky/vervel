import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { JobWorkerService } from '#services/JobWorkerService'
import { JobQueueService } from '#services/JobQueueService'
import db from '@adonisjs/lucid/services/db'
import { nowDate, wallClockDate } from '#utils/date'
import { isRecord } from '#utils/type_guards'

const enabled = env.get('JOBS_WORKER_ENABLED', 'false') === 'true'

if (!enabled) {
  // Worker disabled by default (API-only mode).
} else if (env.get('NODE_ENV') === 'test') {
  // Never run background workers in tests.
} else {
  const worker = new JobWorkerService()
  const intervalMs = Number(env.get('JOBS_POLL_INTERVAL_MS', '2000'))
  const pollMs = Number.isFinite(intervalMs) ? Math.max(250, intervalMs) : 2000

  const extractErr = (err: unknown) => {
    if (err instanceof Error) return err.message
    if (isRecord(err) && 'message' in err) return String(err.message)
    return String(err)
  }

  ;(async () => {
    try {
      // Fail-safe: ensure DB is ready before starting polling loop.
      await db.rawQuery('select 1 as ok')
    } catch (err) {
      logger.error({ err: extractErr(err) }, 'jobs: worker disabled (db unavailable)')
      return
    }

    logger.info({ pollMs }, 'jobs: worker enabled')

    // ── Daily CRM reminder ────────────────────────────────────────────────────
    // Enqueues crm_daily_reminder at 09:00 each day.
    // Uses Luxon to find the next 09:00 relative to now.
    const enqueueCrmReminder = async () => {
      try {
        await JobQueueService.enqueue({ type: 'crm_daily_reminder', payload: {} })
        logger.info('jobs: crm_daily_reminder enqueued')
      } catch (err: unknown) {
        logger.error({ err: extractErr(err) }, 'jobs: failed to enqueue crm_daily_reminder')
      }
    }

    const scheduleNextCrmReminder = () => {
      const now = nowDate()
      let next = wallClockDate(now.getFullYear(), now.getMonth() + 1, now.getDate(), 9, 0, 0)
      if (next <= now) {
        next = wallClockDate(now.getFullYear(), now.getMonth() + 1, now.getDate() + 1, 9, 0, 0)
      }
      const msUntil = next.getTime() - now.getTime()
      logger.info({ nextAt: next.toISOString() }, 'jobs: crm_daily_reminder scheduled')
      setTimeout(async () => {
        await enqueueCrmReminder()
        setInterval(enqueueCrmReminder, 24 * 60 * 60 * 1000)
      }, msUntil)
    }
    scheduleNextCrmReminder()
    // ─────────────────────────────────────────────────────────────────────────

    let consecutiveDbFailures = 0

    setInterval(() => {
      worker.runOnce().catch((err: unknown) => {
        const message = extractErr(err)
        logger.error({ err: message }, 'jobs: worker loop error')

        // If DB connection is broken/misconfigured, stop noisy retries by self-disabling.
        if (message.includes('unregistered connection') || message.includes('ECONNREFUSED')) {
          consecutiveDbFailures += 1
          if (consecutiveDbFailures >= 3) {
            logger.error(
              { err: message },
              'jobs: worker auto-disabled after repeated db failures (set JOBS_WORKER_ENABLED=false)'
            )
            process.exitCode = 0
            process.exit(0)
          }
        } else {
          consecutiveDbFailures = 0
        }
      })
    }, pollMs)
  })().catch((err: unknown) => {
    logger.error({ err: extractErr(err) }, 'jobs: worker bootstrap error')
  })
}
