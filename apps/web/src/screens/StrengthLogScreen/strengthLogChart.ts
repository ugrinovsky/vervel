import type { StrengthLogEntry, StrengthLogSession } from '@/api/athlete';
import { parseApiDateTime, toDateKey, toTimeKey } from '@/utils/date';

export function maxWeightInSets(sets: { weight?: number }[]): number {
  let m = 0;
  for (const s of sets) {
    const w = Number(s.weight);
    if (!Number.isFinite(w)) continue;
    if (w > m) m = w;
  }
  return m;
}

/** Одна величина на сессию: условный 1RM или макс. вес (как на графике). */
export function strengthSessionKgValue(s: StrengthLogSession): number | null {
  const fromRm = s.best1RM;
  if (fromRm != null && fromRm > 0) return fromRm;
  const m = maxWeightInSets(s.sets);
  return m > 0 ? m : null;
}

export interface StrengthLogChartPoint {
  label: string;
  value: number;
  date: string;
}

/** Ось X: от старых сессий к новым. Значение: best1RM или макс. вес в сессии. */
export function buildStrengthLogChartPoints(entry: StrengthLogEntry): StrengthLogChartPoint[] {
  const chron = [...entry.sessions].reverse();
  const out: StrengthLogChartPoint[] = [];
  /** Сколько точек уже добавили на этот календарный день (локально) — иначе Recharts схлопывает «3 апр.» в одну. */
  const indexOnLocalDay = new Map<string, number>();
  for (const s of chron) {
    const v = strengthSessionKgValue(s);
    if (v == null || v <= 0) continue;
    const dk = toDateKey(parseApiDateTime(s.date));
    const idx = indexOnLocalDay.get(dk) ?? 0;
    indexOnLocalDay.set(dk, idx + 1);
    const baseLabel = formatChartDayLabel(s.date);
    const label =
      idx === 0 ? baseLabel : `${baseLabel} · ${toTimeKey(parseApiDateTime(s.date))}`;
    out.push({
      label,
      value: Math.round(v * 10) / 10,
      date: s.date,
    });
  }
  return out;
}

/** Прирост % от самой ранней к самой поздней сессии в списке (минимум 2 точки с весом). */
export function strengthLogProgressPercent(entry: StrengthLogEntry): number | null {
  const chron = [...entry.sessions].reverse();
  const series: number[] = [];
  for (const s of chron) {
    const v = strengthSessionKgValue(s);
    if (v != null) series.push(v);
  }
  if (series.length < 2) return null;
  const first = series[0];
  const last = series[series.length - 1];
  if (first <= 0) return null;
  return Math.round(((last - first) / first) * 1000) / 10;
}

export function formatChartDayLabel(iso: string): string {
  const d = parseApiDateTime(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
