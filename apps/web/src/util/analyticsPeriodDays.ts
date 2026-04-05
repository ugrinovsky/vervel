/**
 * Календарные границы периода аналитики — те же правила, что в useWorkoutStats (локальные даты).
 */
import type { WorkoutTimelineEntry } from '@/types/Analytics';
import { format } from 'date-fns';
import { parseApiDateTime } from '@/utils/date';
import { normalizeIntensity } from '@/constants/AnalyticsConstants';

export type AnalyticsPeriod = 'week' | 'month' | 'year';

/** Начало периода (локальная полночь первого дня). */
export function getAnalyticsPeriodStart(period: AnalyticsPeriod): Date {
  const now = new Date();
  const from = new Date(now);
  if (period === 'week') from.setDate(now.getDate() - 7);
  else if (period === 'month') from.setMonth(now.getMonth() - 1);
  else from.setFullYear(now.getFullYear() - 1);
  from.setHours(0, 0, 0, 0);
  return from;
}

/** Конец периода — «сегодня» 23:59:59.999 локально. */
export function getAnalyticsPeriodEnd(): Date {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return end;
}

/** Все календарные дни от start до end включительно (локальные полуночи). */
export function enumerateLocalCalendarDays(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (d.getTime() <= endDay.getTime()) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export function timelineEntryDateKey(t: WorkoutTimelineEntry): string {
  return format(parseApiDateTime(t.date), 'yyyy-MM-dd');
}

export function aggregateTimelineDay(entries: WorkoutTimelineEntry[]): {
  intensity: number;
  volume: number;
  type: string;
} {
  if (!entries.length) return { intensity: 0, volume: 0, type: '' };
  const sorted = [...entries].sort(
    (a, b) => parseApiDateTime(a.date).getTime() - parseApiDateTime(b.date).getTime()
  );
  const volume = sorted.reduce((s, e) => s + (e.volume ?? 0), 0);
  const pctVals = sorted.map((e) => normalizeIntensity(Number(e.intensity) || 0));
  const avgPct = pctVals.reduce((a, b) => a + b, 0) / pctVals.length;
  return {
    intensity: Math.round(avgPct),
    volume,
    type: sorted[sorted.length - 1]?.type ?? '',
  };
}

/** Тренировки за один календарный день (ключ YYYY-MM-DD). */
export function entriesForDateKey(
  timeline: WorkoutTimelineEntry[],
  dateKey: string
): WorkoutTimelineEntry[] {
  return timeline.filter((t) => timelineEntryDateKey(t) === dateKey);
}
