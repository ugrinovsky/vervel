import { test } from '@japa/runner'
import { epley1RM, maxEpley } from '#services/ProgressionService'

test.group('epley1RM', () => {
  test('1 повторение → вес без изменений', ({ assert }) => {
    assert.equal(epley1RM(100, 1), 100)
  })

  test('нулевой вес → 0', ({ assert }) => {
    assert.equal(epley1RM(0, 5), 0)
  })

  test('нулевые повторения → 0', ({ assert }) => {
    assert.equal(epley1RM(100, 0), 0)
  })

  test('100 кг × 5 повт ≈ 116.7', ({ assert }) => {
    assert.approximately(epley1RM(100, 5), 116.67, 0.1)
  })

  test('80 кг × 10 повт ≈ 106.7', ({ assert }) => {
    assert.approximately(epley1RM(80, 10), 106.67, 0.1)
  })

  test('больше повторений при том же весе → выше 1RM', ({ assert }) => {
    assert.isAbove(epley1RM(100, 10), epley1RM(100, 5))
  })

  test('больший вес при тех же повторениях → выше 1RM', ({ assert }) => {
    assert.isAbove(epley1RM(120, 5), epley1RM(100, 5))
  })
})

test.group('maxEpley', () => {
  test('пустые сеты → 0', ({ assert }) => {
    assert.equal(maxEpley([]), 0)
  })

  test('сеты без веса → 0', ({ assert }) => {
    assert.equal(
      maxEpley([
        { id: '1', reps: 10 },
        { id: '2', time: 60 },
      ]),
      0
    )
  })

  test('возвращает максимальный 1RM среди сетов', ({ assert }) => {
    const sets = [
      { id: '1', weight: 100, reps: 3 }, // 1RM ≈ 110
      { id: '2', weight: 80, reps: 10 }, // 1RM ≈ 106.7
      { id: '3', weight: 60, reps: 15 }, // 1RM ≈ 90
    ]
    const best = maxEpley(sets)
    assert.approximately(best, epley1RM(100, 3), 0.01)
  })

  test('один сет → его 1RM', ({ assert }) => {
    const sets = [{ id: '1', weight: 75, reps: 8 }]
    assert.equal(maxEpley(sets), epley1RM(75, 8))
  })
})
