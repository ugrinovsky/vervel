import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import {
  sanitizeTrainerCustomString,
  serializeTrainerCustomExercise,
} from '#utils/trainer_custom_exercise_helpers'

test.group('sanitizeTrainerCustomString', () => {
  test('null для не-строки', ({ assert }) => {
    assert.isNull(sanitizeTrainerCustomString(1, 10))
    assert.isNull(sanitizeTrainerCustomString(null, 10))
    assert.isNull(sanitizeTrainerCustomString(undefined, 10))
    assert.isNull(sanitizeTrainerCustomString([], 10))
  })

  test('null для пробелов и пустой строки', ({ assert }) => {
    assert.isNull(sanitizeTrainerCustomString('   ', 10))
    assert.isNull(sanitizeTrainerCustomString('\t\n', 10))
    assert.isNull(sanitizeTrainerCustomString('', 5))
  })

  test('trim и ограничение длины', ({ assert }) => {
    assert.equal(sanitizeTrainerCustomString('  жим  ', 255), 'жим')
    assert.equal(sanitizeTrainerCustomString('abcd', 2), 'ab')
    assert.equal(sanitizeTrainerCustomString(' русский текст ', 4), 'русс')
  })
})

test.group('serializeTrainerCustomExercise', () => {
  test('прокидывает поля как в ответе API', ({ assert }) => {
    const dt = DateTime.fromISO('2026-05-01T12:00:00.000Z')
    const row = serializeTrainerCustomExercise({
      id: 7,
      name: 'Подтягивания',
      notes: 'нейтральный хват',
      createdAt: dt,
    })
    assert.deepEqual(row, {
      id: 7,
      name: 'Подтягивания',
      notes: 'нейтральный хват',
      createdAt: dt,
    })
  })

  test('notes может быть null', ({ assert }) => {
    const dt = DateTime.fromISO('2026-05-02T09:00:00.000Z')
    const row = serializeTrainerCustomExercise({
      id: 1,
      name: 'X',
      notes: null,
      createdAt: dt,
    })
    assert.isNull(row.notes)
    assert.equal(row.name, 'X')
  })
})
