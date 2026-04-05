import { describe, it, expect } from 'vitest';
import { generateRecommendations, sumZoneLoadsFromTimeline } from './getRecomendations';

describe('sumZoneLoadsFromTimeline', () => {
  it('суммирует без нормализации к max', () => {
    expect(
      sumZoneLoadsFromTimeline([
        { zones: { a: 0.5, b: 1 } },
        { zones: { a: 0.5, b: 0 } },
      ])
    ).toEqual({ a: 1, b: 1 });
  });
});

describe('generateRecommendations', () => {
  it('не создаёт отдельную карточку на каждую зону с низким «% от пика»', () => {
    const stats = {
      zones: {
        back: 1,
        glutes: 0,
        legs: 0.05,
        core: 0.02,
        biceps: 0.01,
      },
      timeline: [],
      totalVolume: 5000,
      avgIntensity: 0.45,
    };
    const recs = generateRecommendations(stats);
    const lowCards = recs.filter((r) => r.id.startsWith('zone_low_'));
    expect(lowCards).toHaveLength(0);
  });

  it('дисбаланс формулирует относительно лидера периода, не «общую нагрузку»', () => {
    const stats = {
      zones: { back: 1, glutes: 0.1 },
      timeline: [],
      totalVolume: 1000,
      avgIntensity: 0.6,
    };
    const imbalance = generateRecommendations(stats).find((r) => r.id === 'muscle_imbalance');
    expect(imbalance).toBeDefined();
    expect(imbalance?.description).toContain('лидирует');
    expect(imbalance?.description).not.toContain('общей нагрузки');
  });

  it('интенсивность: учёт normalizeIntensity (0–1 → %)', () => {
    const highAvg = {
      zones: { legs: 1 },
      timeline: [],
      totalVolume: 1000,
      avgIntensity: 0.85,
    };
    expect(generateRecommendations(highAvg).some((r) => r.id === 'intensity_high')).toBe(true);

    const midAvg = {
      zones: { legs: 1 },
      timeline: [],
      totalVolume: 1000,
      avgIntensity: 0.5,
    };
    const mid = generateRecommendations(midAvg);
    expect(mid.some((r) => r.id === 'intensity_low')).toBe(false);
    expect(mid.some((r) => r.id === 'intensity_high')).toBe(false);
  });

  it('одна карточка zones_low_share при малых долях по сумме таймлайна', () => {
    const stats = {
      zones: { a: 1, b: 0.2, c: 0.15, d: 0.1, e: 0.05 },
      timeline: [
        { zones: { a: 1, b: 0.1, c: 0.1, d: 0.05, e: 0.02 } },
        { zones: { a: 0.8, b: 0.05, c: 0.03, d: 0.02, e: 0.01 } },
      ],
      totalVolume: 2000,
      avgIntensity: 0.55,
    };
    const recs = generateRecommendations(stats);
    const shareRecs = recs.filter((r) => r.id === 'zones_low_share');
    expect(shareRecs.length).toBeLessThanOrEqual(1);
  });
});
