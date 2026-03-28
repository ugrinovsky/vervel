import { test } from '@japa/runner'
import { computeCallAction } from '#services/callLogic'

test.group('computeCallAction: нет записи в БД', () => {
  test('создаёт комнату и уведомляет', ({ assert }) => {
    const action = computeCallAction(null, false)
    assert.isTrue(action.shouldCreateRoom)
    assert.isTrue(action.shouldNotify)
    assert.isFalse(action.shouldResetCall)
  })
})

test.group('computeCallAction: запись ended', () => {
  test('пересоздаёт комнату, сбрасывает запись, уведомляет', ({ assert }) => {
    const action = computeCallAction({ status: 'ended' }, false)
    assert.isTrue(action.shouldCreateRoom)
    assert.isTrue(action.shouldResetCall)
    assert.isTrue(action.shouldNotify)
  })
})

test.group('computeCallAction: pending/active, комната жива', () => {
  test('pending — ничего не делает', ({ assert }) => {
    const action = computeCallAction({ status: 'pending' }, true)
    assert.isFalse(action.shouldCreateRoom)
    assert.isFalse(action.shouldResetCall)
    assert.isFalse(action.shouldNotify)
  })

  test('active — ничего не делает', ({ assert }) => {
    const action = computeCallAction({ status: 'active' }, true)
    assert.isFalse(action.shouldCreateRoom)
    assert.isFalse(action.shouldResetCall)
    assert.isFalse(action.shouldNotify)
  })
})

test.group('computeCallAction: pending/active, комната удалена — основной баг', () => {
  test('pending + комната удалена → пересоздаёт и уведомляет', ({ assert }) => {
    const action = computeCallAction({ status: 'pending' }, false)
    assert.isTrue(action.shouldCreateRoom)
    assert.isTrue(action.shouldResetCall)
    assert.isTrue(action.shouldNotify)
  })

  test('active + комната удалена → пересоздаёт и уведомляет', ({ assert }) => {
    const action = computeCallAction({ status: 'active' }, false)
    assert.isTrue(action.shouldCreateRoom)
    assert.isTrue(action.shouldResetCall)
    assert.isTrue(action.shouldNotify)
  })
})
