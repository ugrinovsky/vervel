import type User from '#models/user'
import type { ClientPreferences } from '#utils/client_preferences'

/** Поля пользователя для ответов логина / OAuth / профиля (без секретов). */
export function authUserPayload(user: User): {
  id: number
  email: string
  fullName: string | null
  role: User['role']
  gender: User['gender']
  themeHue: User['themeHue']
  clientPreferences: ClientPreferences
} {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    gender: user.gender,
    themeHue: user.themeHue,
    clientPreferences: user.clientPreferences ?? {},
  }
}
