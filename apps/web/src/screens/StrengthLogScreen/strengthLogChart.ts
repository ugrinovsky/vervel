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

/** МНК по индексам 0..n-1: y ≈ slope·i + intercept */
export function strengthLogLinearRegression(values: readonly number[]): {
  slope: number;
  intercept: number;
} | null {
  const n = values.length;
  if (n < 2) return null;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    const y = values[i];
    sumX += i;
    sumY += y;
    sumXY += i * y;
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-9) {
    const meanY = sumY / n;
    return { slope: 0, intercept: meanY };
  }
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export interface StrengthLogChartRow {
  name: string;
  kg: number | null;
  trend: number | null;
}

/**
 * Строки для Recharts: факт (`kg`) и пунктирный тренд (`trend`).
 * При extrapolateNext добавляется одна точка «вперёд» по тому же тренду (для закреплённых).
 */
export function buildStrengthLogChartRowsWithTrend(
  entry: StrengthLogEntry,
  opts: { extrapolateNext: boolean },
): StrengthLogChartRow[] {
  const points = buildStrengthLogChartPoints(entry);
  if (points.length === 0) return [];
  if (points.length < 2 || !opts.extrapolateNext) {
    return points.map((p) => ({ name: p.label, kg: p.value, trend: null }));
  }
  const ys = points.map((p) => p.value);
  const reg = strengthLogLinearRegression(ys);
  if (reg == null) {
    return points.map((p) => ({ name: p.label, kg: p.value, trend: null }));
  }
  const { slope, intercept } = reg;
  const round1 = (x: number) => Math.round(x * 10) / 10;
  const rows: StrengthLogChartRow[] = points.map((p, i) => ({
    name: p.label,
    kg: p.value,
    trend: round1(slope * i + intercept),
  }));
  const nextIdx = points.length;
  rows.push({
    name: '· · ·',
    kg: null,
    trend: round1(slope * nextIdx + intercept),
  });
  return rows;
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
