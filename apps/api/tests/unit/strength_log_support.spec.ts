import { test } from '@japa/runner'
import {
  normalizePinnedExerciseIdList,
  pickTopExerciseIdsBySessionCount,
} from '#services/strength_log_support'

test.group('normalizePinnedExerciseIdList', () => {
  test('trim и уникальность', ({ assert }) => {
    assert.deepEqual(normalizePinnedExerciseIdList(['  a  ', 'a', 'b']), ['a', 'b'])
  })

  test('пустые и дубликаты отбрасываются', ({ assert }) => {
    assert.deepEqual(normalizePinnedExerciseIdList(['', '  ', 'x', 'x']), ['x'])
  })

  test('custom: id сохраняется', ({ assert }) => {
    assert.deepEqual(normalizePinnedExerciseIdList(['custom:Жим', ' Roman_Deadlift ']), [
      'custom:Жим',
      'Roman_Deadlift',
    ])
  })
})

test.group('pickTopExerciseIdsBySessionCount', () => {
  test('сортирует по убыванию частоты', ({ assert }) => {
    const m = new Map([
      ['a', 2],
      ['b', 5],
      ['c', 5],
    ])
    const top = pickTopExerciseIdsBySessionCount(m, 2)
    assert.equal(top.length, 2)
    assert.equal(top[0], 'b')
    assert.equal(top[1], 'c')
  })

  test('при равной частоте — лексикографически', ({ assert }) => {
    const m = new Map([
      ['z', 1],
      ['a', 1],
    ])
    assert.deepEqual(pickTopExerciseIdsBySessionCount(m, 2), ['a', 'z'])
  })

  test('limit больше размера', ({ assert }) => {
    assert.deepEqual(pickTopExerciseIdsBySessionCount(new Map([['x', 1]]), 5), ['x'])
  })
})
