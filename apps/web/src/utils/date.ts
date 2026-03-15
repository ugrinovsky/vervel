/**
 * Single source of truth for date handling in the app.
 *
 * Key rules:
 * - All dates are treated as LOCAL (browser) time — no UTC conversion.
 * - API datetime strings use format "YYYY-MM-DDTHH:mm:00" (no timezone suffix)
 *   so the server stores them as-is (wall-clock time).
 * - Never use `new Date("YYYY-MM-DD")` — it parses as UTC midnight, use parseLocalDate() instead.
 * - Never use `.toISOString().slice(0, 10)` — it gives UTC date, use toDateKey() instead.
 */

/** Formats a Date to "YYYY-MM-DD" using LOCAL timezone components. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parses a "YYYY-MM-DD" string as a LOCAL date.
 * Unlike `new Date("YYYY-MM-DD")` which treats the string as UTC midnight,
 * this creates the date in the local timezone.
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Formats a Date to "HH:mm" using LOCAL timezone components. */
export function toTimeKey(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * Builds an API datetime string "YYYY-MM-DDTHH:mm:00" from separate date and time objects.
 * No timezone suffix — server stores the value as wall-clock time.
 */
export function toApiDateTime(date: Date, time: Date): string {
  const dateKey = toDateKey(date);
  const h = String(time.getHours()).padStart(2, '0');
  const min = String(time.getMinutes()).padStart(2, '0');
  return `${dateKey}T${h}:${min}:00`;
}
