import type { HttpContext } from '@adonisjs/core/http'
import env from '#start/env'

const COOKIE_TTL = 60 * 60 * 24 * 30 // 30 days

function cookieFlags() {
  const useNone = env.get('AUTH_COOKIE_SAME_SITE') === 'none'
  return {
    secure: useNone || process.env.NODE_ENV === 'production',
    sameSite: (useNone ? 'none' : 'lax') as 'lax' | 'none',
  }
}

export function setAuthTokenCookie(response: HttpContext['response'], tokenValue: string) {
  const { secure, sameSite } = cookieFlags()
  response.cookie('auth_token', tokenValue, {
    httpOnly: true,
    secure,
    sameSite,
    maxAge: COOKIE_TTL,
    path: '/',
  })
}

export function clearAuthTokenCookie(response: HttpContext['response']) {
  const { secure, sameSite } = cookieFlags()
  response.clearCookie('auth_token', { path: '/', secure, sameSite })
}
