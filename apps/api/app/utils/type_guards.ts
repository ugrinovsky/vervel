/**
 * Narrows `unknown` to `Record<string, unknown>`.
 * Use before accessing properties on parsed JSON or unknown objects.
 */
export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

/** Concrete JSON-serialisable scalar. */
export type JsonPrimitive = string | number | boolean | null
/** Concrete JSON-serialisable object (no `any`, no `unknown`). */
export type JsonObject = { [key: string]: JsonValue }
/** Concrete JSON-serialisable value. */
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[]
