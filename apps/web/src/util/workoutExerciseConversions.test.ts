import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ExerciseData } from '@/api/trainer';
import { canonicalCustomExerciseKey } from '@/utils/canonicalCustomExerciseKey';
import {
  exerciseWithSetsToExerciseData,
  exerciseWithSetsToWorkoutExercise,
  exerciseDataToWorkoutExercise,
} from '@/util/workoutExerciseConversions';

beforeEach(() => {
  let i = 0;
  vi.spyOn(crypto, 'randomUUID').mockImplementation(
    (): `${string}-${string}-${string}-${string}-${string}` => {
      i += 1;
      const h = `${i.toString(16)}000000010000401080800701c00`.slice(0, 12);
      return `00000000-0000-4000-8000-${h}` as `${string}-${string}-${string}-${string}-${string}`;
    }
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('кастомные упражнения (picker → редактор / API)', () => {
  it('exerciseWithSetsToExerciseData сохраняет custom:id как строковый exerciseId (силовая)', () => {
    const data = exerciseWithSetsToExerciseData(
      {
        exerciseId: 'custom:Жим узкий',
        title: 'Жим узкий',
        sets: [
          { id: 's1', reps: 10, weight: 0 },
          { id: 's2', reps: 10, weight: 0 },
          { id: 's3', reps: 10, weight: 0 },
        ],
      },
      'bodybuilding'
    );
    expect(data.exerciseId).toBe('custom:Жим узкий');
    expect(data.name).toBe('Жим узкий');
    expect(data.setsDetail).toHaveLength(3);
  });

  it('exerciseDataToWorkoutExercise не перезаписывает уже заданный custom:* exerciseId', () => {
    const ex: ExerciseData = {
      name: 'Жим узкий',
      exerciseId: 'custom:Жим узкий',
      sets: 3,
      reps: 10,
      setsDetail: [
        { reps: 10, weight: 20 },
        { reps: 10, weight: 20 },
        { reps: 10, weight: 20 },
      ],
    };
    const w = exerciseDataToWorkoutExercise(ex, 'bodybuilding');
    expect(w.exerciseId).toBe('custom:Жим узкий');
    expect(w.type).toBe('strength');
    const sets = w.sets!;
    expect(sets).toHaveLength(3);
    expect(sets[0]?.reps).toBe(10);
    expect(sets[0]?.weight).toBe(20);
  });

  it('если exerciseId нет — строится custom: по canonical ключу имени', () => {
    const ex: ExerciseData = {
      name: 'Жим  лёжа',
      setsDetail: [{ reps: 8, weight: 60 }],
    };
    const w = exerciseDataToWorkoutExercise(ex, 'bodybuilding');
    expect(w.exerciseId).toBe(`custom:${canonicalCustomExerciseKey('Жим  лёжа')}`);
  });

  it('exerciseWithSetsToWorkoutExercise: кардио с custom:title → time-сет и duration в секундах', () => {
    const we = exerciseWithSetsToWorkoutExercise(
      {
        exerciseId: 'custom:Гребля',
        title: 'Гребля',
        sets: [{ id: 's', reps: 1, weight: 0 }],
        duration: 25,
      },
      'cardio'
    );
    expect(we.type).toBe('cardio');
    expect(we.exerciseId).toBe('custom:Гребля');
    expect(we.duration).toBe(25 * 60);
    const cardioSets = we.sets!;
    expect(cardioSets.length).toBe(1);
    expect(cardioSets[0]?.time).toBe(25 * 60);
  });
});
