import { test } from '@japa/runner';
import { WorkoutCalculator, WorkoutCalculationResult } from '#services/WorkoutCalculator';

/**
 * Создаем упрощенный мок упражнения, чтобы не тянуть зависимости базы данных
 */
const createExercise = (id: string, zones: string[], intensity: number) =>
  ({
    id,
    zones,
    intensity,
  }) as any;

/**
 * Создаем мок тренировок для calculatePeriodStats
 */
const createWorkout = (
  id: string,
  type: 'crossfit' | 'bodybuilding',
  zonesLoad: Record<string, number>,
  totalVolume: number,
  totalIntensity: number | string,
  date = new Date()
) =>
  ({
    id,
    workoutType: type,
    zonesLoad,
    totalVolume,
    totalIntensity,
    date,
  }) as any;

test.group('WorkoutCalculator (Калькулятор тренировок)', () => {
  /* -------------------------------- BODYBUILDING -------------------------------- */
  test('бодибилдинг: корректно считает объем и ограничивает нагрузку', async ({ assert }) => {
    const exercise = createExercise('ex1', ['ноги'], 0.8);
    WorkoutCalculator['loadExercises'] = async () => new Map([['ex1', exercise]]);

    const result = await WorkoutCalculator.calculateZoneLoads(
      [{ exerciseId: 'ex1', sets: 2, reps: 5, weight: 1000 }],
      'bodybuilding'
    );

    assert.equal(result.totalVolume, 10000);
    assert.equal(result.zonesLoad.ноги, 1);
    assert.equal(result.totalIntensity, 0.8);
  });

  test('бодибилдинг: использует значения по умолчанию при пустом вводе', async ({ assert }) => {
    const exercise = createExercise('ex1', ['спина'], 0.5);
    WorkoutCalculator['loadExercises'] = async () => new Map([['ex1', exercise]]);

    const result = await WorkoutCalculator.calculateZoneLoads(
      [{ exerciseId: 'ex1' }],
      'bodybuilding'
    );

    assert.equal(result.totalVolume, 0);
    assert.equal(result.totalIntensity, 0);
  });

  test('бодибилдинг: малый вес дает частичную нагрузку < 1', async ({ assert }) => {
    const exercise = createExercise('ex2', ['плечи'], 0.6);
    WorkoutCalculator['loadExercises'] = async () => new Map([['ex2', exercise]]);

    const result = await WorkoutCalculator.calculateZoneLoads(
      [{ exerciseId: 'ex2', sets: 1, reps: 1, weight: 50 }], // 50 < 100 → нормализация < 1
      'bodybuilding'
    );

    const expectedLoad = 0.6 * ((1 * 1 * (50 / 100)) / 10); // = 0.6 * 0.05 = 0.03
    assert.closeTo(result.zonesLoad.плечи, 1, 0.001); // после нормализации к max=0.03 → 1
    assert.closeTo(result.totalIntensity, 0.03, 0.001); // среднее = load / 1
  });

  /* -------------------------------- CROSSFIT -------------------------------- */
  test('кроссфит: ограничивает нагрузку по лимиту раундов', async ({ assert }) => {
    const exercise = createExercise('ex3', ['руки'], 0.6);
    WorkoutCalculator['loadExercises'] = async () => new Map([['ex3', exercise]]);

    const result = await WorkoutCalculator.calculateZoneLoads(
      [{ exerciseId: 'ex3', rounds: 10 }],
      'crossfit'
    );

    assert.equal(result.totalVolume, 0);
    assert.equal(result.zonesLoad.руки, 1);
    assert.equal(result.totalIntensity, 0.6);
  });

  test('кроссфит: частичная нагрузка при раундах < MAX_ROUNDS_FOR_FULL_LOAD', async ({
    assert,
  }) => {
    const exercise = createExercise('ex4', ['грудь'], 0.8);
    WorkoutCalculator['loadExercises'] = async () => new Map([['ex4', exercise]]);

    const result = await WorkoutCalculator.calculateZoneLoads(
      [{ exerciseId: 'ex4', rounds: 2 }], // лимит 5 → 2/5 = 0.4
      'crossfit'
    );

    // Нормализуется к maxLoad, здесь только одно упражнение → load = 0.8 * 0.4 = 0.32
    assert.closeTo(result.zonesLoad.грудь, 1, 0.001); // после нормализации к max
    assert.closeTo(result.totalIntensity, 0.32, 0.001);
    assert.equal(result.totalVolume, 0);
  });

  /* -------------------------------- НОРМАЛИЗАЦИЯ ЗОН -------------------------------- */
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
        { exerciseId: 'ex1', sets: 1, reps: 1, weight: 1000 }, // нагрузка = 0.5 * 1 = 0.5
        { exerciseId: 'ex2', sets: 1, reps: 1, weight: 1000 }, // нагрузка = 1.0 * 1 = 1
      ],
      'bodybuilding'
    );

    assert.equal(result.zonesLoad.ноги, 0.5);
    assert.equal(result.zonesLoad.руки, 1);
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

  /* -------------------------------- CALCULATE PERIOD STATS -------------------------------- */
  test('calculatePeriodStats: корректно считает по пустому массиву', ({ assert }) => {
    const result = WorkoutCalculator.calculatePeriodStats([], 'week');

    assert.equal(result.workoutsCount, 0);
    assert.equal(result.totalVolume, 0);
    assert.equal(result.avgIntensity, 0);
    assert.deepEqual(result.byType, {});
    assert.deepEqual(result.zones, {});
    assert.deepEqual(result.timeline, []);
    assert.equal(result.period, 'week');
  });

  test('calculatePeriodStats: суммирует тренировки и нормализует зоны', ({ assert }) => {
    const w1 = createWorkout(
      'w1',
      'bodybuilding',
      { ноги: 3, руки: 1 },
      1000,
      '0.8',
      new Date('2026-01-01')
    );
    const w2 = createWorkout(
      'w2',
      'crossfit',
      { ноги: 1, грудь: 2 },
      500,
      0.6,
      new Date('2026-01-02')
    );
    const result = WorkoutCalculator.calculatePeriodStats([w1, w2], 'week');

    // zones: ноги = 3+1=4, руки=1, грудь=2 → max=4 → нормализуем
    assert.closeTo(result.zones.ноги, 1, 0.001);
    assert.closeTo(result.zones.руки, 1 / 4, 0.001);
    assert.closeTo(result.zones.грудь, 2 / 4, 0.001);

    // avgIntensity = (0.8+0.6)/2=0.7
    assert.closeTo(result.avgIntensity, 0.7, 0.001);

    // byType
    assert.deepEqual(result.byType, { bodybuilding: 1, crossfit: 1 });

    // timeline
    assert.equal(result.timeline.length, 2);
    assert.equal(result.timeline[0].intensity, 0.8);
    assert.equal(result.timeline[1].intensity, 0.6);
  });
});
