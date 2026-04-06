import { test } from '@japa/runner';
import db from '@adonisjs/lucid/services/db';
import User from '#models/user';
import UserExerciseStandardAlias from '#models/user_exercise_standard_alias';
import UserExerciseStandardLinkBatchSnapshot from '#models/user_exercise_standard_link_batch_snapshot';
import { ProgressionService } from '#services/ProgressionService';

let userCounter = 0;

async function createTestUser(): Promise<User> {
  userCounter++;
  return User.create({
    email: `test-std-alias-${userCounter}-${Date.now()}@example.com`,
    password: null,
    fullName: `Test ${userCounter}`,
    role: 'athlete',
    balance: 100,
    aiNotesFree: false,
    xp: 0,
  });
}

async function cleanupUser(userId: number) {
  try {
    await db.from('user_exercise_standard_link_batch_snapshots').where('user_id', userId).delete();
  } catch (e: unknown) {
    const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: string }).code) : '';
    if (code !== '42P01') throw e;
  }
  await db.from('user_exercise_standard_aliases').where('user_id', userId).delete();
  await db.from('user_exercise_standards').where('user_id', userId).delete();
  await db.from('users').where('id', userId).delete();
}

test.group('ProgressionService: applyStandardAliasBatch / revertStandardAliasBatch', (group) => {
  let user: User;

  group.each.setup(async () => {
    user = await createTestUser();
  });

  group.each.teardown(async () => {
    await cleanupUser(user.id);
  });

  test('создаёт алиас, снимок; откат удаляет алиас и снимок', async ({ assert }) => {
    const std = await ProgressionService.createExerciseStandard(user.id, 'Жим тест', null);
    const { revertId, applied } = await ProgressionService.applyStandardAliasBatch(user.id, [
      { sourceExerciseId: 'custom:bench_merge_test', standardId: std.id },
    ]);
    assert.equal(applied, 1);
    assert.isAbove(revertId, 0);

    const alias = await UserExerciseStandardAlias.query()
      .where('userId', user.id)
      .where('sourceExerciseId', 'custom:bench_merge_test')
      .first();
    assert.isNotNull(alias);
    assert.equal(alias!.standardId, std.id);

    await ProgressionService.revertStandardAliasBatch(user.id, revertId);

    const aliasAfter = await UserExerciseStandardAlias.query()
      .where('userId', user.id)
      .where('sourceExerciseId', 'custom:bench_merge_test')
      .first();
    assert.isNull(aliasAfter);

    const snap = await UserExerciseStandardLinkBatchSnapshot.find(revertId);
    assert.isNull(snap);
  });

  test('тот же эталон что уже стоит — applied 0, снимок не нужен', async ({ assert }) => {
    const std = await ProgressionService.createExerciseStandard(user.id, 'Присед тест', null);
    await ProgressionService.setExerciseStandardAlias(user.id, 'custom:squat_same', std.id);
    const r = await ProgressionService.applyStandardAliasBatch(user.id, [
      { sourceExerciseId: 'custom:squat_same', standardId: std.id },
    ]);
    assert.equal(r.applied, 0);
    assert.equal(r.revertId, 0);
  });

  test('смена эталона у алиаса — откат возвращает прежний standardId', async ({ assert }) => {
    const stdA = await ProgressionService.createExerciseStandard(user.id, 'Эталон А', null);
    const stdB = await ProgressionService.createExerciseStandard(user.id, 'Эталон Б', null);
    await ProgressionService.setExerciseStandardAlias(user.id, 'custom:swap_me', stdA.id);

    const { revertId } = await ProgressionService.applyStandardAliasBatch(user.id, [
      { sourceExerciseId: 'custom:swap_me', standardId: stdB.id },
    ]);
    assert.isAbove(revertId, 0);

    const mid = await UserExerciseStandardAlias.query()
      .where('userId', user.id)
      .where('sourceExerciseId', 'custom:swap_me')
      .firstOrFail();
    assert.equal(mid.standardId, stdB.id);

    await ProgressionService.revertStandardAliasBatch(user.id, revertId);

    const restored = await UserExerciseStandardAlias.query()
      .where('userId', user.id)
      .where('sourceExerciseId', 'custom:swap_me')
      .firstOrFail();
    assert.equal(restored.standardId, stdA.id);
  });

  test('пустой список связей — ошибка', async ({ assert }) => {
    await assert.rejects(
      () => ProgressionService.applyStandardAliasBatch(user.id, []),
      /Пустой список связей/,
    );
  });

  test('повторный откат по тому же id — ошибка', async ({ assert }) => {
    const std = await ProgressionService.createExerciseStandard(user.id, 'Раз', null);
    const { revertId } = await ProgressionService.applyStandardAliasBatch(user.id, [
      { sourceExerciseId: 'custom:once', standardId: std.id },
    ]);
    await ProgressionService.revertStandardAliasBatch(user.id, revertId);
    await assert.rejects(
      () => ProgressionService.revertStandardAliasBatch(user.id, revertId),
      /Снимок не найден/,
    );
  });
});

test.group('ProgressionService: getStrengthLog и лимит ИИ', () => {
  test('payload содержит aiStandardLinkSuggestMaxCandidates', async ({ assert }) => {
    const user = await createTestUser();
    try {
      const log = await ProgressionService.getStrengthLog(user.id);
      assert.isNumber(log.aiStandardLinkSuggestMaxCandidates);
      assert.isAtLeast(log.aiStandardLinkSuggestMaxCandidates, 1);
      assert.isAtMost(log.aiStandardLinkSuggestMaxCandidates, 200);
    } finally {
      await cleanupUser(user.id);
    }
  });
});
