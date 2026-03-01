import { test } from '@japa/runner'
import AchievementService from '#services/AchievementService'

// Хелперы для создания моков (без обращения к БД)
const mockAchievement = (type: string, value: number) =>
  ({ requirementType: type, requirementValue: value }) as any

const mockStreak = (currentStreak: number) => ({ currentStreak }) as any

const emptyCtx = {
  userStreak: null,
  workoutCount: 0,
  aiChatCount: 0,
  groupsJoined: 0,
  trainerMessages: 0,
}

// Приватный метод доступен через индексацию
const check = (achievement: any, ctx: typeof emptyCtx) =>
  AchievementService['checkAchievementCondition'](achievement, ctx)

// ─── streak_days ───────────────────────────────────────────────────────────

test.group('AchievementService: streak_days', () => {
  test('разблокируется когда currentStreak >= requirementValue', ({ assert }) => {
    const ctx = { ...emptyCtx, userStreak: mockStreak(7) }
    assert.isTrue(check(mockAchievement('streak_days', 7), ctx))
    assert.isTrue(check(mockAchievement('streak_days', 5), ctx))
  })

  test('не разблокируется когда streak < requirementValue', ({ assert }) => {
    const ctx = { ...emptyCtx, userStreak: mockStreak(7) }
    assert.isFalse(check(mockAchievement('streak_days', 8), ctx))
  })

  test('не разблокируется при отсутствии streak (userStreak = null)', ({ assert }) => {
    assert.isFalse(check(mockAchievement('streak_days', 1), emptyCtx))
  })

  test('точно на пороге — разблокируется', ({ assert }) => {
    const ctx = { ...emptyCtx, userStreak: mockStreak(30) }
    assert.isTrue(check(mockAchievement('streak_days', 30), ctx))
  })
})

// ─── total_workouts ────────────────────────────────────────────────────────

test.group('AchievementService: total_workouts', () => {
  test('разблокируется при workoutCount >= requirementValue', ({ assert }) => {
    const ctx = { ...emptyCtx, workoutCount: 10 }
    assert.isTrue(check(mockAchievement('total_workouts', 10), ctx))
    assert.isTrue(check(mockAchievement('total_workouts', 1), ctx))
  })

  test('не разблокируется при workoutCount < requirementValue', ({ assert }) => {
    const ctx = { ...emptyCtx, workoutCount: 9 }
    assert.isFalse(check(mockAchievement('total_workouts', 10), ctx))
  })

  test('при requirementValue = 0 разблокируется всегда', ({ assert }) => {
    assert.isTrue(check(mockAchievement('total_workouts', 0), emptyCtx))
  })
})

// ─── ai_chat_messages ──────────────────────────────────────────────────────

test.group('AchievementService: ai_chat_messages', () => {
  test('разблокируется при aiChatCount >= requirementValue', ({ assert }) => {
    const ctx = { ...emptyCtx, aiChatCount: 5 }
    assert.isTrue(check(mockAchievement('ai_chat_messages', 5), ctx))
    assert.isTrue(check(mockAchievement('ai_chat_messages', 3), ctx))
  })

  test('не разблокируется при aiChatCount < requirementValue', ({ assert }) => {
    const ctx = { ...emptyCtx, aiChatCount: 4 }
    assert.isFalse(check(mockAchievement('ai_chat_messages', 5), ctx))
  })
})

// ─── groups_joined ─────────────────────────────────────────────────────────

test.group('AchievementService: groups_joined', () => {
  test('разблокируется при groupsJoined >= requirementValue', ({ assert }) => {
    const ctx = { ...emptyCtx, groupsJoined: 3 }
    assert.isTrue(check(mockAchievement('groups_joined', 1), ctx))
    assert.isTrue(check(mockAchievement('groups_joined', 3), ctx))
  })

  test('не разблокируется при groupsJoined = 0', ({ assert }) => {
    assert.isFalse(check(mockAchievement('groups_joined', 1), emptyCtx))
  })
})

// ─── trainer_messages ──────────────────────────────────────────────────────

test.group('AchievementService: trainer_messages', () => {
  test('разблокируется при trainerMessages >= requirementValue', ({ assert }) => {
    const ctx = { ...emptyCtx, trainerMessages: 50 }
    assert.isTrue(check(mockAchievement('trainer_messages', 50), ctx))
    assert.isTrue(check(mockAchievement('trainer_messages', 10), ctx))
  })

  test('не разблокируется при trainerMessages < requirementValue', ({ assert }) => {
    const ctx = { ...emptyCtx, trainerMessages: 49 }
    assert.isFalse(check(mockAchievement('trainer_messages', 50), ctx))
  })
})

// ─── edge cases ────────────────────────────────────────────────────────────

test.group('AchievementService: edge cases', () => {
  test('неизвестный тип требования возвращает false', ({ assert }) => {
    assert.isFalse(check(mockAchievement('unknown_type', 1), emptyCtx))
    assert.isFalse(check(mockAchievement('', 0), emptyCtx))
  })

  test('требования независимы — streak не влияет на workouts', ({ assert }) => {
    const ctx = { ...emptyCtx, userStreak: mockStreak(100), workoutCount: 0 }
    assert.isFalse(check(mockAchievement('total_workouts', 1), ctx))
    assert.isTrue(check(mockAchievement('streak_days', 1), ctx))
  })
})
