import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Reads the `auth_token` httpOnly cookie and injects it as
 * `Authorization: Bearer <token>` so AdonisJS's token guard
 * can authenticate the request without the token being in localStorage.
 */
function hasNonEmptyBearerAuth(authorization: string | undefined): boolean {
  if (!authorization || typeof authorization !== 'string') {
    return false
  }
  return /^Bearer\s+\S/.test(authorization.trim())
}

export default class CookieAuthMiddleware {
  async handle({ request }: HttpContext, next: NextFn) {
    const token = request.cookie('auth_token')

    // Только «настоящий» Bearer-токен блокирует подстановку из куки. Иначе пустой/битый
    // Authorization (иногда шлётся только на POST) ломает auth, хотя cookie валидна.
    if (token && !hasNonEmptyBearerAuth(request.header('authorization'))) {
      request.request.headers['authorization'] = `Bearer ${token}`
    }

    return next()
  }
}
