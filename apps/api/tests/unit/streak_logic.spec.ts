import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { computeWeeklyStreakUpdate, type WeeklyStreakParams } from '#services/streakLogic'

const mon = (iso: string) => DateTime.fromISO(iso).startOf('week')
const day = (iso: string) => DateTime.fromISO(iso)

function base(overrides: Partial<WeeklyStreakParams> = {}): WeeklyStreakParams {
  return {
    currentWeekStart: null,
    currentWeekWorkouts: 0,
    currentWeekCompleted: false,
    workoutDate: day('2024-01-15'), // понедельник
    currentStreak: 0,
    longestStreak: 0,
    mode: 'simple',
    ...overrides,
  }
}

// ── первая тренировка ──────────────────────────────────────────────────────

test.group('первая тренировка (currentWeekStart = null)', () => {
  test('статус started, streak = 0 (неделя ещё не завершена)', ({ assert }) => {
    const r = computeWeeklyStreakUpdate(base())
    assert.equal(r.status, 'started')
    assert.equal(r.newCurrentStreak, 0)
    assert.equal(r.newCurrentWeekWorkouts, 1)
    assert.isFalse(r.newCurrentWeekCompleted)
  })

  test('intensive: 1 тренировка → started (5 нужно)', ({ assert }) => {
    const r = computeWeeklyStreakUpdate(base({ mode: 'intensive' }))
    assert.equal(r.status, 'started')
    assert.equal(r.newCurrentStreak, 0)
  })
})

// ── та же неделя ───────────────────────────────────────────────────────────

test.group('та же неделя — накопление тренировок', () => {
  test('2-я тренировка → same_week', ({ assert }) => {
    const r = computeWeeklyStreakUpdate(base({
      currentWeekStart: mon('2024-01-15'),
      currentWeekWorkouts: 1,
      workoutDate: day('2024-01-17'),
    }))
    assert.equal(r.status, 'same_week')
    assert.equal(r.newCurrentWeekWorkouts, 2)
    assert.equal(r.newCurrentStreak, 0)
  })

  test('3-я тренировка (simple) → week_completed, streak = 1', ({ assert }) => {
    const r = computeWeeklyStreakUpdate(base({
      currentWeekStart: mon('2024-01-15'),
      currentWeekWorkouts: 2,
      workoutDate: day('2024-01-19'),
    }))
    assert.equal(r.status, 'week_completed')
    assert.equal(r.newCurrentStreak, 1)
    assert.equal(r.newLongestStreak, 1)
    assert.isTrue(r.newCurrentWeekCompleted)
    assert.isTrue(r.newRecord)
  })

  test('4-я тренировка после week_completed → same_week, streak не растёт', ({ assert }) => {
    const r = computeWeeklyStreakUpdate(base({
      currentWeekStart: mon('2024-01-15'),
      currentWeekWorkouts: 3,
      currentWeekCompleted: true,
      currentStreak: 1,
      workoutDate: day('2024-01-20'),
    }))
    assert.equal(r.status, 'same_week')
    assert.equal(r.newCurrentStreak, 1)
    assert.isFalse(r.newRecord)
  })
})

// ── новая неделя — продолжение ─────────────────────────────────────────────

test.group('новая неделя — продолжение streak', () => {
  test('предыдущая завершена → week_continued, streak не меняется', ({ assert }) => {
    const r = computeWeeklyStreakUpdate(base({
      currentWeekStart: mon('2024-01-15'),
      currentWeekWorkouts: 3,
      currentWeekCompleted: true,
      currentStreak: 1,
      longestStreak: 1,
      workoutDate: day('2024-01-22'),
    }))
    assert.equal(r.status, 'week_continued')
    assert.equal(r.newCurrentStreak, 1)
    assert.equal(r.newCurrentWeekWorkouts, 1)
    assert.isFalse(r.newCurrentWeekCompleted)
  })

  test('вторая неделя: завершена → streak = 2, новый рекорд', ({ assert }) => {
    const r = computeWeeklyStreakUpdate(base({
      currentWeekStart: mon('2024-01-22'),
      currentWeekWorkouts: 2,
      currentWeekCompleted: false,
      currentStreak: 1,
      longestStreak: 1,
      workoutDate: day('2024-01-26'),
    }))
    assert.equal(r.status, 'week_completed')
    assert.equal(r.newCurrentStreak, 2)
    assert.equal(r.newLongestStreak, 2)
    assert.isTrue(r.newRecord)
  })

  test('week_completed когда streak < longestStreak → newRecord = false', ({ assert }) => {
    const r = computeWeeklyStreakUpdate(base({
      currentWeekStart: mon('2024-01-22'),
      currentWeekWorkouts: 2,
      currentWeekCompleted: false,
      currentStreak: 1,
      longestStreak: 10, // рекорд выше
      workoutDate: day('2024-01-26'),
    }))
    assert.equal(r.status, 'week_completed')
    assert.equal(r.newCurrentStreak, 2)
    assert.equal(r.newLongestStreak, 10) // рекорд не меняется
    assert.isFalse(r.newRecord)
  })
})

// ── сброс streak ───────────────────────────────────────────────────────────

test.group('сброс streak', () => {
  test('предыдущая неделя НЕ завершена → week_broken, streak = 0', ({ assert }) => {
    const r = computeWeeklyStreakUpdate(base({
      currentWeekStart: mon('2024-01-15'),
      currentWeekWorkouts: 2,
      currentWeekCompleted: false,
      currentStreak: 5,
      longestStreak: 5,
      workoutDate: day('2024-01-22'),
    }))
    assert.equal(r.status, 'week_broken')
    assert.equal(r.newCurrentStreak, 0)
    assert.equal(r.newLongestStreak, 5)
    assert.equal(r.newCurrentWeekWorkouts, 1) // новая тренировка уже считается
  })

  test('пропуск нескольких недель → week_broken', ({ assert }) => {
    const r = computeWeeklyStreakUpdate(base({
      currentWeekStart: mon('2024-01-15'),
      currentWeekWorkouts: 3,
      currentWeekCompleted: true,
      currentStreak: 3,
      longestStreak: 3,
      workoutDate: day('2024-02-12'),
    }))
    assert.equal(r.status, 'week_broken')
    assert.equal(r.newCurrentStreak, 0)
    assert.equal(r.newCurrentWeekWorkouts, 1)
  })
})

// ── граница недели ─────────────────────────────────────────────────────────

test.group('граница недели (ISO: пн–вс)', () => {
  test('тренировка в вс, следующая в пн → week_continued', ({ assert }) => {
    const r = computeWeeklyStreakUpdate(base({
      currentWeekStart: mon('2024-01-15'), // пн 15 янв
      currentWeekWorkouts: 3,
      currentWeekCompleted: true,
      currentStreak: 1,
      longestStreak: 1,
      workoutDate: day('2024-01-22'), // пн 22 янв (следующая неделя)
    }))
    assert.equal(r.status, 'week_continued')
    assert.equal(r.newCurrentWeekWorkouts, 1)
    // newCurrentWeekStart должен быть понедельником новой недели
    assert.equal(r.newCurrentWeekStart.toISODate(), '2024-01-22')
  })

  test('воскресенье той же ISO-недели — same_week', ({ assert }) => {
    // ISO-неделя: пн 15 – вс 21; 1 тренировка уже есть → добавляем 2-ю в вс
    const r = computeWeeklyStreakUpdate(base({
      currentWeekStart: mon('2024-01-15'),
      currentWeekWorkouts: 1,
      workoutDate: day('2024-01-21'), // воскресенье той же недели
    }))
    assert.equal(r.status, 'same_week')
    assert.equal(r.newCurrentWeekWorkouts, 2)
  })
})

// ── защита от двойного счёта ───────────────────────────────────────────────

test.group('current_week_completed: защита от двойного счёта', () => {
  test('intensive: флаг выставлен → 6-я тренировка не увеличивает streak', ({ assert }) => {
    const r = computeWeeklyStreakUpdate(base({
      currentWeekStart: mon('2024-01-15'),
      currentWeekWorkouts: 5,
      currentWeekCompleted: true,
      currentStreak: 2,
      mode: 'intensive',
      workoutDate: day('2024-01-20'),
    }))
    assert.equal(r.status, 'same_week')
    assert.equal(r.newCurrentStreak, 2)
  })
})

// ── intensive mode ─────────────────────────────────────────────────────────

test.group('intensive mode (5 тренировок)', () => {
  test('4-я тренировка → same_week', ({ assert }) => {
    const r = computeWeeklyStreakUpdate(base({
      currentWeekStart: mon('2024-01-15'),
      currentWeekWorkouts: 3,
      mode: 'intensive',
      workoutDate: day('2024-01-18'),
    }))
    assert.equal(r.status, 'same_week')
    assert.equal(r.newCurrentStreak, 0)
  })

  test('5-я тренировка → week_completed', ({ assert }) => {
    const r = computeWeeklyStreakUpdate(base({
      currentWeekStart: mon('2024-01-15'),
      currentWeekWorkouts: 4,
      mode: 'intensive',
      workoutDate: day('2024-01-19'),
    }))
    assert.equal(r.status, 'week_completed')
    assert.equal(r.newCurrentStreak, 1)
    assert.isTrue(r.newCurrentWeekCompleted)
  })

  test('предыдущая неделя не завершена (4 из 5) → week_broken', ({ assert }) => {
    const r = computeWeeklyStreakUpdate(base({
      currentWeekStart: mon('2024-01-15'),
      currentWeekWorkouts: 4,
      currentWeekCompleted: false,
      currentStreak: 3,
      mode: 'intensive',
      workoutDate: day('2024-01-22'),
    }))
    assert.equal(r.status, 'week_broken')
    assert.equal(r.newCurrentStreak, 0)
  })
})
