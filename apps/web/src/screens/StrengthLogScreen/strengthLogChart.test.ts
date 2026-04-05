import { describe, it, expect } from 'vitest';
import {
  buildStrengthLogChartPoints,
  maxWeightInSets,
  strengthLogProgressPercent,
} from './strengthLogChart';
import type { StrengthLogEntry } from '@/api/athlete';

describe('maxWeightInSets', () => {
  it('возвращает 0 для пустого массива', () => {
    expect(maxWeightInSets([])).toBe(0);
  });

  it('находит максимум', () => {
    expect(maxWeightInSets([{ weight: 60 }, { weight: 100 }, { weight: 80 }])).toBe(100);
  });
});

describe('buildStrengthLogChartPoints', () => {
  it('использует best1RM если есть', () => {
    const entry: StrengthLogEntry = {
      exerciseId: 'x',
      exerciseName: 'Жим',
      sessions: [
        { date: '2026-01-02', workoutId: 2, sets: [], best1RM: 120 },
        { date: '2026-01-01', workoutId: 1, sets: [], best1RM: 100 },
      ],
    };
    const pts = buildStrengthLogChartPoints(entry);
    expect(pts).toHaveLength(2);
    expect(pts[0].value).toBe(100);
    expect(pts[1].value).toBe(120);
  });

  it('без 1RM берёт макс. вес из сетов', () => {
    const entry: StrengthLogEntry = {
      exerciseId: 'x',
      exerciseName: 'Тяга',
      sessions: [
        {
          date: '2026-01-01',
          workoutId: 1,
          sets: [{ weight: 140, reps: 5 }],
          best1RM: null,
        },
      ],
    };
    const pts = buildStrengthLogChartPoints(entry);
    expect(pts).toHaveLength(1);
    expect(pts[0].value).toBe(140);
  });

  it('пропускает сессии без веса', () => {
    const entry: StrengthLogEntry = {
      exerciseId: 'x',
      exerciseName: 'X',
      sessions: [
        { date: '2026-01-01', workoutId: 1, sets: [], best1RM: null },
      ],
    };
    expect(buildStrengthLogChartPoints(entry)).toHaveLength(0);
  });
});

describe('strengthLogProgressPercent', () => {
  it('null при одной сессии с данными', () => {
    const entry: StrengthLogEntry = {
      exerciseId: 'x',
      exerciseName: 'X',
      sessions: [{ date: '2026-01-01', workoutId: 1, sets: [], best1RM: 100 }],
    };
    expect(strengthLogProgressPercent(entry)).toBeNull();
  });

  it('считает % от более ранней к более поздней (API: сначала новые)', () => {
    const entry: StrengthLogEntry = {
      exerciseId: 'x',
      exerciseName: 'Жим',
      sessions: [
        { date: '2026-01-03', workoutId: 3, sets: [], best1RM: 120 },
        { date: '2026-01-01', workoutId: 1, sets: [], best1RM: 100 },
      ],
    };
    expect(strengthLogProgressPercent(entry)).toBe(20);
  });

  it('отрицательный при снижении', () => {
    const entry: StrengthLogEntry = {
      exerciseId: 'x',
      exerciseName: 'X',
      sessions: [
        { date: '2026-01-02', workoutId: 2, sets: [], best1RM: 90 },
        { date: '2026-01-01', workoutId: 1, sets: [], best1RM: 100 },
      ],
    };
    expect(strengthLogProgressPercent(entry)).toBe(-10);
  });
});
