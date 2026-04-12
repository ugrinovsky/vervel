import { test } from '@japa/runner'
import { WorkoutCalculator, RECOVERY_INTENSITY_SATURATION_K } from '#services/WorkoutCalculator'

function expectedRecoveryIntensity(decayedAbs: number): number {
  const x = Math.max(0, decayedAbs)
  if (x <= 0) return 0
  return 1 - Math.exp(-RECOVERY_INTENSITY_SATURATION_K * x)
}

/**
 * Создаем упрощенный мок упражнения, чтобы не тянуть зависимости базы данных
 */
const createExercise = (id: string, zones: string[], intensity: number) =>
  ({
    id,
    zones,
    intensity,
  }) as any

/**
 * Создаем мок тренировок для calculatePeriodStats
 */
const createWorkout = (
  id: string,
  type: 'crossfit' | 'bodybuilding',
  zonesLoad: Record<string, number>,
  totalVolume: number,
  totalIntensity: number | string,
  date = new Date(),
  exercises: any[] = [{ exerciseId: 'ex1' }],
  rpe: number | null = 5
) =>
  ({
    id,
    workoutType: type,
    zonesLoad,
    // In production we now use zonesLoadAbs (absolute) for recovery/stats.
    // For unit tests, default it to zonesLoad unless explicitly overridden.
    zonesLoadAbs: zonesLoad,
    totalVolume,
    totalIntensity,
    exercises,
    rpe,
    date,
  }) as any

test.group('WorkoutCalculator (Калькулятор тренировок)', () => {
  /* -------------------------------- BODYBUILDING -------------------------------- */
  test('бодибилдинг: корректно считает объем и ограничивает нагрузку', async ({ assert }) => {
    const exercise = createExercise('ex1', ['ноги'], 0.8)
    WorkoutCalculator['loadExercises'] = async () => new Map([['ex1', exercise]])

    const result = await WorkoutCalculator.calculateZoneLoads(
      [
        {
          exerciseId: 'ex1',
          type: 'strength' as const,
          sets: [
            { id: '1', reps: 5, weight: 1000 },
            { id: '2', reps: 5, weight: 1000 },
          ],
        },
      ],
      'bodybuilding'
    )

    assert.equal(result.totalVolume, 10000)
    assert.equal(result.zonesLoad.ноги, 1)
    assert.isAbove(result.zonesLoadAbs.ноги, 0)
    assert.equal(result.totalIntensity, 0.8)
  })

  test('бодибилдинг: использует значения по умолчанию при пустом вводе', async ({ assert }) => {
    const exercise = createExercise('ex1', ['спина'], 0.5)
    WorkoutCalculator['loadExercises'] = async () => new Map([['ex1', exercise]])

    const result = await WorkoutCalculator.calculateZoneLoads(
      [{ exerciseId: 'ex1', type: 'strength' as const, sets: [] }],
      'bodybuilding'
    )

    assert.equal(result.totalVolume, 0)
    assert.equal(result.totalIntensity, 0)
  })

  test('бодибилдинг: weight=0 не обнуляет нагрузку (считаем по reps)', async ({ assert }) => {
    const exercise = createExercise('exZ', ['biceps'], 0.7)
    WorkoutCalculator['loadExercises'] = async () => new Map([['exZ', exercise]])

    const result = await WorkoutCalculator.calculateZoneLoads(
      [
        {
          exerciseId: 'exZ',
          type: 'strength' as const,
          sets: [
            { id: '1', reps: 12, weight: 0 },
            { id: '2', reps: 12, weight: 0 },
            { id: '3', reps: 12, weight: 0 },
          ],
        },
      ],
      'bodybuilding'
    )

    assert.isAbove(result.zonesLoadAbs.biceps, 0)
    assert.equal(result.zonesLoad.biceps, 1)
    assert.isAbove(result.totalIntensity, 0)
    assert.equal(result.totalVolume, 0) // weight unknown → volume stays 0
  })

  test('бодибилдинг: малый вес дает частичную нагрузку < 1', async ({ assert }) => {
    const exercise = createExercise('ex2', ['плечи'], 0.6)
    WorkoutCalculator['loadExercises'] = async () => new Map([['ex2', exercise]])

    const result = await WorkoutCalculator.calculateZoneLoads(
      [
        {
          exerciseId: 'ex2',
          type: 'strength' as const,
          sets: [{ id: '1', reps: 1, weight: 50 }],
        },
      ], // 50 < 100 → нормализация < 1
      'bodybuilding'
    )

    // expectedLoad = 0.6 * ((1 * 1 * (50 / 100)) / 10) = 0.6 * 0.05 = 0.03
    assert.closeTo(result.zonesLoad.плечи, 1, 0.001) // после нормализации к max=0.03 → 1
    assert.closeTo(result.zonesLoadAbs.плечи, 0.03, 0.001) // абсолютная нагрузка
    assert.closeTo(result.totalIntensity, 0.03, 0.001) // среднее = load / 1
  })

  /* -------------------------------- CROSSFIT -------------------------------- */
  test('кроссфит: ограничивает нагрузку по лимиту раундов', async ({ assert }) => {
    const exercise = createExercise('ex3', ['руки'], 0.6)
    WorkoutCalculator['loadExercises'] = async () => new Map([['ex3', exercise]])

    const result = await WorkoutCalculator.calculateZoneLoads(
      [{ exerciseId: 'ex3', type: 'wod' as const, rounds: 10 }],
      'crossfit'
    )

    assert.equal(result.totalVolume, 0)
    assert.equal(result.zonesLoad.руки, 1)
    assert.equal(result.totalIntensity, 0.6)
  })

  test('кроссфит: частичная нагрузка при раундах < MAX_ROUNDS_FOR_FULL_LOAD', async ({
    assert,
  }) => {
    const exercise = createExercise('ex4', ['грудь'], 0.8)
    WorkoutCalculator['loadExercises'] = async () => new Map([['ex4', exercise]])

    const result = await WorkoutCalculator.calculateZoneLoads(
      [{ exerciseId: 'ex4', type: 'wod' as const, rounds: 2 }], // лимит 5 → 2/5 = 0.4
      'crossfit'
    )

    // Нормализуется к maxLoad, здесь только одно упражнение → load = 0.8 * 0.4 = 0.32
    assert.closeTo(result.zonesLoad.грудь, 1, 0.001) // после нормализации к max
    assert.closeTo(result.totalIntensity, 0.32, 0.001)
    assert.equal(result.totalVolume, 0)
  })

  /* -------------------------------- CARDIO -------------------------------- */
  test('кардио: ограничивает нагрузку по лимиту времени', async ({ assert }) => {
    const exercise = createExercise('ex5', ['ноги', 'выносливость'], 0.7)
    WorkoutCalculator['loadExercises'] = async () => new Map([['ex5', exercise]])

    const result = await WorkoutCalculator.calculateZoneLoads(
      [{ exerciseId: 'ex5', type: 'cardio' as const, duration: 3600 }], // 1 час = full load
      'cardio'
    )

    assert.equal(result.totalVolume, 0)
    assert.closeTo(result.zonesLoad.ноги, 1, 0.001)
    assert.closeTo(result.zonesLoad.выносливость, 1, 0.001)
    // Абсолютная нагрузка распределена между зонами
    assert.closeTo(result.zonesLoadAbs.ноги, 0.35, 0.001)
    assert.closeTo(result.zonesLoadAbs.выносливость, 0.35, 0.001)
    assert.equal(result.totalIntensity, 0.7)
  })

  test('кардио: частичная нагрузка при времени < MAX_TIME_FOR_FULL_LOAD', async ({ assert }) => {
    const exercise = createExercise('ex6', ['сердце'], 0.6)
    WorkoutCalculator['loadExercises'] = async () => new Map([['ex6', exercise]])

    const result = await WorkoutCalculator.calculateZoneLoads(
      [{ exerciseId: 'ex6', type: 'cardio' as const, duration: 1800 }], // 30 мин = 1800 / 3600 = 0.5
      'cardio'
    )

    // load = 0.6 * 0.5 = 0.3, после нормализации к max → 1
    assert.closeTo(result.zonesLoad.сердце, 1, 0.001)
    assert.closeTo(result.totalIntensity, 0.3, 0.001)
    assert.equal(result.totalVolume, 0)
  })

  test('кардио: использует значение по умолчанию при отсутствии duration', async ({ assert }) => {
    const exercise = createExercise('ex7', ['выносливость'], 0.5)
    WorkoutCalculator['loadExercises'] = async () => new Map([['ex7', exercise]])

    const result = await WorkoutCalculator.calculateZoneLoads(
      [{ exerciseId: 'ex7', type: 'cardio' as const }],
      'cardio'
    )

    // duration по умолчанию = 1, timeFactor = 1/3600 ≈ 0.00028, load = 0.5 * 0.00028 ≈ 0.00014
    assert.isBelow(result.totalIntensity, 0.001)
  })

  /* -------------------------------- НОРМАЛИЗАЦИЯ ЗОН -------------------------------- */
  test('нормализация: правильно масштабирует нагрузку нескольких зон', async ({ assert }) => {
    const ex1 = createExercise('ex1', ['ноги'], 0.5)
    const ex2 = createExercise('ex2', ['руки'], 1.0)

    WorkoutCalculator['loadExercises'] = async () =>
      new Map([
        ['ex1', ex1],
        ['ex2', ex2],
      ])

    const result = await WorkoutCalculator.calculateZoneLoads(
      [
        {
          exerciseId: 'ex1',
          type: 'strength' as const,
          sets: [{ id: '1', reps: 1, weight: 1000 }],
        }, // нагрузка = 0.5 * 1 = 0.5
        {
          exerciseId: 'ex2',
          type: 'strength' as const,
          sets: [{ id: '1', reps: 1, weight: 1000 }],
        }, // нагрузка = 1.0 * 1 = 1
      ],
      'bodybuilding'
    )

    assert.equal(result.zonesLoad.ноги, 0.5)
    assert.equal(result.zonesLoad.руки, 1)
    assert.equal(result.totalIntensity, 0.75)
  })

  test('игнорирует неизвестные упражнения и возвращает пустой результат', async ({ assert }) => {
    WorkoutCalculator['loadExercises'] = async () => new Map()

    const result = await WorkoutCalculator.calculateZoneLoads(
      [{ exerciseId: 'unknown_id', type: 'strength' as const, sets: [] }],
      'bodybuilding'
    )

    assert.deepEqual(result.zonesLoad, {})
    assert.equal(result.totalVolume, 0)
    assert.equal(result.totalIntensity, 0)
  })

  test('кастомное упражнение: использует input.zones если нет в каталоге', async ({ assert }) => {
    // Симулируем ситуацию: упражнение не найдено в каталоге (как custom:Берпи),
    // но zones хранятся прямо в объекте упражнения (записаны AI при создании).
    // После редактирования с RPE эти zones должны сохраняться в zonesLoad.
    WorkoutCalculator['loadExercises'] = async () => new Map() // каталог пуст

    const result = await WorkoutCalculator.calculateZoneLoads(
      [
        {
          exerciseId: 'custom:Берпи',
          name: 'Берпи',
          type: 'wod' as const,
          zones: ['legs', 'core'],
          sets: [{ id: '1', reps: 10 }],
        },
      ],
      'crossfit'
    )

    assert.isTrue('legs' in result.zonesLoad, 'legs должна быть в zonesLoad')
    assert.isTrue('core' in result.zonesLoad, 'core должна быть в zonesLoad')
    assert.isAbove(result.totalIntensity, 0)
  })

  test('кастомное упражнение: без zones и без каталога — зоны не добавляются', async ({
    assert,
  }) => {
    WorkoutCalculator['loadExercises'] = async () => new Map()

    const result = await WorkoutCalculator.calculateZoneLoads(
      [
        {
          exerciseId: 'custom:НКП',
          name: 'НКП',
          type: 'wod' as const,
          sets: [{ id: '1', reps: 10 }],
        },
      ],
      'crossfit'
    )

    assert.deepEqual(result.zonesLoad, {})
  })

  test('бодибилдинг: zoneWeights перекашивает доли между зонами (румынка)', async ({ assert }) => {
    const exercise = createExercise('rdl', ['glutes', 'legs', 'back'], 1.0)
    WorkoutCalculator['loadExercises'] = async () => new Map([['rdl', exercise]])

    const result = await WorkoutCalculator.calculateZoneLoads(
      [
        {
          exerciseId: 'rdl',
          type: 'strength' as const,
          zones: ['glutes', 'legs', 'back'],
          zoneWeights: { glutes: 0.5, legs: 0.3, back: 0.2 },
          sets: [{ id: '1', reps: 10, weight: 100 }],
        },
      ],
      'bodybuilding'
    )

    const g = result.zonesLoadAbs.glutes!
    const l = result.zonesLoadAbs.legs!
    const b = result.zonesLoadAbs.back!
    assert.closeTo(g / l, 0.5 / 0.3, 0.001)
    assert.closeTo(g / b, 0.5 / 0.2, 0.001)
  })

  test('кастомное и каталожное упражнения вместе: zones считаются корректно', async ({
    assert,
  }) => {
    const catalogEx = createExercise('Romanian_Deadlift', ['back', 'glutes', 'legs'], 0.7)
    WorkoutCalculator['loadExercises'] = async () => new Map([['Romanian_Deadlift', catalogEx]])

    const result = await WorkoutCalculator.calculateZoneLoads(
      [
        {
          exerciseId: 'Romanian_Deadlift',
          type: 'wod' as const,
          sets: [{ id: '1', reps: 12 }],
        },
        {
          exerciseId: 'custom:Берпи',
          name: 'Берпи',
          type: 'wod' as const,
          zones: ['legs', 'core'],
          sets: [{ id: '2', reps: 10 }],
        },
      ],
      'crossfit'
    )

    assert.isTrue('core' in result.zonesLoad, 'core от кастомного Берпи должен быть в zonesLoad')
    assert.isTrue('back' in result.zonesLoad, 'back от каталожного RDL должен быть в zonesLoad')
    assert.isTrue('legs' in result.zonesLoad)
  })

  /* -------------------------------- RPE -------------------------------- */
  test('rpe масштабирует нагрузку вокруг "нейтрального" 3/5', async ({ assert }) => {
    const exercise = createExercise('ex1', ['грудь'], 1.0)
    WorkoutCalculator['loadExercises'] = async () => new Map([['ex1', exercise]])

    const input = [
      { exerciseId: 'ex1', type: 'strength' as const, sets: [{ id: '1', reps: 10, weight: 100 }] },
    ]

    // null/undefined = neutral (как 3/5)
    const noRpe = await WorkoutCalculator.calculateZoneLoads(input, 'bodybuilding')
    const rpe3 = await WorkoutCalculator.calculateZoneLoads(input, 'bodybuilding', 3)

    const rpe5 = await WorkoutCalculator.calculateZoneLoads(input, 'bodybuilding', 5)
    const rpe1 = await WorkoutCalculator.calculateZoneLoads(input, 'bodybuilding', 1)

    assert.closeTo(rpe3.totalIntensity, noRpe.totalIntensity, 0.001)
    assert.isAbove(rpe5.totalIntensity, noRpe.totalIntensity)
    assert.isBelow(rpe1.totalIntensity, noRpe.totalIntensity)
  })

  test('rpe=null не меняет результат', async ({ assert }) => {
    const exercise = createExercise('ex1', ['спина'], 0.7)
    WorkoutCalculator['loadExercises'] = async () => new Map([['ex1', exercise]])

    const input = [
      { exerciseId: 'ex1', type: 'strength' as const, sets: [{ id: '1', reps: 10, weight: 80 }] },
    ]

    const withNull = await WorkoutCalculator.calculateZoneLoads(input, 'bodybuilding', null)
    const withUndefined = await WorkoutCalculator.calculateZoneLoads(input, 'bodybuilding')

    assert.closeTo(withNull.totalIntensity, withUndefined.totalIntensity, 0.0001)
  })

  /* -------------------------------- GET LOAD LEVEL -------------------------------- */
  test('getLoadLevel: volume > 15000 → high', ({ assert }) => {
    assert.equal(WorkoutCalculator.getLoadLevel(15001, 0, true), 'high')
    assert.equal(WorkoutCalculator.getLoadLevel(20000, 0.5, true), 'high')
  })

  test('getLoadLevel: 10000 < volume <= 15000 → medium', ({ assert }) => {
    assert.equal(WorkoutCalculator.getLoadLevel(15000, 0, true), 'medium')
    assert.equal(WorkoutCalculator.getLoadLevel(10001, 0, true), 'medium')
  })

  test('getLoadLevel: 0 < volume <= 10000 → low', ({ assert }) => {
    assert.equal(WorkoutCalculator.getLoadLevel(9044, 0, true), 'low')
    assert.equal(WorkoutCalculator.getLoadLevel(1, 0, false), 'low')
  })

  test('getLoadLevel: volume=0, intensity>0 (кардио/кроссфит) → low', ({ assert }) => {
    assert.equal(WorkoutCalculator.getLoadLevel(0, 0.36, true), 'low')
    assert.equal(WorkoutCalculator.getLoadLevel(0, 0.01, false), 'low')
  })

  test('getLoadLevel: volume=0, intensity=0, но упражнения есть → low (не в каталоге)', ({
    assert,
  }) => {
    assert.equal(WorkoutCalculator.getLoadLevel(0, 0, true), 'low')
  })

  test('getLoadLevel: нет тренировки → none', ({ assert }) => {
    assert.equal(WorkoutCalculator.getLoadLevel(0, 0, false), 'none')
  })

  /* -------------------------------- CALCULATE RECOVERY STATE -------------------------------- */
  test('calculateRecoveryState: пустой список', async ({ assert }) => {
    const r = await WorkoutCalculator.calculateRecoveryState([], new Date('2026-04-05T12:00:00Z'))
    assert.deepEqual(r.zones, {})
    assert.equal(r.totalWorkouts, 0)
    assert.isNull(r.lastWorkoutDaysAgo)
    assert.deepEqual(r.missingRpe, {
      workoutsCount: 0,
      lastWorkoutId: null,
      lastWorkoutDate: null,
    })
  })

  test('calculateRecoveryState: зоны с нулевой нагрузкой не попадают в ответ', async ({
    assert,
  }) => {
    const now = new Date('2026-04-05T12:00:00.000Z')
    const day = new Date('2026-04-05T12:00:00.000Z')
    const w = createWorkout('1', 'bodybuilding', { legs: 1, core: 0 }, 100, 0.5, day)
    const r = await WorkoutCalculator.calculateRecoveryState([w], now)
    assert.isUndefined((r.zones as any).core)
    assert.isDefined(r.zones.legs)
  })

  test('calculateRecoveryState: несколько тренировок одной зоны не суммируют усталость', async ({
    assert,
  }) => {
    const now = new Date('2026-04-05T12:00:00.000Z')
    const day = new Date('2026-04-03T12:00:00.000Z')
    const w1 = createWorkout('1', 'bodybuilding', { legs: 1 }, 100, 0.5, day)
    const w2 = createWorkout('2', 'crossfit', { legs: 1 }, 100, 0.5, day)
    const r = await WorkoutCalculator.calculateRecoveryState([w1, w2], now)
    const decayed = Math.exp(-0.3 * 2)
    assert.closeTo(r.zones.legs.intensity, expectedRecoveryIntensity(decayed), 0.02)
    assert.equal(r.zones.legs.peakLoad, 1)
  })

  test('calculateRecoveryState: берётся max(decayed) между сеансами', async ({ assert }) => {
    const now = new Date('2026-04-05T12:00:00.000Z')
    const recent = new Date('2026-04-04T12:00:00.000Z')
    const old = new Date('2026-03-25T12:00:00.000Z')
    const wRecent = createWorkout('1', 'bodybuilding', { legs: 0.4 }, 100, 0.5, recent)
    const wOld = createWorkout('2', 'bodybuilding', { legs: 1 }, 100, 0.5, old)
    const r = await WorkoutCalculator.calculateRecoveryState([wRecent, wOld], now)
    const fromRecent = 0.4 * Math.exp(-0.3 * 1)
    const fromOld = 1 * Math.exp(-0.3 * 11)
    const decayed = Math.max(fromRecent, fromOld)
    assert.closeTo(r.zones.legs.intensity, expectedRecoveryIntensity(decayed), 0.02)
  })

  test('calculateRecoveryState: большой abs decayed не даёт жёсткого клипа 1.0', async ({
    assert,
  }) => {
    const now = new Date('2026-04-05T12:00:00.000Z')
    const day = new Date('2026-04-05T12:00:00.000Z')
    const w = createWorkout('1', 'bodybuilding', { legs: 2 }, 100, 0.5, day)
    const r = await WorkoutCalculator.calculateRecoveryState([w], now)
    assert.closeTo(r.zones.legs.intensity, expectedRecoveryIntensity(2), 0.02)
    assert.isBelow(r.zones.legs.intensity, 0.99)
  })

  test('calculateRecoveryState: missingRpe только для прошедших сессий с контентом без оценки', async ({
    assert,
  }) => {
    const now = new Date('2026-04-05T12:00:00.000Z')
    const past = new Date('2026-04-04T12:00:00.000Z')
    const future = new Date('2026-04-10T12:00:00.000Z')
    const wPast = createWorkout(
      '1',
      'bodybuilding',
      { legs: 1 },
      100,
      0.5,
      past,
      [{ exerciseId: 'ex1' }],
      null
    )
    const wFuture = createWorkout(
      '2',
      'bodybuilding',
      { legs: 1 },
      100,
      0.5,
      future,
      [{ exerciseId: 'ex1' }],
      null
    )
    const r = await WorkoutCalculator.calculateRecoveryState([wPast, wFuture], now)
    assert.equal(r.missingRpe.workoutsCount, 1)
    assert.equal(r.missingRpe.lastWorkoutId, 1)
  })

  test('calculateRecoveryState: missingRpe пусто при заполненном RPE', async ({ assert }) => {
    const now = new Date('2026-04-05T12:00:00.000Z')
    const past = new Date('2026-04-04T12:00:00.000Z')
    const w = createWorkout(
      '1',
      'bodybuilding',
      { legs: 1 },
      100,
      0.5,
      past,
      [{ exerciseId: 'ex1' }],
      4
    )
    const r = await WorkoutCalculator.calculateRecoveryState([w], now)
    assert.equal(r.missingRpe.workoutsCount, 0)
  })

  /* -------------------------------- CALCULATE PERIOD STATS -------------------------------- */
  test('calculatePeriodStats: корректно считает по пустому массиву', async ({ assert }) => {
    const result = await WorkoutCalculator.calculatePeriodStats([], 'week')

    assert.equal(result.workoutsCount, 0)
    assert.equal(result.totalVolume, 0)
    assert.equal(result.avgIntensity, 0)
    assert.deepEqual(result.byType, {})
    assert.deepEqual(result.zones, {})
    assert.deepEqual(result.timeline, [])
    assert.equal(result.period, 'week')
  })

  test('calculatePeriodStats: суммирует тренировки и нормализует зоны', async ({ assert }) => {
    const w1 = createWorkout(
      'w1',
      'bodybuilding',
      { ноги: 3, руки: 1 },
      1000,
      '0.8',
      new Date('2026-01-01')
    )
    const w2 = createWorkout(
      'w2',
      'crossfit',
      { ноги: 1, грудь: 2 },
      500,
      0.6,
      new Date('2026-01-02')
    )
    const result = await WorkoutCalculator.calculatePeriodStats([w1, w2], 'week')

    // zones: ноги = 3+1=4, руки=1, грудь=2 → max=4 → нормализуем
    assert.closeTo(result.zones.ноги, 1, 0.001)
    assert.closeTo(result.zones.руки, 1 / 4, 0.001)
    assert.closeTo(result.zones.грудь, 2 / 4, 0.001)

    // avgIntensity = (0.8+0.6)/2=0.7
    assert.closeTo(result.avgIntensity, 0.7, 0.001)

    // byType
    assert.deepEqual(result.byType, { bodybuilding: 1, crossfit: 1 })

    // timeline
    assert.equal(result.timeline.length, 2)
    assert.equal(result.timeline[0].intensity, 0.8)
    assert.equal(result.timeline[1].intensity, 0.6)
    // loadLevel должен присутствовать в каждой записи
    assert.equal(result.timeline[0].loadLevel, 'low') // volume=1000 → low
    assert.equal(result.timeline[1].loadLevel, 'low') // volume=500 → low
    // timeline.zones is a *relative* profile derived from absolute zones
    assert.deepEqual(result.timeline[0].zones, { ноги: 1, руки: 1 / 3 })
    assert.deepEqual(result.timeline[1].zones, { ноги: 0.5, грудь: 1 })
  })

  test('calculatePeriodStats: пустой zonesLoad пересчитывается из упражнений (каталог)', async ({
    assert,
  }) => {
    const exercise = createExercise('squat', ['ноги'], 0.8)
    WorkoutCalculator['loadExercises'] = async () => new Map([['squat', exercise]])

    const w = createWorkout('w1', 'bodybuilding', {}, 5000, 0.7, new Date('2026-01-01'), [
      {
        exerciseId: 'squat',
        type: 'strength',
        sets: [{ id: '1', reps: 5, weight: 100 }],
      },
    ])
    w.userId = 1

    const result = await WorkoutCalculator.calculatePeriodStats([w], 'week')

    assert.isTrue('ноги' in result.zones)
    assert.isTrue('ноги' in result.timeline[0].zones)
  })

  test('calculatePeriodStats: timeline содержит loadLevel=none при intensity=0 и нет упражнений', async ({
    assert,
  }) => {
    const w = createWorkout('w1', 'bodybuilding', {}, 0, 0, new Date(), [])
    const result = await WorkoutCalculator.calculatePeriodStats([w], 'week')
    assert.equal(result.timeline[0].loadLevel, 'none')
  })

  test('calculatePeriodStats: timeline содержит loadLevel=low когда упражнения есть но intensity=0', async ({
    assert,
  }) => {
    const w = createWorkout('w1', 'bodybuilding', {}, 0, 0, new Date(), [{ exerciseId: 'unknown' }])
    const result = await WorkoutCalculator.calculatePeriodStats([w], 'week')
    assert.equal(result.timeline[0].loadLevel, 'low')
  })

  test('calculatePeriodStats: timeline содержит loadLevel=high при большом volume', async ({
    assert,
  }) => {
    const w = createWorkout('w1', 'bodybuilding', { ноги: 1 }, 20000, 0.9)
    const result = await WorkoutCalculator.calculatePeriodStats([w], 'week')
    assert.equal(result.timeline[0].loadLevel, 'high')
  })

  /* -------------------------------- BODYWEIGHT -------------------------------- */

  test('bodyweight: без userId объём = 0 (нет веса тела из профиля)', async ({ assert }) => {
    const exercise = createExercise('ex1', ['спина'], 0.7)
    WorkoutCalculator['loadExercises'] = async () => new Map([['ex1', exercise]])

    const result = await WorkoutCalculator.calculateZoneLoads(
      [
        {
          exerciseId: 'ex1',
          type: 'strength' as const,
          bodyweight: true,
          sets: [
            { id: '1', reps: 10, weight: 0 },
            { id: '2', reps: 10, weight: 0 },
          ],
        },
      ],
      'bodybuilding'
      // userId не передан — нет запроса к БД
    )

    assert.equal(result.totalVolume, 0)
    // Нагрузка по зонам всё равно должна быть нулевой (weight=0)
    assert.equal(result.totalIntensity, 0)
  })

  test('bodyweight: если указан явный вес в подходе — он используется несмотря на флаг', async ({
    assert,
  }) => {
    const exercise = createExercise('ex1', ['спина'], 1.0)
    WorkoutCalculator['loadExercises'] = async () => new Map([['ex1', exercise]])

    // Атлет добавил отягощение +20кг к подтягиваниям — weight явно задан
    const result = await WorkoutCalculator.calculateZoneLoads(
      [
        {
          exerciseId: 'ex1',
          type: 'strength' as const,
          bodyweight: true,
          sets: [{ id: '1', reps: 10, weight: 20 }],
        },
      ],
      'bodybuilding'
    )

    // volume = 10 * 20 = 200
    assert.equal(result.totalVolume, 200)
    assert.isAbove(result.totalIntensity, 0)
  })

  test('calculatePeriodStats: bodyweight-упражнение не триггерит hasMissingWeights', async ({
    assert,
  }) => {
    const w = createWorkout('w1', 'bodybuilding', { спина: 1 }, 0, 0.5, new Date(), [
      {
        exerciseId: 'pullup',
        type: 'strength',
        bodyweight: true,
        sets: [{ id: '1', reps: 10, weight: 0 }],
      },
    ])
    const result = await WorkoutCalculator.calculatePeriodStats([w], 'week')
    assert.isFalse((result.timeline[0] as any).hasMissingWeights)
  })

  test('calculatePeriodStats: обычное упражнение без веса триггерит hasMissingWeights', async ({
    assert,
  }) => {
    const w = createWorkout('w1', 'bodybuilding', { ноги: 1 }, 0, 0.5, new Date(), [
      {
        exerciseId: 'squat',
        type: 'strength',
        // bodyweight не задан
        sets: [{ id: '1', reps: 10, weight: 0 }],
      },
    ])
    const result = await WorkoutCalculator.calculatePeriodStats([w], 'week')
    assert.isTrue((result.timeline[0] as any).hasMissingWeights)
  })

  test('calculatePeriodStats: прошлая тренировка с контентом без rpe → hasMissingRpe', async ({
    assert,
  }) => {
    const at = new Date('2026-06-15T12:00:00Z')
    const w = createWorkout(
      'w1',
      'bodybuilding',
      { ноги: 1 },
      1000,
      0.5,
      new Date('2026-06-10T10:00:00Z'),
      [
        {
          exerciseId: 'squat',
          type: 'strength' as const,
          sets: [{ id: '1', reps: 5, weight: 60 }],
        },
      ],
      null
    )
    const result = await WorkoutCalculator.calculatePeriodStats([w], 'week', at)
    assert.isTrue(result.timeline[0].hasMissingRpe)
  })

  test('calculatePeriodStats: будущая тренировка без rpe → hasMissingRpe false', async ({
    assert,
  }) => {
    const at = new Date('2026-06-15T12:00:00Z')
    const w = createWorkout(
      'w1',
      'bodybuilding',
      { ноги: 1 },
      1000,
      0.5,
      new Date('2026-06-20T10:00:00Z'),
      [
        {
          exerciseId: 'squat',
          type: 'strength' as const,
          sets: [{ id: '1', reps: 5, weight: 60 }],
        },
      ],
      null
    )
    const result = await WorkoutCalculator.calculatePeriodStats([w], 'week', at)
    assert.isFalse(result.timeline[0].hasMissingRpe)
  })
})
