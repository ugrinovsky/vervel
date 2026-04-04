import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import { AiBalanceService, InsufficientBalanceError } from '#services/AiBalanceService'
import User from '#models/user'

// ─── helpers ───────────────────────────────────────────────────────────────

let userCounter = 0

async function createTestUser(balance = 100): Promise<User> {
  userCounter++
  return User.create({
    email: `test-balance-${userCounter}-${Date.now()}@example.com`,
    password: null,
    fullName: `Test User ${userCounter}`,
    role: 'athlete',
    balance,
  })
}

async function cleanupUser(userId: number) {
  await db.from('balance_transactions').where('user_id', userId).delete()
  await db.from('users').where('id', userId).delete()
}

// ─── charge() ──────────────────────────────────────────────────────────────

test.group('AiBalanceService: charge()', (group) => {
  let user: User

  group.each.setup(async () => {
    user = await createTestUser(100)
  })

  group.each.teardown(async () => {
    await cleanupUser(user.id)
  })

  test('успешное списание уменьшает баланс пользователя', async ({ assert }) => {
    const newBalance = await AiBalanceService.charge(user.id, 30, 'тест списания')
    assert.equal(newBalance, 70)

    const updated = await User.findOrFail(user.id)
    assert.equal(updated.balance, 70)
  })

  test('создаёт запись транзакции с типом charge и отрицательной суммой', async ({ assert }) => {
    await AiBalanceService.charge(user.id, 25, 'описание теста')

    const tx = await db
      .from('balance_transactions')
      .where('user_id', user.id)
      .orderBy('created_at', 'desc')
      .first()

    assert.isNotNull(tx)
    assert.equal(tx.type, 'charge')
    assert.equal(Number(tx.amount), -25)
    assert.equal(Number(tx.balance_after), 75)
    assert.equal(tx.description, 'описание теста')
  })

  test('бросает InsufficientBalanceError когда баланс < суммы списания', async ({ assert }) => {
    await assert.rejects(
      () => AiBalanceService.charge(user.id, 200, 'не хватит'),
      InsufficientBalanceError
    )
  })

  test('при InsufficientBalanceError баланс не изменяется', async ({ assert }) => {
    try {
      await AiBalanceService.charge(user.id, 200, 'не хватит')
    } catch {}

    const updated = await User.findOrFail(user.id)
    assert.equal(updated.balance, 100)
  })

  test('при InsufficientBalanceError транзакция не создаётся', async ({ assert }) => {
    try {
      await AiBalanceService.charge(user.id, 200, 'не хватит')
    } catch {}

    const txCount = await db
      .from('balance_transactions')
      .where('user_id', user.id)
      .count('* as total')
      .first()

    assert.equal(Number(txCount.total), 0)
  })

  test('charge корректно возвращает остаток при нескольких списаниях', async ({ assert }) => {
    await AiBalanceService.charge(user.id, 10, 'первое')
    const third = await AiBalanceService.charge(user.id, 20, 'второе')
    assert.equal(third, 70)
  })

  test('charge до нуля — ровно ноль без ошибки', async ({ assert }) => {
    const newBalance = await AiBalanceService.charge(user.id, 100, 'обнуление')
    assert.equal(newBalance, 0)
  })
})

// ─── topup() ───────────────────────────────────────────────────────────────

test.group('AiBalanceService: topup()', (group) => {
  let user: User

  group.each.setup(async () => {
    user = await createTestUser(50)
  })

  group.each.teardown(async () => {
    await cleanupUser(user.id)
  })

  test('пополнение увеличивает баланс', async ({ assert }) => {
    const newBalance = await AiBalanceService.topup(user.id, 100, 'topup', 'пополнение')
    assert.equal(newBalance, 150)

    const updated = await User.findOrFail(user.id)
    assert.equal(updated.balance, 150)
  })

  test('создаёт транзакцию с типом topup', async ({ assert }) => {
    await AiBalanceService.topup(user.id, 250, 'topup', 'пополнение через ЮКасса')

    const tx = await db
      .from('balance_transactions')
      .where('user_id', user.id)
      .orderBy('created_at', 'desc')
      .first()

    assert.equal(tx.type, 'topup')
    assert.equal(Number(tx.amount), 250)
    assert.equal(Number(tx.balance_after), 300)
    assert.equal(tx.description, 'пополнение через ЮКасса')
  })

  test('создаёт транзакцию с типом bonus', async ({ assert }) => {
    await AiBalanceService.topup(user.id, 50, 'bonus', 'приветственный бонус')

    const tx = await db
      .from('balance_transactions')
      .where('user_id', user.id)
      .orderBy('created_at', 'desc')
      .first()

    assert.equal(tx.type, 'bonus')
    assert.equal(Number(tx.amount), 50)
  })

  test('balance_after в транзакции совпадает с реальным балансом', async ({ assert }) => {
    await AiBalanceService.topup(user.id, 77, 'topup', 'проверка')

    const updated = await User.findOrFail(user.id)
    const tx = await db
      .from('balance_transactions')
      .where('user_id', user.id)
      .orderBy('created_at', 'desc')
      .first()

    assert.equal(Number(tx.balance_after), updated.balance)
  })
})

// ─── getBalance() ──────────────────────────────────────────────────────────

test.group('AiBalanceService: getBalance()', (group) => {
  let user: User

  group.each.setup(async () => {
    user = await createTestUser(123.45)
  })

  group.each.teardown(async () => {
    await cleanupUser(user.id)
  })

  test('возвращает текущий баланс пользователя', async ({ assert }) => {
    const balance = await AiBalanceService.getBalance(user.id)
    assert.equal(balance, 123.45)
  })

  test('после charge возвращает обновлённый баланс', async ({ assert }) => {
    await AiBalanceService.charge(user.id, 23.45, 'тест')
    const balance = await AiBalanceService.getBalance(user.id)
    assert.closeTo(balance, 100, 0.01)
  })
})

// ─── getTransactions() ─────────────────────────────────────────────────────

test.group('AiBalanceService: getTransactions()', (group) => {
  let user: User

  group.each.setup(async () => {
    user = await createTestUser(200)
  })

  group.each.teardown(async () => {
    await cleanupUser(user.id)
  })

  test('возвращает пустой массив для пользователя без транзакций', async ({ assert }) => {
    const txs = await AiBalanceService.getTransactions(user.id)
    assert.deepEqual(txs, [])
  })

  test('возвращает созданные транзакции', async ({ assert }) => {
    await AiBalanceService.charge(user.id, 10, 'операция 1')
    await AiBalanceService.charge(user.id, 5, 'операция 2')

    const txs = await AiBalanceService.getTransactions(user.id)
    assert.equal(txs.length, 2)
  })

  test('транзакции отсортированы по убыванию created_at (новые первыми)', async ({ assert }) => {
    await AiBalanceService.charge(user.id, 10, 'первая')
    // Небольшая задержка чтобы отличить метки времени
    await new Promise((r) => setTimeout(r, 10))
    await AiBalanceService.charge(user.id, 5, 'вторая')

    const txs = await AiBalanceService.getTransactions(user.id)
    assert.equal(txs[0].description, 'вторая')
    assert.equal(txs[1].description, 'первая')
  })

  test('соблюдает параметр limit', async ({ assert }) => {
    await AiBalanceService.charge(user.id, 5, 'tx 1')
    await AiBalanceService.charge(user.id, 5, 'tx 2')
    await AiBalanceService.charge(user.id, 5, 'tx 3')

    const txs = await AiBalanceService.getTransactions(user.id, 2)
    assert.equal(txs.length, 2)
  })

  test('соблюдает параметр offset', async ({ assert }) => {
    await AiBalanceService.charge(user.id, 5, 'tx 1')
    await new Promise((r) => setTimeout(r, 10))
    await AiBalanceService.charge(user.id, 5, 'tx 2')
    await new Promise((r) => setTimeout(r, 10))
    await AiBalanceService.charge(user.id, 5, 'tx 3')

    const txs = await AiBalanceService.getTransactions(user.id, 20, 1)
    assert.equal(txs.length, 2)
    // первая (новейшая) пропущена, показаны вторая и третья
    assert.equal(txs[0].description, 'tx 2')
  })

  test('поля транзакции имеют правильные имена (camelCase)', async ({ assert }) => {
    await AiBalanceService.topup(user.id, 50, 'bonus', 'бонус')

    const txs = await AiBalanceService.getTransactions(user.id)
    const tx = txs[0]

    assert.property(tx, 'id')
    assert.property(tx, 'amount')
    assert.property(tx, 'balanceAfter')
    assert.property(tx, 'type')
    assert.property(tx, 'description')
    assert.property(tx, 'createdAt')
  })
})
