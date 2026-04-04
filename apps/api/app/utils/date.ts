/** Returns "YYYY-MM-DD" using the LOCAL timezone of the Date object. */
export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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
