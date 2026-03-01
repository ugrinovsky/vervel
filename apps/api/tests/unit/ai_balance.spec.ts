import { test } from '@japa/runner'
import { AiBalanceService, InsufficientBalanceError } from '#services/AiBalanceService'

// ─── calculateChatCost ─────────────────────────────────────────────────────

test.group('AiBalanceService: calculateChatCost', () => {
  test('возвращает минимальную стоимость при нулевых токенах', ({ assert }) => {
    const cost = AiBalanceService.calculateChatCost(0, 0)
    assert.equal(cost, AiBalanceService.CHAT_MIN_CHARGE)
  })

  test('корректно считает при 1000 токенов вход/выход', ({ assert }) => {
    // (1000/1000 * 0.20 * 5) + (1000/1000 * 0.40 * 5) = 1.00 + 2.00 = 3.00
    const cost = AiBalanceService.calculateChatCost(1000, 1000)
    assert.closeTo(cost, 3.0, 0.01)
  })

  test('учитывает только входные токены корректно', ({ assert }) => {
    // (2000/1000 * 0.20 * 5) + (0/1000 * 0.40 * 5) = 2.00
    const cost = AiBalanceService.calculateChatCost(2000, 0)
    assert.closeTo(cost, 2.0, 0.01)
  })

  test('учитывает только выходные токены корректно', ({ assert }) => {
    // (0 * 0.20 * 5) + (1000/1000 * 0.40 * 5) = 2.00
    const cost = AiBalanceService.calculateChatCost(0, 1000)
    assert.closeTo(cost, 2.0, 0.01)
  })

  test('не опускается ниже CHAT_MIN_CHARGE при малом вводе', ({ assert }) => {
    const cost = AiBalanceService.calculateChatCost(1, 1) // почти нулевые токены
    assert.isAtLeast(cost, AiBalanceService.CHAT_MIN_CHARGE)
  })

  test('округляет до двух знаков после запятой', ({ assert }) => {
    const cost = AiBalanceService.calculateChatCost(333, 666)
    const str = cost.toString()
    const decimals = str.includes('.') ? str.split('.')[1].length : 0
    assert.isAtMost(decimals, 2)
  })

  test('большой объём токенов — стоимость пропорциональна', ({ assert }) => {
    const cost1 = AiBalanceService.calculateChatCost(1000, 0)
    const cost2 = AiBalanceService.calculateChatCost(2000, 0)
    assert.closeTo(cost2, cost1 * 2, 0.01)
  })
})

// ─── InsufficientBalanceError ──────────────────────────────────────────────

test.group('InsufficientBalanceError', () => {
  test('является экземпляром Error', ({ assert }) => {
    const err = new InsufficientBalanceError(30, 50)
    assert.instanceOf(err, Error)
  })

  test('имеет правильное имя ошибки', ({ assert }) => {
    const err = new InsufficientBalanceError(30, 50)
    assert.equal(err.name, 'InsufficientBalanceError')
  })

  test('хранит значения balance и required', ({ assert }) => {
    const err = new InsufficientBalanceError(30, 50)
    assert.equal(err.balance, 30)
    assert.equal(err.required, 50)
  })

  test('сообщение содержит обе суммы', ({ assert }) => {
    const err = new InsufficientBalanceError(10, 25)
    assert.include(err.message, '10')
    assert.include(err.message, '25')
  })

  test('работает с дробными суммами', ({ assert }) => {
    const err = new InsufficientBalanceError(0.5, 10.99)
    assert.equal(err.balance, 0.5)
    assert.equal(err.required, 10.99)
  })
})

// ─── Константы из env ──────────────────────────────────────────────────────

test.group('AiBalanceService: дефолтные константы из env', () => {
  test('COST_GENERATE = 10 по умолчанию', ({ assert }) => {
    assert.equal(AiBalanceService.COST_GENERATE, 10)
  })

  test('COST_RECOGNIZE = 9 по умолчанию', ({ assert }) => {
    assert.equal(AiBalanceService.COST_RECOGNIZE, 9)
  })

  test('WELCOME_BONUS = 50 по умолчанию', ({ assert }) => {
    assert.equal(AiBalanceService.WELCOME_BONUS, 50)
  })

  test('CHAT_MIN_CHARGE = 0.50 по умолчанию', ({ assert }) => {
    assert.equal(AiBalanceService.CHAT_MIN_CHARGE, 0.5)
  })

  test('CHAT_MARKUP = 5 по умолчанию', ({ assert }) => {
    assert.equal(AiBalanceService.CHAT_MARKUP, 5)
  })
})
