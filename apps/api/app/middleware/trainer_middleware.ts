import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class TrainerMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user!
    if (user.role !== 'trainer' && user.role !== 'both') {
      return ctx.response.forbidden({ message: 'Требуется роль тренера' })
    }
    return next()
  }
}
