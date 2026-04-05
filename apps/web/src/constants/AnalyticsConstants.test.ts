import { describe, it, expect } from 'vitest';
import {
  analyticsCalendarDaysApprox,
  aggregateZonesFromTimeline,
  referenceVolumePerSessionKg,
  computeMuscleBalancePercent,
  metricCardBadge,
  METRIC_CARD_BADGE_THRESHOLDS,
  ANALYTICS_PERIOD_WEEKS,
  RADAR_VOLUME_REF_KG,
  IDEAL_WORKOUTS_PER_WEEK,
  getLoadLabel,
  getTrendDirection,
  normalizeZones,
  normalizeIntensity,
  formatVolume,
  formatVolumeCompact,
  LOAD_LABELS,
  TREND_THRESHOLDS,
} from './AnalyticsConstants';

describe('aggregateZonesFromTimeline', () => {
  it('пустой таймлайн — пустой объект', () => {
    expect(aggregateZonesFromTimeline([])).toEqual({});
  });

  it('суммирует зоны и нормализует к max=1', () => {
    expect(
      aggregateZonesFromTimeline([
        { zones: { legs: 0.5, chest: 1 } },
        { zones: { legs: 0.5, chest: 0 } },
      ])
    ).toEqual({ legs: 1, chest: 1 });
  });
});

describe('metricCardBadge', () => {
  const { EXCELLENT, GOOD, OK } = METRIC_CARD_BADGE_THRESHOLDS;

  it('null / undefined / NaN — бейдж-заглушка', () => {
    expect(metricCardBadge(null).label).toBe('—');
    expect(metricCardBadge(undefined).label).toBe('—');
    expect(metricCardBadge(NaN).label).toBe('—');
  });

  it('границы: Отлично ≥ EXCELLENT, Хорошо ≥ GOOD, Норма ≥ OK, иначе Слабо', () => {
    expect(metricCardBadge(EXCELLENT).label).toBe('Отлично');
    expect(metricCardBadge(EXCELLENT + 0.1).label).toBe('Отлично');
    expect(metricCardBadge(GOOD).label).toBe('Хорошо');
    expect(metricCardBadge(EXCELLENT - 0.1).label).toBe('Хорошо');
    expect(metricCardBadge(OK).label).toBe('Норма');
    expect(metricCardBadge(GOOD - 0.1).label).toBe('Норма');
    expect(metricCardBadge(OK - 0.1).label).toBe('Слабо');
    expect(metricCardBadge(0).label).toBe('Слабо');
  });

  it('clamp 0–100', () => {
    expect(metricCardBadge(150).label).toBe('Отлично');
    expect(metricCardBadge(-10).label).toBe('Слабо');
  });
});

describe('analyticsCalendarDaysApprox', () => {
  it('неделя ≈ 7 календарных дней', () => {
    expect(analyticsCalendarDaysApprox('week')).toBe(7);
    expect(analyticsCalendarDaysApprox('week')).toBe(
      Math.max(1, Math.round(ANALYTICS_PERIOD_WEEKS.week * 7))
    );
  });

  it('месяц ≈ 30 дней (округление от 30/7 недель)', () => {
    expect(analyticsCalendarDaysApprox('month')).toBe(30);
  });

  it('год ≈ 365 дней', () => {
    expect(analyticsCalendarDaysApprox('year')).toBe(365);
  });

  it('всегда минимум 1', () => {
    // защита от нуля при гипотетическом нулевом окне
    expect(analyticsCalendarDaysApprox('week')).toBeGreaterThanOrEqual(1);
  });
});

describe('referenceVolumePerSessionKg', () => {
  it('неделя: RADAR_VOLUME_REF_KG / (недели × целевая частота)', () => {
    const expected =
      RADAR_VOLUME_REF_KG.week / (ANALYTICS_PERIOD_WEEKS.week * IDEAL_WORKOUTS_PER_WEEK);
    expect(referenceVolumePerSessionKg('week')).toBeCloseTo(expected, 5);
    expect(referenceVolumePerSessionKg('week')).toBe(4000);
  });

  it('месяц и год согласованы с константами', () => {
    const forMonth = (p: 'month') => {
      const w = ANALYTICS_PERIOD_WEEKS[p];
      const sessions = Math.max(0.5, w * IDEAL_WORKOUTS_PER_WEEK);
      return RADAR_VOLUME_REF_KG[p] / sessions;
    };
    expect(referenceVolumePerSessionKg('month')).toBeCloseTo(forMonth('month'), 5);

    const forYear = (p: 'year') => {
      const w = ANALYTICS_PERIOD_WEEKS[p];
      const sessions = Math.max(0.5, w * IDEAL_WORKOUTS_PER_WEEK);
      return RADAR_VOLUME_REF_KG[p] / sessions;
    };
    expect(referenceVolumePerSessionKg('year')).toBeCloseTo(forYear('year'), 5);
  });
});

describe('computeMuscleBalancePercent', () => {
  it('пустой объект — 0%', () => {
    expect(computeMuscleBalancePercent({})).toBe(0);
  });

  it('одна зона — 100%', () => {
    expect(computeMuscleBalancePercent({ грудь: 5000 })).toBe(100);
  });

  it('равные доли — 100%', () => {
    expect(computeMuscleBalancePercent({ a: 1, b: 1, c: 1, d: 1 })).toBe(100);
  });

  it('две зоны 50/50 — 100%', () => {
    expect(computeMuscleBalancePercent({ a: 50, b: 50 })).toBe(100);
  });

  it('суммарный объём 0 — 0%', () => {
    expect(computeMuscleBalancePercent({ a: 0, b: 0 })).toBe(0);
  });

  it('сильный перекос снижает баланс', () => {
    const skewed = computeMuscleBalancePercent({ a: 90, b: 10 });
    const balanced = computeMuscleBalancePercent({ a: 50, b: 50 });
    expect(skewed).toBeLessThan(balanced);
    expect(skewed).toBe(20);
  });

  it('NaN в зоне даёт 0 к доле; при двух зонах остаётся перекос к одной', () => {
    expect(computeMuscleBalancePercent({ a: 100, b: NaN as unknown as number })).toBe(0);
  });

  it('одна зона с NaN после приведения — одна «нулевая» метрика, считается как одна зона → 100%', () => {
    expect(computeMuscleBalancePercent({ x: NaN as unknown as number })).toBe(100);
  });
});

describe('getLoadLabel', () => {
  it('ступени по LOAD_THRESHOLDS (0–100)', () => {
    expect(getLoadLabel(100)).toBe(LOAD_LABELS.VERY_HIGH);
    expect(getLoadLabel(80)).toBe(LOAD_LABELS.VERY_HIGH);
    expect(getLoadLabel(79)).toBe(LOAD_LABELS.HIGH);
    expect(getLoadLabel(60)).toBe(LOAD_LABELS.HIGH);
    expect(getLoadLabel(59)).toBe(LOAD_LABELS.MEDIUM);
    expect(getLoadLabel(40)).toBe(LOAD_LABELS.MEDIUM);
    expect(getLoadLabel(39)).toBe(LOAD_LABELS.LOW);
    expect(getLoadLabel(20)).toBe(LOAD_LABELS.LOW);
    expect(getLoadLabel(19)).toBe(LOAD_LABELS.VERY_LOW);
    expect(getLoadLabel(0)).toBe(LOAD_LABELS.VERY_LOW);
  });
});

describe('getTrendDirection', () => {
  it('пороги TREND_THRESHOLDS (п.п.)', () => {
    expect(getTrendDirection(TREND_THRESHOLDS.UP + 0.1)).toBe('up');
    expect(getTrendDirection(TREND_THRESHOLDS.UP)).toBe('stable');
    expect(getTrendDirection(0)).toBe('stable');
    expect(getTrendDirection(TREND_THRESHOLDS.DOWN)).toBe('stable');
    expect(getTrendDirection(TREND_THRESHOLDS.DOWN - 0.1)).toBe('down');
  });
});

describe('normalizeZones', () => {
  it('значения > 1 делятся на 100', () => {
    expect(normalizeZones({ a: 50, b: 1.5 })).toEqual({ a: 0.5, b: 0.015 });
  });

  it('0–1 не трогаем', () => {
    expect(normalizeZones({ a: 0, b: 1 })).toEqual({ a: 0, b: 1 });
  });
});

describe('normalizeIntensity', () => {
  it('> 1 — уже проценты', () => {
    expect(normalizeIntensity(72)).toBe(72);
  });

  it('≤ 1 — доля 0–1 → 0–100', () => {
    expect(normalizeIntensity(0)).toBe(0);
    expect(normalizeIntensity(0.5)).toBe(50);
    expect(normalizeIntensity(1)).toBe(100);
  });
});

describe('formatVolume', () => {
  it('ниже порога — кг', () => {
    expect(formatVolume(0)).toBe('0 кг');
    expect(formatVolume(999)).toBe('999 кг');
  });

  it('≥ 1000 кг — тонны с десятыми', () => {
    expect(formatVolume(1000)).toBe('1.0 т');
    expect(formatVolume(2500)).toBe('2.5 т');
  });
});

describe('formatVolumeCompact', () => {
  it('без пробелов', () => {
    expect(formatVolumeCompact(500)).toBe('500кг');
    expect(formatVolumeCompact(1000)).toBe('1.0т');
  });
});
