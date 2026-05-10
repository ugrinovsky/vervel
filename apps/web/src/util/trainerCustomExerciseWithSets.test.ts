import { describe, it, expect } from 'vitest';
import { buildTrainerCustomExerciseWithSets } from './trainerCustomExerciseWithSets';

let id = 0;
const sequentialId = () => `id-${++id}`;

describe('buildTrainerCustomExerciseWithSets', () => {
  it('cardio: один подход, длительность 20 мин, id custom:name', () => {
    id = 0;
    const ex = buildTrainerCustomExerciseWithSets('cardio', 'Бег в зоне 2', sequentialId);
    expect(ex.exerciseId).toBe('custom:Бег в зоне 2');
    expect(ex.title).toBe('Бег в зоне 2');
    expect(ex.duration).toBe(20);
    expect(ex.sets).toEqual([{ id: 'id-1', reps: 1, weight: 0 }]);
  });

  it('не cardio: три подхода по 10 раз', () => {
    id = 0;
    const ex = buildTrainerCustomExerciseWithSets('bodybuilding', 'Своё упражнение', sequentialId);
    expect(ex.exerciseId).toBe('custom:Своё упражнение');
    expect(ex.duration).toBeUndefined();
    expect(ex.sets).toEqual([
      { id: 'id-1', reps: 10, weight: 0 },
      { id: 'id-2', reps: 10, weight: 0 },
      { id: 'id-3', reps: 10, weight: 0 },
    ]);
  });

  it('crossfit получает три силовых подхода по умолчанию', () => {
    id = 0;
    const ex = buildTrainerCustomExerciseWithSets('crossfit', 'WOD-кастом');
    expect(ex.sets).toHaveLength(3);
    expect(ex.sets.every((s) => s.reps === 10 && s.weight === 0)).toBe(true);
  });
});
