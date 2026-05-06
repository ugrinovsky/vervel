import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'

const COOKIE_TTL = 60 * 60 * 24 * 30 // 30 days

export function authCookieFlags() {
  const useNone = env.get('AUTH_COOKIE_SAME_SITE') === 'none'
  return {
    secure: useNone || process.env.NODE_ENV === 'production',
    sameSite: useNone ? ('none' as const) : ('lax' as const),
  }
}

export function setAuthTokenCookie(response: HttpContext['response'], tokenValue: string) {
  const { secure, sameSite } = authCookieFlags()
  response.cookie('auth_token', tokenValue, {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: COOKIE_TTL,
    path: '/',
  })
}

export function clearAuthTokenCookie(response: HttpContext['response']) {
  const { secure, sameSite } = authCookieFlags()
  response.clearCookie('auth_token', { path: '/', secure, sameSite })
}
