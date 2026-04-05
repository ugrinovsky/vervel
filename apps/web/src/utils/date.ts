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

/** Returns the current local hour (0–23). */
export function getCurrentHour(): number {
  return new Date().getHours();
}

/** Returns a Date set to the current hour with minutes/seconds zeroed (e.g. 14:33 → 14:00). */
export function nowRoundedToHour(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  return d;
}

/** Returns the current time as "HH:00" string (minutes zeroed). */
export function currentHourString(): string {
  return `${String(new Date().getHours()).padStart(2, '0')}:00`;
}

/** Returns the current date and time as a Date object. */
export function now(): Date {
  return new Date();
}

/** Returns a Date representing today (current date, time zeroed). */
export function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Parses a "HH:mm" time string and applies it to a new Date object (today's date).
 * Use instead of `new Date()` + manual `setHours`.
 */
export function parseTimeString(timeStr: string): Date {
  const d = new Date();
  const [h, m] = timeStr.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
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

/**
 * Parses an API datetime string back as LOCAL (wall-clock) time.
 * The server stores wall-clock time but Lucid serialises DateTime with a "+00:00"
 * suffix, which would cause the browser to apply UTC→local conversion.
 * We strip any timezone offset and parse the bare "YYYY-MM-DDTHH:mm:ss" part
 * as a local date so no conversion happens.
 */
export function parseApiDateTime(dateStr: string): Date {
  const local = dateStr.slice(0, 19); // "YYYY-MM-DDTHH:mm:ss"
  const [datePart, timePart] = local.split('T');
  const [y, mo, d] = datePart.split('-').map(Number);
  const [h, min, s] = timePart.split(':').map(Number);
  return new Date(y, mo - 1, d, h, min, s ?? 0);
}

const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

/**
 * Formats a datetime string for dialog list display (Telegram-style):
 * - Same day → "HH:mm"
 * - Within last 7 days → short weekday name ("Пн", "Вт", …)
 * - Older → "dd.mm.YY"
 */
export function formatDialogTime(iso: string): string {
  const date = parseApiDateTime(iso);
  const now = new Date();

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((todayStart.getTime() - dateStart.getTime()) / 86_400_000);

  if (diffDays === 0) {
    return toTimeKey(date);
  }
  if (diffDays < 7) {
    return DAY_NAMES[date.getDay()];
  }
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear()).slice(2);
  return `${d}.${m}.${y}`;
}
