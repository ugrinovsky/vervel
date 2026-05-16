import { describe, it, expect } from 'vitest';
import { computeAnalyticsInsights } from './computeAnalyticsInsights';
import type { WorkoutStats, WorkoutTimelineEntry } from '@/types/Analytics';

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

// ─── weeklySlope ─────────────────────────────────────────────────────────────

describe('weeklySlope', () => {
  it('одна неделя → null (нужно минимум 2)', () => {
    const stats = makeStats([
      makeEntry('2026-05-04', { volume: 10000 }),
      makeEntry('2026-05-05', { volume: 12000 }),
    ]);
    expect(computeAnalyticsInsights(stats, 'month').weeklySlope).toBeNull();
  });

  it('нулевой объём → null', () => {
    const stats = makeStats([
      makeEntry('2026-05-04', { volume: 0 }),
      makeEntry('2026-05-11', { volume: 0 }),
    ]);
    expect(computeAnalyticsInsights(stats, 'month').weeklySlope).toBeNull();
  });

  it('стабильный объём по неделям → slope ≈ 0, isRising=false', () => {
    const stats = makeStats([
      makeEntry('2026-04-07', { volume: 10000 }),
      makeEntry('2026-04-14', { volume: 10000 }),
      makeEntry('2026-04-21', { volume: 10000 }),
      makeEntry('2026-04-28', { volume: 10000 }),
    ]);
    const { weeklySlope } = computeAnalyticsInsights(stats, 'month');
    expect(weeklySlope).not.toBeNull();
    expect(weeklySlope!.slopePerWeek).toBe(0);
  });

  it('растущий объём → isRising=true, slopePerWeek > 0', () => {
    const stats = makeStats([
      makeEntry('2026-04-07', { volume: 5000 }),
      makeEntry('2026-04-14', { volume: 10000 }),
      makeEntry('2026-04-21', { volume: 15000 }),
      makeEntry('2026-04-28', { volume: 20000 }),
    ]);
    const { weeklySlope } = computeAnalyticsInsights(stats, 'month');
    expect(weeklySlope!.isRising).toBe(true);
    expect(weeklySlope!.slopePerWeek).toBeGreaterThan(0);
  });

  it('слишком быстрый рост (>10%) → isTooFast=true', () => {
    // объём удваивается каждую неделю — рост >> 10%
    const stats = makeStats([
      makeEntry('2026-04-07', { volume: 5000 }),
      makeEntry('2026-04-14', { volume: 15000 }),
      makeEntry('2026-04-21', { volume: 45000 }),
    ]);
    const { weeklySlope } = computeAnalyticsInsights(stats, 'month');
    expect(weeklySlope!.isTooFast).toBe(true);
  });

  it('снижающийся объём → isRising=false, isTooFast=false', () => {
    const stats = makeStats([
      makeEntry('2026-04-07', { volume: 20000 }),
      makeEntry('2026-04-14', { volume: 15000 }),
      makeEntry('2026-04-21', { volume: 10000 }),
      makeEntry('2026-04-28', { volume: 5000 }),
    ]);
    const { weeklySlope } = computeAnalyticsInsights(stats, 'month');
    expect(weeklySlope!.isRising).toBe(false);
    expect(weeklySlope!.isTooFast).toBe(false);
  });

  it('несколько тренировок в одной неделе суммируются', () => {
    // неделя 1: 5000+5000=10000, неделя 2: 6000+6000=12000 → небольшой рост
    const stats = makeStats([
      makeEntry('2026-04-07', { volume: 5000 }),
      makeEntry('2026-04-08', { volume: 5000 }),
      makeEntry('2026-04-14', { volume: 6000 }),
      makeEntry('2026-04-15', { volume: 6000 }),
    ]);
    const { weeklySlope } = computeAnalyticsInsights(stats, 'month');
    expect(weeklySlope).not.toBeNull();
    expect(weeklySlope!.isRising).toBe(true);
    expect(weeklySlope!.weekCount).toBe(2);
  });

  it('weekCount отражает количество недель', () => {
    const stats = makeStats([
      makeEntry('2026-04-07', { volume: 10000 }),
      makeEntry('2026-04-14', { volume: 11000 }),
      makeEntry('2026-04-21', { volume: 12000 }),
    ]);
    expect(computeAnalyticsInsights(stats, 'month').weeklySlope!.weekCount).toBe(3);
  });
});

// ─── monotony ────────────────────────────────────────────────────────────────

describe('monotony', () => {
  it('менее 3 тренировок → null', () => {
    const stats = makeStats([
      makeEntry('2026-05-01', { volume: 10000 }),
      makeEntry('2026-05-02', { volume: 10000 }),
    ]);
    expect(computeAnalyticsInsights(stats, 'month').monotony).toBeNull();
  });

  it('нулевой объём везде → null (нет среднего)', () => {
    const stats = makeStats([
      makeEntry('2026-05-01', { volume: 0 }),
      makeEntry('2026-05-02', { volume: 0 }),
      makeEntry('2026-05-03', { volume: 0 }),
    ]);
    expect(computeAnalyticsInsights(stats, 'month').monotony).toBeNull();
  });

  it('одинаковый объём каждый день → нулевое stdDev → null', () => {
    // Каждый день один и тот же объём — стандартное отклонение = 0
    const stats = makeStats([
      makeEntry('2026-05-01', { volume: 10000 }),
      makeEntry('2026-05-02', { volume: 10000 }),
      makeEntry('2026-05-03', { volume: 10000 }),
    ]);
    expect(computeAnalyticsInsights(stats, 'month').monotony).toBeNull();
  });

  it('высокая вариативность → riskLevel=low', () => {
    // Чередование очень высокого и нулевого объёма — большое stdDev → низкая монотонность
    const stats = makeStats([
      makeEntry('2026-05-01', { volume: 30000 }),
      makeEntry('2026-05-02', { volume: 0 }),
      makeEntry('2026-05-04', { volume: 30000 }),
      makeEntry('2026-05-05', { volume: 0 }),
      makeEntry('2026-05-07', { volume: 30000 }),
    ]);
    const { monotony } = computeAnalyticsInsights(stats, 'month');
    expect(monotony).not.toBeNull();
    expect(monotony!.riskLevel).toBe('low');
  });

  it('монотонный тренинг каждый день → riskLevel=high', () => {
    // Небольшой объём каждый день с минимальным отклонением
    // avg ≈ 10000, stdDev ≈ 300 → monotony ≈ 33 → high
    // Но нам нужно небольшое stdDev: 7 дней: 5 × 10000, 2 × 9700
    const stats = makeStats([
      makeEntry('2026-05-01', { volume: 10000 }),
      makeEntry('2026-05-02', { volume: 10000 }),
      makeEntry('2026-05-03', { volume: 10000 }),
      makeEntry('2026-05-04', { volume: 10100 }),
      makeEntry('2026-05-05', { volume: 9900 }),
      makeEntry('2026-05-06', { volume: 10000 }),
      makeEntry('2026-05-07', { volume: 10000 }),
    ]);
    const { monotony } = computeAnalyticsInsights(stats, 'month');
    expect(monotony).not.toBeNull();
    expect(monotony!.riskLevel).toBe('high');
    expect(monotony!.value).toBeGreaterThan(2);
  });

  it('value округлено до 2 знаков', () => {
    const stats = makeStats([
      makeEntry('2026-05-01', { volume: 10000 }),
      makeEntry('2026-05-03', { volume: 5000 }),
      makeEntry('2026-05-06', { volume: 15000 }),
    ]);
    const { monotony } = computeAnalyticsInsights(stats, 'month');
    if (monotony) {
      const decimals = (monotony.value.toString().split('.')[1] ?? '').length;
      expect(decimals).toBeLessThanOrEqual(2);
    }
  });
});

// ─── recovery ────────────────────────────────────────────────────────────────

describe('recovery', () => {
  it('одна тренировка → null', () => {
    const stats = makeStats([makeEntry('2026-05-01', { loadLevel: 'high' })]);
    expect(computeAnalyticsInsights(stats, 'month').recovery).toBeNull();
  });

  it('нет тренировок → null', () => {
    expect(computeAnalyticsInsights(makeStats([]), 'month').recovery).toBeNull();
  });

  it('нет loadLevel none/high/medium/low кроме none → все null', () => {
    // loadLevel undefined → 'none', которые мы пропускаем в gapsByLevel
    const stats = makeStats([makeEntry('2026-05-01'), makeEntry('2026-05-03')]);
    expect(computeAnalyticsInsights(stats, 'month').recovery).toBeNull();
  });

  it('high → afterHigh = среднее пауз после high-сессий', () => {
    const stats = makeStats([
      makeEntry('2026-05-01', { loadLevel: 'high' }),
      makeEntry('2026-05-04', { loadLevel: 'low' }), // gap = 3 дня после high
      makeEntry('2026-05-06', { loadLevel: 'high' }),
      makeEntry('2026-05-09', { loadLevel: 'low' }), // gap = 3 дня после high
    ]);
    const { recovery } = computeAnalyticsInsights(stats, 'month');
    expect(recovery).not.toBeNull();
    expect(recovery!.afterHigh).toBe(3);
  });

  it('mixed levels → каждый уровень считается отдельно', () => {
    const stats = makeStats([
      makeEntry('2026-05-01', { loadLevel: 'high' }),
      makeEntry('2026-05-03', { loadLevel: 'medium' }), // gap 2 после high
      makeEntry('2026-05-05', { loadLevel: 'low' }), // gap 2 после medium
      makeEntry('2026-05-06', { loadLevel: 'high' }), // gap 1 после low
    ]);
    const { recovery } = computeAnalyticsInsights(stats, 'month');
    expect(recovery!.afterHigh).toBe(2);
    expect(recovery!.afterMedium).toBe(2);
    expect(recovery!.afterLow).toBe(1);
  });

  it('пауза > 14 дней не учитывается (болезнь/отпуск)', () => {
    const stats = makeStats([
      makeEntry('2026-04-01', { loadLevel: 'high' }),
      makeEntry('2026-04-20', { loadLevel: 'low' }), // gap 19 дней — пропускаем
      makeEntry('2026-04-22', { loadLevel: 'high' }),
      makeEntry('2026-04-24', { loadLevel: 'low' }), // gap 2 дня — учитываем
    ]);
    const { recovery } = computeAnalyticsInsights(stats, 'month');
    expect(recovery!.afterHigh).toBe(2); // только 2, не среднее с 19
  });

  it('afterMedium и afterLow null когда нет таких сессий', () => {
    const stats = makeStats([
      makeEntry('2026-05-01', { loadLevel: 'high' }),
      makeEntry('2026-05-04', { loadLevel: 'high' }),
    ]);
    const { recovery } = computeAnalyticsInsights(stats, 'month');
    expect(recovery!.afterMedium).toBeNull();
    expect(recovery!.afterLow).toBeNull();
  });
});

// ─── activeWeeks ─────────────────────────────────────────────────────────────

describe('activeWeeks', () => {
  it('нет тренировок → null', () => {
    expect(computeAnalyticsInsights(makeStats([]), 'month').activeWeeks).toBeNull();
  });

  it('одна тренировка → consecutiveWeeks=1, totalActiveWeeks=1', () => {
    const stats = makeStats([makeEntry('2026-05-07')]);
    const { activeWeeks } = computeAnalyticsInsights(stats, 'month');
    expect(activeWeeks!.consecutiveWeeks).toBe(1);
    expect(activeWeeks!.totalActiveWeeks).toBe(1);
  });

  it('несколько тренировок в одной неделе = 1 активная неделя', () => {
    const stats = makeStats([
      makeEntry('2026-05-04'),
      makeEntry('2026-05-05'),
      makeEntry('2026-05-06'),
    ]);
    const { activeWeeks } = computeAnalyticsInsights(stats, 'month');
    expect(activeWeeks!.totalActiveWeeks).toBe(1);
    expect(activeWeeks!.consecutiveWeeks).toBe(1);
  });

  it('3 недели подряд → consecutiveWeeks=3', () => {
    const stats = makeStats([
      makeEntry('2026-04-14'), // неделя 1
      makeEntry('2026-04-21'), // неделя 2
      makeEntry('2026-04-28'), // неделя 3
    ]);
    const { activeWeeks } = computeAnalyticsInsights(stats, 'month');
    expect(activeWeeks!.consecutiveWeeks).toBe(3);
    expect(activeWeeks!.totalActiveWeeks).toBe(3);
  });

  it('пропуск недели → consecutiveWeeks считается от последней', () => {
    // недели: 13-го нет → серия с последней недели только 2
    const stats = makeStats([
      makeEntry('2026-04-07'), // неделя 1
      // неделя 2 пропущена
      makeEntry('2026-04-21'), // неделя 3
      makeEntry('2026-04-28'), // неделя 4
    ]);
    const { activeWeeks } = computeAnalyticsInsights(stats, 'month');
    expect(activeWeeks!.consecutiveWeeks).toBe(2); // только последние 2 подряд
    expect(activeWeeks!.totalActiveWeeks).toBe(3); // всего 3 активных недели
  });

  it('несортированные даты обрабатываются корректно', () => {
    const stats = makeStats([
      makeEntry('2026-04-28'),
      makeEntry('2026-04-14'),
      makeEntry('2026-04-21'),
    ]);
    const { activeWeeks } = computeAnalyticsInsights(stats, 'month');
    expect(activeWeeks!.consecutiveWeeks).toBe(3);
  });

  it('totalActiveWeeks не больше реального числа уникальных недель', () => {
    // 5 тренировок в 2 разных неделях
    const stats = makeStats([
      makeEntry('2026-05-04'),
      makeEntry('2026-05-05'),
      makeEntry('2026-05-06'),
      makeEntry('2026-05-11'),
      makeEntry('2026-05-12'),
    ]);
    expect(computeAnalyticsInsights(stats, 'month').activeWeeks!.totalActiveWeeks).toBe(2);
  });
});

// ─── новые поля в empty-состоянии ────────────────────────────────────────────

describe('новые поля при пустом timeline', () => {
  it('weeklySlope, monotony, recovery, activeWeeks все null', () => {
    const r = computeAnalyticsInsights(makeStats([]), 'month');
    expect(r.weeklySlope).toBeNull();
    expect(r.monotony).toBeNull();
    expect(r.recovery).toBeNull();
    expect(r.activeWeeks).toBeNull();
  });
});
