/**
 * Pure utility functions for chat UI logic.
 * No framework or browser dependencies — safe to unit-test in isolation.
 */

/**
 * Deduplicates an incoming message against the existing list.
 *
 * Returns `null` when `incoming.id` already exists in `prev` (no state update needed).
 * Otherwise returns a new array with the message appended.
 */
export function deduplicateMessage<T extends { id: number }>(prev: T[], incoming: T): T[] | null {
  if (prev.some((m) => m.id === incoming.id)) return null
  return [...prev, incoming]
}

/**
 * Parses a sessionStorage value representing an active chat ID.
 *
 * Returns the numeric chat ID, or `null` if the value is absent, empty, or non-numeric.
 */
export function resolveActiveChatId(raw: string | null): number | null {
  if (raw === null || raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || Number.isNaN(n)) return null
  return n
}
