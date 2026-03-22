import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Reads the `auth_token` httpOnly cookie and injects it as
 * `Authorization: Bearer <token>` so AdonisJS's token guard
 * can authenticate the request without the token being in localStorage.
 */
export default class CookieAuthMiddleware {
  async handle({ request }: HttpContext, next: NextFn) {
    const token = request.cookie('auth_token')

    if (token && !request.header('authorization')) {
      request.request.headers['authorization'] = `Bearer ${token}`
    }

    return next()
  }
}
