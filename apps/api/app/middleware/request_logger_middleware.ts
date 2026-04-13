import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Access-style log for every routed request (stdout → docker logs).
 * Логирует после ответа: метод, path, статус, время.
 */
export default class RequestLoggerMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    if (ctx.request.method() === 'OPTIONS') {
      return next()
    }

    const start = Date.now()
    try {
      await next()
    } finally {
      const status = ctx.response.response.statusCode
      const durationMs = Date.now() - start
      ctx.logger.info(
        {
          method: ctx.request.method(),
          path: ctx.request.url(true),
          status,
          durationMs,
        },
        'http.request'
      )
    }
  }
}
