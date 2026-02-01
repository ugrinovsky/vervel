import { test } from '@japa/runner';
import { WorkoutCalculator } from '#services/WorkoutCalculator';

/**
 * Создаем упрощенный мок упражнения, чтобы не тянуть зависимости базы данных
 */
const createExercise = (id: string, zones: string[], intensity: number) =>
  ({
    id,
    zones,
    intensity,
  }) as any;

test.group('WorkoutCalculator (Калькулятор тренировок)', () => {
  test('бодибилдинг: корректно считает объем и ограничивает нагрузку', async ({ assert }) => {
    // Вес 1000 при делителе 100 и макс. объеме 10 даст ровно 1.0 (лимит коэффициента объема)
    const exercise = createExercise('ex1', ['ноги'], 0.8);
    WorkoutCalculator['loadExercises'] = async () => new Map([['ex1', exercise]]);

    const result = await WorkoutCalculator.calculateZoneLoads(
      [{ exerciseId: 'ex1', sets: 2, reps: 5, weight: 1000 }],
      'bodybuilding'
    );

    assert.equal(result.totalVolume, 10000); // 2 подх * 5 повт * 1000 кг
    assert.equal(result.zonesLoad.ноги, 1); // Самая нагруженная зона всегда нормализуется к 1
    assert.equal(result.totalIntensity, 0.8); // интенсивность 0.8 * коэф. объема 1.0
  });

  test('кроссфит: ограничивает нагрузку по лимиту раундов', async ({ assert }) => {
    // 5 раундов в коде — это порог для 100% интенсивности упражнения
    const exercise = createExercise('ex2', ['руки'], 0.6);
    WorkoutCalculator['loadExercises'] = async () => new Map([['ex2', exercise]]);

    const result = await WorkoutCalculator.calculateZoneLoads(
      [{ exerciseId: 'ex2', rounds: 10 }], // Передаем 10 раундов (лимит сработает на 5)
      'crossfit'
    );

    assert.equal(result.totalVolume, 0); // В кроссфите объем всегда 0 по текущей логике
    assert.equal(result.zonesLoad.руки, 1); // Нормализация к единице
    assert.equal(result.totalIntensity, 0.6);
  });

  test('нормализация: правильно масштабирует нагрузку нескольких зон', async ({ assert }) => {
    const ex1 = createExercise('ex1', ['ноги'], 0.5);
    const ex2 = createExercise('ex2', ['руки'], 1.0);

    WorkoutCalculator['loadExercises'] = async () =>
      new Map([
        ['ex1', ex1],
        ['ex2', ex2],
      ]);

    const result = await WorkoutCalculator.calculateZoneLoads(
      [
        { exerciseId: 'ex1', sets: 1, reps: 1, weight: 1000 }, // нагрузка = 0.5 * 1.0 = 0.5
        { exerciseId: 'ex2', sets: 1, reps: 1, weight: 1000 }, // нагрузка = 1.0 * 1.0 = 1.0
      ],
      'bodybuilding'
    );

    // Максимальная нагрузка была 1.0 (у ex2). Относительно неё:
    // ноги = 0.5 / 1.0 = 0.5
    // руки = 1.0 / 1.0 = 1.0
    assert.equal(result.zonesLoad.ноги, 0.5);
    assert.equal(result.zonesLoad.руки, 1);
    // Средняя интенсивность = (0.5 + 1.0) / 2 = 0.75
    assert.equal(result.totalIntensity, 0.75);
  });

  test('игнорирует неизвестные упражнения и возвращает пустой результат', async ({ assert }) => {
    WorkoutCalculator['loadExercises'] = async () => new Map();

    const result = await WorkoutCalculator.calculateZoneLoads(
      [{ exerciseId: 'unknown_id' }],
      'bodybuilding'
    );

    assert.deepEqual(result.zonesLoad, {});
    assert.equal(result.totalVolume, 0);
    assert.equal(result.totalIntensity, 0);
  });

  test('бодибилдинг: использует значения по умолчанию при пустом вводе', async ({ assert }) => {
    const exercise = createExercise('ex1', ['спина'], 0.5);
    WorkoutCalculator['loadExercises'] = async () => new Map([['ex1', exercise]]);

    // Передаем только ID, вес по умолчанию 0 — нагрузка должна обнулиться
    const result = await WorkoutCalculator.calculateZoneLoads(
      [{ exerciseId: 'ex1' }],
      'bodybuilding'
    );

    assert.equal(result.totalVolume, 0);
    assert.equal(result.totalIntensity, 0);
  });
});
