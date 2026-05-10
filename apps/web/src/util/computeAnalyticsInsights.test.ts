import { describe, it, expect } from 'vitest';
import { computeAnalyticsInsights } from './computeAnalyticsInsights';
import type { WorkoutStats, WorkoutTimelineEntry } from '@/types/Analytics';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeStats(
  timeline: WorkoutTimelineEntry[],
  overrides: Partial<Omit<WorkoutStats, 'timeline'>> = {}
): WorkoutStats {
  return {
    workoutsCount: timeline.length,
    totalVolume: 0,
    avgIntensity: 0,
    zones: {},
    timeline,
    ...overrides,
  };
}

function makeEntry(
  date: string,
  overrides: Partial<WorkoutTimelineEntry> = {}
): WorkoutTimelineEntry {
  return { date, ...overrides };
}

// ─── empty timeline ───────────────────────────────────────────────────────────

describe('empty timeline', () => {
  it('hasWorkouts = false', () => {
    expect(computeAnalyticsInsights(makeStats([]), 'month').hasWorkouts).toBe(false);
  });

  it('journal всё нули', () => {
    const { journal } = computeAnalyticsInsights(makeStats([]), 'month');
    expect(journal).toEqual({ total: 0, missingWeights: 0, missingRpe: 0 });
  });

  it('rhythm null', () => {
    const { rhythm } = computeAnalyticsInsights(makeStats([]), 'month');
    expect(rhythm.medianGapDays).toBeNull();
    expect(rhythm.maxGapDays).toBeNull();
  });

  it('diversity всё null/0', () => {
    const { diversity } = computeAnalyticsInsights(makeStats([]), 'month');
    expect(diversity.distinctTypes).toBe(0);
    expect(diversity.dominantType).toBeNull();
    expect(diversity.dominantPct).toBeNull();
  });

  it('zoneShift, coach, pace — null', () => {
    const r = computeAnalyticsInsights(makeStats([]), 'month');
    expect(r.zoneShift).toBeNull();
    expect(r.coach).toBeNull();
    expect(r.pace).toBeNull();
  });

  it('softOverloadHint = false', () => {
    expect(computeAnalyticsInsights(makeStats([]), 'month').softOverloadHint).toBe(false);
  });
});

// ─── journal ─────────────────────────────────────────────────────────────────

describe('journal', () => {
  it('считает missingWeights', () => {
    const stats = makeStats([
      makeEntry('2026-05-01', { hasMissingWeights: true }),
      makeEntry('2026-05-02', { hasMissingWeights: false }),
      makeEntry('2026-05-03', { hasMissingWeights: true }),
    ]);
    expect(computeAnalyticsInsights(stats, 'month').journal.missingWeights).toBe(2);
  });

  it('считает missingRpe', () => {
    const stats = makeStats([
      makeEntry('2026-05-01', { hasMissingRpe: true }),
      makeEntry('2026-05-02'),
    ]);
    expect(computeAnalyticsInsights(stats, 'month').journal.missingRpe).toBe(1);
  });

  it('total = количество тренировок', () => {
    const stats = makeStats([makeEntry('2026-05-01'), makeEntry('2026-05-02'), makeEntry('2026-05-03')]);
    expect(computeAnalyticsInsights(stats, 'month').journal.total).toBe(3);
  });
});

// ─── rhythm ──────────────────────────────────────────────────────────────────

describe('rhythm', () => {
  it('одна тренировка → gaps нет, оба null', () => {
    const stats = makeStats([makeEntry('2026-05-01')]);
    const { rhythm } = computeAnalyticsInsights(stats, 'month');
    expect(rhythm.medianGapDays).toBeNull();
    expect(rhythm.maxGapDays).toBeNull();
  });

  it('два дня подряд → gap 1 день', () => {
    const stats = makeStats([makeEntry('2026-05-01'), makeEntry('2026-05-02')]);
    const { rhythm } = computeAnalyticsInsights(stats, 'month');
    expect(rhythm.medianGapDays).toBe(1);
    expect(rhythm.maxGapDays).toBe(1);
  });

  it('медиана нечётного набора', () => {
    // gaps: 1, 2, 3 → медиана = 2
    const stats = makeStats([
      makeEntry('2026-05-01'),
      makeEntry('2026-05-02'), // +1
      makeEntry('2026-05-04'), // +2
      makeEntry('2026-05-07'), // +3
    ]);
    const { rhythm } = computeAnalyticsInsights(stats, 'month');
    expect(rhythm.medianGapDays).toBe(2);
    expect(rhythm.maxGapDays).toBe(3);
  });

  it('медиана чётного набора', () => {
    // gaps: 1, 3 → медиана = (1+3)/2 = 2
    const stats = makeStats([
      makeEntry('2026-05-01'),
      makeEntry('2026-05-02'), // +1
      makeEntry('2026-05-05'), // +3
    ]);
    const { rhythm } = computeAnalyticsInsights(stats, 'month');
    expect(rhythm.medianGapDays).toBe(2);
  });

  it('несортированные даты сортируются перед подсчётом', () => {
    // Передаём в обратном порядке — функция должна отсортировать
    const stats = makeStats([
      makeEntry('2026-05-05'),
      makeEntry('2026-05-01'),
      makeEntry('2026-05-03'),
    ]);
    // gaps: 2, 2 → медиана = 2
    const { rhythm } = computeAnalyticsInsights(stats, 'month');
    expect(rhythm.medianGapDays).toBe(2);
    expect(rhythm.maxGapDays).toBe(2);
  });
});

// ─── loadLevels ───────────────────────────────────────────────────────────────

describe('loadLevels', () => {
  it('считает вхождения по уровням', () => {
    const stats = makeStats([
      makeEntry('2026-05-01', { loadLevel: 'low' }),
      makeEntry('2026-05-02', { loadLevel: 'high' }),
      makeEntry('2026-05-03', { loadLevel: 'low' }),
      makeEntry('2026-05-04', { loadLevel: 'medium' }),
    ]);
    const { loadLevels } = computeAnalyticsInsights(stats, 'month');
    expect(loadLevels.low).toBe(2);
    expect(loadLevels.high).toBe(1);
    expect(loadLevels.medium).toBe(1);
    expect(loadLevels.none).toBeUndefined();
  });

  it('undefined loadLevel считается как none', () => {
    const stats = makeStats([makeEntry('2026-05-01'), makeEntry('2026-05-02')]);
    const { loadLevels } = computeAnalyticsInsights(stats, 'month');
    expect(loadLevels.none).toBe(2);
  });
});

// ─── diversity ───────────────────────────────────────────────────────────────

describe('diversity', () => {
  it('один тип', () => {
    const stats = makeStats(
      [makeEntry('2026-05-01'), makeEntry('2026-05-02')],
      { byType: { crossfit: 2 } }
    );
    const { diversity } = computeAnalyticsInsights(stats, 'month');
    expect(diversity.distinctTypes).toBe(1);
    expect(diversity.dominantType).toBe('crossfit');
    expect(diversity.dominantPct).toBe(100);
  });

  it('два типа — доминирует тот что больше', () => {
    const stats = makeStats(
      [
        makeEntry('2026-05-01'),
        makeEntry('2026-05-02'),
        makeEntry('2026-05-03'),
        makeEntry('2026-05-04'),
      ],
      { byType: { crossfit: 3, bodybuilding: 1 } }
    );
    const { diversity } = computeAnalyticsInsights(stats, 'month');
    expect(diversity.distinctTypes).toBe(2);
    expect(diversity.dominantType).toBe('crossfit');
    expect(diversity.dominantPct).toBe(75);
  });

  it('byType undefined → distinctTypes=0', () => {
    const stats = makeStats([makeEntry('2026-05-01')]);
    const { diversity } = computeAnalyticsInsights(stats, 'month');
    expect(diversity.distinctTypes).toBe(0);
    expect(diversity.dominantType).toBeNull();
  });

  it('нулевые типы не считаются', () => {
    const stats = makeStats(
      [makeEntry('2026-05-01')],
      { byType: { crossfit: 1, bodybuilding: 0 } }
    );
    expect(computeAnalyticsInsights(stats, 'month').diversity.distinctTypes).toBe(1);
  });
});

// ─── coach ────────────────────────────────────────────────────────────────────

describe('coach', () => {
  it('нет тренерских тренировок → coach null', () => {
    const stats = makeStats([makeEntry('2026-05-01'), makeEntry('2026-05-02')]);
    expect(computeAnalyticsInsights(stats, 'month').coach).toBeNull();
  });

  it('считает scheduled и self', () => {
    const stats = makeStats([
      makeEntry('2026-05-01', { scheduledWorkoutId: 10 }),
      makeEntry('2026-05-02', { scheduledWorkoutId: 11 }),
      makeEntry('2026-05-03'),
    ]);
    const { coach } = computeAnalyticsInsights(stats, 'month');
    expect(coach).toEqual({ scheduled: 2, self: 1 });
  });
});

// ─── pace ─────────────────────────────────────────────────────────────────────

describe('pace', () => {
  it('week period: 1 тренировка / 1 неделю → perWeek=1, projectedPerMonth=4', () => {
    const stats = makeStats([makeEntry('2026-05-01')]);
    const { pace } = computeAnalyticsInsights(stats, 'week');
    expect(pace?.perWeek).toBe(1);
    expect(pace?.projectedPerMonth).toBe(4); // round(1 * 30/7) = round(4.28) = 4
  });

  it('month period: 4 тренировки / 4.29 недель ≈ 0.93/нед', () => {
    const stats = makeStats([
      makeEntry('2026-05-01'),
      makeEntry('2026-05-08'),
      makeEntry('2026-05-15'),
      makeEntry('2026-05-22'),
    ]);
    const { pace } = computeAnalyticsInsights(stats, 'month');
    // 4 / (30/7) ≈ 0.9333 → 0.9
    expect(pace?.perWeek).toBe(0.9);
    expect(pace?.projectedPerMonth).toBeGreaterThan(0);
  });

  it('0 тренировок → pace null', () => {
    expect(computeAnalyticsInsights(makeStats([]), 'month').pace).toBeNull();
  });
});

// ─── softOverloadHint ────────────────────────────────────────────────────────

describe('softOverloadHint', () => {
  // week period: 1 неделя, чтобы нужное кол-во тренировок давало perWeek ≥ 4.5
  it('true когда avgIntensity ≥ 0.78 и perWeek ≥ 4.5 (week period)', () => {
    const timeline = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`2026-05-0${i + 1}`)
    );
    const stats = makeStats(timeline, { avgIntensity: 0.8 });
    expect(computeAnalyticsInsights(stats, 'week').softOverloadHint).toBe(true);
  });

  it('false когда интенсивность ниже порога', () => {
    const timeline = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`2026-05-0${i + 1}`)
    );
    const stats = makeStats(timeline, { avgIntensity: 0.5 });
    expect(computeAnalyticsInsights(stats, 'week').softOverloadHint).toBe(false);
  });

  it('false когда тренировок мало (perWeek < 4.5)', () => {
    const stats = makeStats([makeEntry('2026-05-01'), makeEntry('2026-05-02')], {
      avgIntensity: 0.9,
    });
    expect(computeAnalyticsInsights(stats, 'week').softOverloadHint).toBe(false);
  });

  it('avgIntensity > 1 нормализуется (делится на 100)', () => {
    // avgIntensity=85 → intensityPct=85 ≥ 78; 5 тренировок/неделю → softOverload=true
    const timeline = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`2026-05-0${i + 1}`)
    );
    const stats = makeStats(timeline, { avgIntensity: 85 });
    expect(computeAnalyticsInsights(stats, 'week').softOverloadHint).toBe(true);
  });
});

// ─── zoneShift ───────────────────────────────────────────────────────────────

describe('zoneShift', () => {
  it('менее 4 тренировок → null', () => {
    const stats = makeStats([
      makeEntry('2026-05-01', { zones: { legs: 0.8, back: 0.2 } }),
      makeEntry('2026-05-02', { zones: { legs: 0.8, back: 0.2 } }),
      makeEntry('2026-05-03', { zones: { legs: 0.8, back: 0.2 } }),
    ]);
    expect(computeAnalyticsInsights(stats, 'month').zoneShift).toBeNull();
  });

  it('4 тренировки без сдвига → null', () => {
    const entry = makeEntry('2026-05-01', { zones: { legs: 0.5, back: 0.5 } });
    const stats = makeStats([
      { ...entry, date: '2026-05-01' },
      { ...entry, date: '2026-05-02' },
      { ...entry, date: '2026-05-03' },
      { ...entry, date: '2026-05-04' },
    ]);
    expect(computeAnalyticsInsights(stats, 'month').zoneShift).toBeNull();
  });

  it('заметный сдвиг → возвращает zoneShift с upZoneId/downZoneId', () => {
    // Первая половина: преобладают ноги
    // Вторая половина: преобладает спина
    const stats = makeStats([
      makeEntry('2026-05-01', { zones: { legs: 0.9, back: 0.1 } }),
      makeEntry('2026-05-02', { zones: { legs: 0.9, back: 0.1 } }),
      makeEntry('2026-05-03', { zones: { legs: 0.1, back: 0.9 } }),
      makeEntry('2026-05-04', { zones: { legs: 0.1, back: 0.9 } }),
    ]);
    const { zoneShift } = computeAnalyticsInsights(stats, 'month');
    expect(zoneShift).not.toBeNull();
    expect(zoneShift!.upZoneId).toBe('back');
    expect(zoneShift!.downZoneId).toBe('legs');
    expect(zoneShift!.upDeltaPct).toBeGreaterThan(0);
    expect(zoneShift!.downDeltaPct).toBeGreaterThan(0);
  });
});
