import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { JobWorkerService } from '#services/JobWorkerService'

const enabled = env.get('JOBS_WORKER_ENABLED', 'false') === 'true'

if (!enabled) {
  // Worker disabled by default (API-only mode).
} else if (env.get('NODE_ENV') === 'test') {
  // Never run background workers in tests.
} else {
  const worker = new JobWorkerService()
  const intervalMs = Number(env.get('JOBS_POLL_INTERVAL_MS', '2000'))
  const pollMs = Number.isFinite(intervalMs) ? Math.max(250, intervalMs) : 2000

  logger.info({ pollMs }, 'jobs: worker enabled')

  setInterval(() => {
    worker.runOnce().catch((err: unknown) => {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : String(err)
      logger.error({ err: message }, 'jobs: worker loop error')
    })
  }, pollMs)
}
