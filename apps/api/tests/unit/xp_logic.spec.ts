import { test } from '@japa/runner'
import { computeLevel, xpThresholdForLevel, xpForLevelUp, XP_REWARDS } from '#services/xpLogic'

test.group('xpLogic: пороги уровней', () => {
  test('уровень 1 начинается с 0 XP', ({ assert }) => {
    assert.equal(xpThresholdForLevel(1), 0)
  })

  test('пороги возрастают монотонно', ({ assert }) => {
    for (let lvl = 1; lvl < 100; lvl++) {
      assert.isBelow(xpThresholdForLevel(lvl), xpThresholdForLevel(lvl + 1))
    }
  })

  test('xpForLevelUp растёт с уровнем', ({ assert }) => {
    for (let lvl = 1; lvl < 99; lvl++) {
      assert.isBelow(xpForLevelUp(lvl), xpForLevelUp(lvl + 1))
    }
  })
})

test.group('xpLogic: computeLevel', () => {
  test('0 XP → уровень 1, Новичок', ({ assert }) => {
    const r = computeLevel(0)
    assert.equal(r.level, 1)
    assert.equal(r.levelName, 'Новичок')
    assert.equal(r.progressPct, 0)
  })

  test('XP ровно на пороге уровня 2 → уровень 2', ({ assert }) => {
    const threshold = xpThresholdForLevel(2)
    const r = computeLevel(threshold)
    assert.equal(r.level, 2)
    assert.equal(r.progressPct, 0)
  })

  test('XP посередине уровня → progressPct 50±5', ({ assert }) => {
    const lo = xpThresholdForLevel(5)
    const hi = xpThresholdForLevel(6)
    const mid = Math.floor((lo + hi) / 2)
    const r = computeLevel(mid)
    assert.equal(r.level, 5)
    assert.isAbove(r.progressPct, 45)
    assert.isBelow(r.progressPct, 55)
  })

  test('уровень 6+ → Любитель', ({ assert }) => {
    assert.equal(computeLevel(xpThresholdForLevel(6)).levelName, 'Любитель')
  })

  test('уровень 16+ → Атлет', ({ assert }) => {
    assert.equal(computeLevel(xpThresholdForLevel(16)).levelName, 'Атлет')
  })

  test('уровень 31+ → Профи', ({ assert }) => {
    assert.equal(computeLevel(xpThresholdForLevel(31)).levelName, 'Профи')
  })

  test('уровень 51+ → Элита', ({ assert }) => {
    assert.equal(computeLevel(xpThresholdForLevel(51)).levelName, 'Элита')
  })

  test('уровень 76+ → Легенда', ({ assert }) => {
    assert.equal(computeLevel(xpThresholdForLevel(76)).levelName, 'Легенда')
  })

  test('очень большой XP → не превышает 100 уровень', ({ assert }) => {
    const r = computeLevel(999_999_999)
    assert.equal(r.level, 100)
    assert.equal(r.progressPct, 100)
  })

  test('xpForCurrentLevel <= xp <= xpForNextLevel', ({ assert }) => {
    const testValues = [0, 50, 500, 2000, 10000, 50000]
    for (const xp of testValues) {
      const r = computeLevel(xp)
      assert.isAtMost(r.xpForCurrentLevel, xp)
      assert.isAtLeast(r.xpForNextLevel, xp)
    }
  })
})

test.group('xpLogic: XP_REWARDS', () => {
  test('все награды положительны', ({ assert }) => {
    for (const [key, value] of Object.entries(XP_REWARDS)) {
      assert.isAbove(value, 0, `${key} должен быть > 0`)
    }
  })

  test('ACHIEVEMENT_LARGE > ACHIEVEMENT_MEDIUM > ACHIEVEMENT_SMALL', ({ assert }) => {
    assert.isAbove(XP_REWARDS.ACHIEVEMENT_LARGE, XP_REWARDS.ACHIEVEMENT_MEDIUM)
    assert.isAbove(XP_REWARDS.ACHIEVEMENT_MEDIUM, XP_REWARDS.ACHIEVEMENT_SMALL)
  })
})
