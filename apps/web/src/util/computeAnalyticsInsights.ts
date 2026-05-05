import type { WorkoutStats, WorkoutTimelineEntry } from '@/types/Analytics';
import { ANALYTICS_PERIOD_WEEKS } from '@/constants/AnalyticsConstants';
import { WORKOUT_TYPE_CONFIG } from '@/constants/workoutTypes';
import { sumZoneLoadsFromTimeline } from '@/util/getRecomendations';
import { getZoneLabel } from '@/util/zones';

/** Совпадает с getLoadLevel в API: пороги по totalVolume за сессию (кг), не субъективная «лёгкость». */
export const LOAD_LEVEL_LABELS: Record<NonNullable<WorkoutTimelineEntry['loadLevel']>, string> = {
  none: 'Нет тоннажа и упражнений',
  low: 'До ~10 т за сессию',
  medium: '~10–15 т за сессию',
  high: 'От ~15 т за сессию',
};

function medianSorted(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

function workoutTypeLabel(type: string): string {
  return WORKOUT_TYPE_CONFIG[type] ?? type;
}

function normalizeHalfShares(
  entries: ReadonlyArray<{ zones?: Record<string, number> }>
): Record<string, number> {
  const sums = sumZoneLoadsFromTimeline(entries);
  const total = Object.values(sums).reduce((s, v) => s + v, 0);
  if (total <= 0) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(sums)) {
    out[k] = v / total;
  }
  return out;
}

export interface AnalyticsInsightsData {
  hasWorkouts: boolean;
  journal: {
    total: number;
    missingWeights: number;
    missingRpe: number;
  };
  rhythm: {
    medianGapDays: number | null;
    maxGapDays: number | null;
  };
  loadLevels: Partial<Record<NonNullable<WorkoutTimelineEntry['loadLevel']>, number>>;
  diversity: {
    distinctTypes: number;
    dominantType: string | null;
    dominantPct: number | null;
  };
  zoneShift: {
    upZoneId: string;
    upLabel: string;
    upDeltaPct: number;
    downZoneId: string;
    downLabel: string;
    downDeltaPct: number;
  } | null;
  coach: {
    scheduled: number;
    self: number;
  } | null;
  pace: {
    perWeek: number;
    projectedPerMonth: number;
  } | null;
  softOverloadHint: boolean;
}

export function computeAnalyticsInsights(
  stats: WorkoutStats,
  period: 'week' | 'month' | 'year'
): AnalyticsInsightsData {
  const timeline = [...(stats.timeline ?? [])].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const n = timeline.length;

  if (n === 0) {
    return {
      hasWorkouts: false,
      journal: { total: 0, missingWeights: 0, missingRpe: 0 },
      rhythm: { medianGapDays: null, maxGapDays: null },
      loadLevels: {},
      diversity: { distinctTypes: 0, dominantType: null, dominantPct: null },
      zoneShift: null,
      coach: null,
      pace: null,
      softOverloadHint: false,
    };
  }

  let missingWeights = 0;
  let missingRpe = 0;
  const loadLevels: Partial<Record<NonNullable<WorkoutTimelineEntry['loadLevel']>, number>> = {};
  let scheduled = 0;

  const gaps: number[] = [];
  for (const [i, t] of timeline.entries()) {
    if (t.hasMissingWeights) missingWeights += 1;
    if (t.hasMissingRpe) missingRpe += 1;
    const ll = t.loadLevel ?? 'none';
    loadLevels[ll] = (loadLevels[ll] ?? 0) + 1;
    if (t.scheduledWorkoutId != null) scheduled += 1;

    if (i > 0) {
      const prevT = timeline[i - 1];
      if (prevT) {
        const prev = new Date(prevT.date).getTime();
        const cur = new Date(t.date).getTime();
        if (Number.isFinite(prev) && Number.isFinite(cur)) {
          gaps.push(Math.max(0, (cur - prev) / (1000 * 60 * 60 * 24)));
        }
      }
    }
  }

  const gapsSorted = [...gaps].sort((a, b) => a - b);
  const medianGapDays = gaps.length ? medianSorted(gapsSorted) : null;
  const maxGapDays = gaps.length ? Math.max(...gaps) : null;

  const byType = stats.byType ?? {};
  const typeEntries = Object.entries(byType).filter(([, c]) => c > 0);
  const distinctTypes = typeEntries.length;
  let dominantType: string | null = null;
  let dominantPct: number | null = null;
  if (typeEntries.length > 0) {
    const sortedT = [...typeEntries].sort((a, b) => b[1] - a[1]);
    const top = sortedT[0];
    if (top) {
      const [topKey, topCount] = top;
      dominantType = topKey;
      dominantPct = Math.round((topCount / n) * 100);
    }
  }

  let zoneShift: AnalyticsInsightsData['zoneShift'] = null;
  if (n >= 4) {
    const mid = Math.floor(n / 2);
    const first = timeline.slice(0, mid);
    const second = timeline.slice(mid);
    const a = normalizeHalfShares(first);
    const b = normalizeHalfShares(second);
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    let bestUp = { id: '', delta: -1 };
    let bestDown = { id: '', delta: 1 };
    for (const k of keys) {
      const d = (b[k] ?? 0) - (a[k] ?? 0);
      if (d > bestUp.delta) bestUp = { id: k, delta: d };
      if (d < bestDown.delta) bestDown = { id: k, delta: d };
    }
    if (
      bestUp.id &&
      bestDown.id &&
      bestUp.delta >= 0.04 &&
      bestDown.delta <= -0.04 &&
      bestUp.id !== bestDown.id
    ) {
      zoneShift = {
        upZoneId: bestUp.id,
        upLabel: getZoneLabel(bestUp.id),
        upDeltaPct: Math.round(bestUp.delta * 100),
        downZoneId: bestDown.id,
        downLabel: getZoneLabel(bestDown.id),
        downDeltaPct: Math.round(Math.abs(bestDown.delta) * 100),
      };
    }
  }

  const weeks = ANALYTICS_PERIOD_WEEKS[period];
  const perWeek = weeks > 0 ? n / weeks : 0;
  const pace =
    perWeek > 0
      ? {
          perWeek: +perWeek.toFixed(1),
          projectedPerMonth: Math.max(0, Math.round(perWeek * (30 / 7))),
        }
      : null;

  const coach =
    scheduled > 0 ? { scheduled, self: n - scheduled } : null;

  const avgI = Number(stats.avgIntensity) || 0;
  const intensityPct = avgI > 1 ? avgI : avgI * 100;
  const softOverloadHint = intensityPct >= 78 && perWeek >= 4.5;

  return {
    hasWorkouts: true,
    journal: { total: n, missingWeights, missingRpe },
    rhythm: {
      medianGapDays: medianGapDays !== null ? +medianGapDays.toFixed(1) : null,
      maxGapDays: maxGapDays !== null ? +maxGapDays.toFixed(1) : null,
    },
    loadLevels,
    diversity: { distinctTypes, dominantType, dominantPct },
    zoneShift,
    coach,
    pace,
    softOverloadHint,
  };
}

export { workoutTypeLabel };
