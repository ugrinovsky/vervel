import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Workout from '#models/workout'
import UserExerciseStandardAlias from '#models/user_exercise_standard_alias'
import UserExerciseStandardLinkBatchSnapshot from '#models/user_exercise_standard_link_batch_snapshot'
import { ProgressionService } from '#services/ProgressionService'

let userCounter = 0

async function createTestUser(): Promise<User> {
  userCounter++
  return User.create({
    email: `test-std-alias-${userCounter}-${Date.now()}@example.com`,
    password: null,
    fullName: `Test ${userCounter}`,
    role: 'athlete',
    balance: 100,
    aiNotesFree: false,
    xp: 0,
  })
}

async function cleanupUser(userId: number) {
  try {
    await db.from('user_exercise_standard_link_batch_snapshots').where('user_id', userId).delete()
  } catch (e: unknown) {
    const code =
      e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : ''
    if (code !== '42P01') throw e
  }
  await db.from('user_exercise_standard_aliases').where('user_id', userId).delete()
  await db.from('user_exercise_standards').where('user_id', userId).delete()
  await db.from('workouts').where('user_id', userId).delete()
  await db.from('users').where('id', userId).delete()
}

test.group('ProgressionService: applyStandardAliasBatch / revertStandardAliasBatch', (group) => {
  let user: User

  group.each.setup(async () => {
    user = await createTestUser()
  })

  group.each.teardown(async () => {
    await cleanupUser(user.id)
  })

  test('создаёт алиас, снимок; откат удаляет алиас и снимок', async ({ assert }) => {
    const std = await ProgressionService.createExerciseStandard(user.id, 'Жим тест', null)
    const { revertId, applied } = await ProgressionService.applyStandardAliasBatch(user.id, [
      { sourceExerciseId: 'custom:bench_merge_test', standardId: std.id },
    ])
    assert.equal(applied, 1)
    assert.isAbove(revertId, 0)

    const alias = await UserExerciseStandardAlias.query()
      .where('userId', user.id)
      .where('sourceExerciseId', 'custom:bench_merge_test')
      .first()
    assert.isNotNull(alias)
    assert.equal(alias!.standardId, std.id)

    await ProgressionService.revertStandardAliasBatch(user.id, revertId)

    const aliasAfter = await UserExerciseStandardAlias.query()
      .where('userId', user.id)
      .where('sourceExerciseId', 'custom:bench_merge_test')
      .first()
    assert.isNull(aliasAfter)

    const snap = await UserExerciseStandardLinkBatchSnapshot.find(revertId)
    assert.isNull(snap)
  })

  test('тот же эталон что уже стоит — applied 0, снимок не нужен', async ({ assert }) => {
    const std = await ProgressionService.createExerciseStandard(user.id, 'Присед тест', null)
    await ProgressionService.setExerciseStandardAlias(user.id, 'custom:squat_same', std.id)
    const r = await ProgressionService.applyStandardAliasBatch(user.id, [
      { sourceExerciseId: 'custom:squat_same', standardId: std.id },
    ])
    assert.equal(r.applied, 0)
    assert.equal(r.revertId, 0)
  })

  test('смена эталона у алиаса — откат возвращает прежний standardId', async ({ assert }) => {
    const stdA = await ProgressionService.createExerciseStandard(user.id, 'Эталон А', null)
    const stdB = await ProgressionService.createExerciseStandard(user.id, 'Эталон Б', null)
    await ProgressionService.setExerciseStandardAlias(user.id, 'custom:swap_me', stdA.id)

    const { revertId } = await ProgressionService.applyStandardAliasBatch(user.id, [
      { sourceExerciseId: 'custom:swap_me', standardId: stdB.id },
    ])
    assert.isAbove(revertId, 0)

    const mid = await UserExerciseStandardAlias.query()
      .where('userId', user.id)
      .where('sourceExerciseId', 'custom:swap_me')
      .firstOrFail()
    assert.equal(mid.standardId, stdB.id)

    await ProgressionService.revertStandardAliasBatch(user.id, revertId)

    const restored = await UserExerciseStandardAlias.query()
      .where('userId', user.id)
      .where('sourceExerciseId', 'custom:swap_me')
      .firstOrFail()
    assert.equal(restored.standardId, stdA.id)
  })

  test('пустой список связей — ошибка', async ({ assert }) => {
    await assert.rejects(
      () => ProgressionService.applyStandardAliasBatch(user.id, []),
      /Пустой список связей/
    )
  })

  test('повторный откат по тому же id — ошибка', async ({ assert }) => {
    const std = await ProgressionService.createExerciseStandard(user.id, 'Раз', null)
    const { revertId } = await ProgressionService.applyStandardAliasBatch(user.id, [
      { sourceExerciseId: 'custom:once', standardId: std.id },
    ])
    await ProgressionService.revertStandardAliasBatch(user.id, revertId)
    await assert.rejects(
      () => ProgressionService.revertStandardAliasBatch(user.id, revertId),
      /Снимок не найден/
    )
  })
})

test.group('ProgressionService: getStrengthLog и лимит ИИ', () => {
  test('payload содержит aiStandardLinkSuggestMaxCandidates', async ({ assert }) => {
    const user = await createTestUser()
    try {
      const log = await ProgressionService.getStrengthLog(user.id)
      assert.isNumber(log.aiStandardLinkSuggestMaxCandidates)
      assert.isAtLeast(log.aiStandardLinkSuggestMaxCandidates, 1)
      assert.isAtMost(log.aiStandardLinkSuggestMaxCandidates, 200)
    } finally {
      await cleanupUser(user.id)
    }
  })

  test('custom:… с тем же названием, что title каталога эталона, сливается с Romanian_Deadlift без алиаса', async ({
    assert,
  }) => {
    const user = await createTestUser()
    try {
      await ProgressionService.createExerciseStandard(
        user.id,
        'Румынская тяга',
        'Romanian_Deadlift'
      )
      await Workout.create({
        userId: user.id,
        date: DateTime.fromISO('2026-02-01T10:00:00.000Z'),
        workoutType: 'bodybuilding',
        exercises: [
          {
            exerciseId: 'Romanian_Deadlift',
            type: 'strength',
            name: 'Румынская тяга',
            sets: [{ id: 's1', reps: 5, weight: 80 }],
          },
        ],
        zonesLoad: {},
        totalIntensity: 0,
        totalVolume: 0,
        notes: undefined,
        rpe: null,
        scheduledWorkoutId: null,
      })
      await Workout.create({
        userId: user.id,
        date: DateTime.fromISO('2026-02-02T10:00:00.000Z'),
        workoutType: 'bodybuilding',
        exercises: [
          {
            exerciseId: 'custom:румынская тяга',
            type: 'strength',
            name: 'Румынская тяга',
            sets: [{ id: 's2', reps: 5, weight: 85 }],
          },
        ],
        zonesLoad: {},
        totalIntensity: 0,
        totalVolume: 0,
        notes: undefined,
        rpe: null,
        scheduledWorkoutId: null,
      })

      const log = await ProgressionService.getStrengthLog(user.id)
      const bb = log.entries.filter((e) => e.workoutType === 'bodybuilding')
      const romanian = bb.filter((e) => e.exerciseName.toLowerCase().includes('румын'))
      assert.equal(romanian.length, 1)
      assert.equal(romanian[0]!.sessions.length, 2)
      const stdRow = log.standards.find((s) => s.catalogExerciseId === 'Romanian_Deadlift')
      assert.isDefined(stdRow)
      assert.equal(stdRow!.catalogTitleNormalized, 'румынская тяга')
    } finally {
      await cleanupUser(user.id)
    }
  })
})

test.group('ProgressionService: mergeDuplicateExerciseStandards', (group) => {
  let user: User

  group.each.setup(async () => {
    user = await createTestUser()
  })

  group.each.teardown(async () => {
    await cleanupUser(user.id)
  })

  test('два эталона с одинаковым названием — один остаётся, алиас с большего id переносится', async ({
    assert,
  }) => {
    const a = await ProgressionService.createExerciseStandard(user.id, 'Жим штанги лёжа', null)
    const b = await ProgressionService.createExerciseStandard(user.id, 'Жим штанги лёжа', null)
    assert.notEqual(a.id, b.id)
    const kept = Math.min(a.id, b.id)
    const removed = Math.max(a.id, b.id)
    await ProgressionService.setExerciseStandardAlias(user.id, 'custom:merge_test_dup', removed)
    const r = await ProgressionService.mergeDuplicateExerciseStandards(user.id)
    assert.equal(r.mergedGroups, 1)
    assert.equal(r.details[0].keptStandardId, kept)
    assert.deepEqual(r.details[0].removedStandardIds, [removed])
    assert.equal(r.details[0].aliasesRepointed, 1)
    const list = await ProgressionService.listExerciseStandards(user.id)
    assert.lengthOf(list, 1)
    const alias = await UserExerciseStandardAlias.query()
      .where('userId', user.id)
      .where('sourceExerciseId', 'custom:merge_test_dup')
      .first()
    assert.isDefined(alias)
    assert.equal(alias!.standardId, kept)
  })

  test('разные catalogExerciseId при одном названии — ошибка, строки не трогаем', async ({
    assert,
  }) => {
    await ProgressionService.createExerciseStandard(user.id, 'Дубль каталога', 'Romanian_Deadlift')
    await ProgressionService.createExerciseStandard(user.id, 'Дубль каталога', 'Barbell_Lunge')
    await assert.rejects(
      () => ProgressionService.mergeDuplicateExerciseStandards(user.id),
      /разные привязки к каталогу/
    )
    const list = await ProgressionService.listExerciseStandards(user.id)
    assert.lengthOf(list, 2)
  })

  test('при пустом каталоге у канона переносится catalog с дубликата', async ({ assert }) => {
    const a = await ProgressionService.createExerciseStandard(user.id, 'Один эталон', null)
    const b = await ProgressionService.createExerciseStandard(
      user.id,
      'Один эталон',
      'Romanian_Deadlift'
    )
    assert.isBelow(a.id, b.id)
    await ProgressionService.mergeDuplicateExerciseStandards(user.id)
    const list = await ProgressionService.listExerciseStandards(user.id)
    assert.lengthOf(list, 1)
    assert.equal(list[0].id, a.id)
    assert.equal(list[0].catalogExerciseId, 'Romanian_Deadlift')
  })

  test('слияние по нормализации ё/е в названии', async ({ assert }) => {
    await ProgressionService.createExerciseStandard(user.id, 'Упражнение лёжа', null)
    await ProgressionService.createExerciseStandard(user.id, 'Упражнение лежа', null)
    const r = await ProgressionService.mergeDuplicateExerciseStandards(user.id)
    assert.equal(r.mergedGroups, 1)
    assert.lengthOf(await ProgressionService.listExerciseStandards(user.id), 1)
  })
})
