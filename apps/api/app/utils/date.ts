import { DateTime } from 'luxon'

/** Returns "YYYY-MM-DD" using the LOCAL timezone of the Date object. */
export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Текущий момент как `Date` (единая точка входа). */
export function nowDate(): Date {
  return DateTime.now().toJSDate()
}

/** Копия `Date` без мутации исходного значения. */
export function cloneDate(date: Date): Date {
  return new Date(date)
}

/** Unix epoch как `Date` (например, маркер «не удалось разобрать»). */
export function epochDate(): Date {
  return new Date(0)
}

/** Разбор ISO-строки в `Date` через Luxon. */
export function parseIsoToDate(iso: string): Date {
  return DateTime.fromISO(iso).toJSDate()
}

/**
 * `Date` в локальном времени из календарных частей (без семантики таймзоны в строке).
 * Месяц 1..12.
 */
export function wallClockDate(
  y: number,
  mo: number,
  d: number,
  h: number = 0,
  min: number = 0,
  s: number = 0
): Date {
  return new Date(y, mo - 1, d, h, min, s)
}

/** Returns the Monday 00:00:00 of the week containing the given date (local time). */
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun … 6=Sat
  const daysToMonday = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - daysToMonday)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Validates that `from` and `to` query params are present.
 * Returns the values if valid, or calls response.badRequest and returns null.
 */
export function parseDateRange(
  from: string | null,
  to: string | null,
  response: { badRequest: (body: object) => any }
): { from: string; to: string } | null {
  if (!from || !to) {
    response.badRequest({ message: 'Параметры "from" и "to" обязательны' })
    return null
  }
  return { from, to }
}
