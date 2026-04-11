import { test } from '@japa/runner'
import { distributeZoneWeights } from '#utils/zone_weights'

test.group('distributeZoneWeights', () => {
  test('равные доли без raw', ({ assert }) => {
    assert.deepEqual(distributeZoneWeights(['a', 'b', 'c']), [1 / 3, 1 / 3, 1 / 3])
  })

  test('полное совпадение ключей — нормализация суммы', ({ assert }) => {
    const w = distributeZoneWeights(['glutes', 'legs', 'back'], {
      glutes: 10,
      legs: 15,
      back: 25,
    })
    assert.closeTo(w[0]!, 10 / 50, 1e-6)
    assert.closeTo(w[1]!, 15 / 50, 1e-6)
    assert.closeTo(w[2]!, 25 / 50, 1e-6)
    assert.closeTo(w[0]! + w[1]! + w[2]!, 1, 1e-6)
  })

  test('частично заданы веса — остаток поровну на незаполненные зоны', ({ assert }) => {
    const w = distributeZoneWeights(['glutes', 'legs', 'back'], {
      glutes: 0.5,
    })
    assert.closeTo(w[0]!, 0.5, 1e-6)
    assert.closeTo(w[1]!, 0.25, 1e-6)
    assert.closeTo(w[2]!, 0.25, 1e-6)
  })

  test('sumKnown > 1 — нормализация, недостающие зоны 0', ({ assert }) => {
    const w = distributeZoneWeights(['a', 'b'], { a: 2, b: 2 })
    assert.closeTo(w[0]!, 0.5, 1e-6)
    assert.closeTo(w[1]!, 0.5, 1e-6)
  })
})
