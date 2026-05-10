import type { DateTime } from 'luxon'

export function sanitizeTrainerCustomString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, maxLength) : null
}

export function serializeTrainerCustomExercise(ex: {
  id: number
  name: string
  notes: string | null
  createdAt: DateTime
}) {
  return {
    id: ex.id,
    name: ex.name,
    notes: ex.notes,
    createdAt: ex.createdAt,
  }
}
