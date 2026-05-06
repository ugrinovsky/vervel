import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { JobWorkerService } from '#services/JobWorkerService'
import db from '@adonisjs/lucid/services/db'
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
