import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { computeStreakUpdate } from '#services/streakLogic'

const day = (iso: string) => DateTime.fromISO(iso)

// ── первая тренировка ──────────────────────────────────────────────────────

test.group('computeStreakUpdate: первая тренировка (lastDate = null)', () => {
  test('статус started, streak = 1', ({ assert }) => {
    const r = computeStreakUpdate(null, day('2024-01-10'), 0, 0)
    assert.equal(r.status, 'started')
    assert.equal(r.newCurrentStreak, 1)
    assert.equal(r.newLongestStreak, 1)
  })

  test('newRecord если longestStreak был 0', ({ assert }) => {
    const r = computeStreakUpdate(null, day('2024-01-10'), 0, 0)
    assert.isTrue(r.newRecord)
  })

  test('не newRecord если longestStreak уже >= 1', ({ assert }) => {
    const r = computeStreakUpdate(null, day('2024-01-10'), 0, 5)
    assert.isFalse(r.newRecord)
    assert.equal(r.newLongestStreak, 5)
  })
})

// ── тот же день ────────────────────────────────────────────────────────────

test.group('computeStreakUpdate: тот же день', () => {
  test('статус same_day, счётчики не меняются', ({ assert }) => {
    const r = computeStreakUpdate(day('2024-01-10'), day('2024-01-10'), 3, 7)
    assert.equal(r.status, 'same_day')
    assert.equal(r.newCurrentStreak, 3)
    assert.equal(r.newLongestStreak, 7)
    assert.isFalse(r.newRecord)
  })

  test('тот же день — разное время суток', ({ assert }) => {
    const r = computeStreakUpdate(
      DateTime.fromISO('2024-01-10T08:00:00'),
      DateTime.fromISO('2024-01-10T21:30:00'),
      5, 5
    )
    assert.equal(r.status, 'same_day')
  })
})

// ── продолжение (1 день) ───────────────────────────────────────────────────

test.group('computeStreakUpdate: продолжение streak', () => {
  test('статус continued, streak +1', ({ assert }) => {
    const r = computeStreakUpdate(day('2024-01-09'), day('2024-01-10'), 5, 7)
    assert.equal(r.status, 'continued')
    assert.equal(r.newCurrentStreak, 6)
    assert.equal(r.newLongestStreak, 7)
    assert.isFalse(r.newRecord)
  })

  test('обновляет рекорд когда currentStreak обгоняет longestStreak', ({ assert }) => {
    const r = computeStreakUpdate(day('2024-01-09'), day('2024-01-10'), 7, 7)
    assert.equal(r.newCurrentStreak, 8)
    assert.equal(r.newLongestStreak, 8)
    assert.isTrue(r.newRecord)
  })

  test('работает через границу месяца', ({ assert }) => {
    const r = computeStreakUpdate(day('2024-01-31'), day('2024-02-01'), 10, 10)
    assert.equal(r.status, 'continued')
    assert.equal(r.newCurrentStreak, 11)
  })

  test('работает через границу года', ({ assert }) => {
    const r = computeStreakUpdate(day('2023-12-31'), day('2024-01-01'), 30, 30)
    assert.equal(r.status, 'continued')
    assert.equal(r.newCurrentStreak, 31)
  })
})

// ── сброс (2+ дня) ─────────────────────────────────────────────────────────

test.group('computeStreakUpdate: сброс streak', () => {
  test('статус broken, streak сбрасывается в 1', ({ assert }) => {
    const r = computeStreakUpdate(day('2024-01-07'), day('2024-01-10'), 5, 7)
    assert.equal(r.status, 'broken')
    assert.equal(r.newCurrentStreak, 1)
    assert.equal(r.newLongestStreak, 7)
    assert.isFalse(r.newRecord)
  })

  test('пропуск ровно 2 дня → broken', ({ assert }) => {
    const r = computeStreakUpdate(day('2024-01-08'), day('2024-01-10'), 3, 5)
    assert.equal(r.status, 'broken')
  })

  test('пропуск 30 дней → broken', ({ assert }) => {
    const r = computeStreakUpdate(day('2023-12-01'), day('2024-01-10'), 20, 20)
    assert.equal(r.status, 'broken')
    assert.equal(r.newCurrentStreak, 1)
  })
})
