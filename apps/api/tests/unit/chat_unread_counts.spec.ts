import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Chat from '#models/chat'


// ─── helpers ───────────────────────────────────────────────────────────────

let seq = 0

async function createUser(role: 'trainer' | 'athlete' | 'both' = 'trainer'): Promise<User> {
  seq++
  return User.create({
    email: `unread-test-${seq}-${Date.now()}@example.com`,
    password: null,
    fullName: `Unread User ${seq}`,
    role,
    balance: 0,
  })
}

async function createPersonalChat(trainerId: number, athleteId: number): Promise<Chat> {
  return Chat.create({ type: 'personal', trainerId, athleteId, groupId: null })
}

async function createMessage(
  chatId: number,
  senderId: number,
  content = 'msg',
  createdAt?: Date
): Promise<void> {
  const at = (createdAt ?? new Date()).toISOString()
  await db.rawQuery(
    `INSERT INTO messages (chat_id, sender_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
    [chatId, senderId, content, at, at]
  )
}

async function markRead(chatId: number, userId: number, at: Date = new Date()): Promise<void> {
  await db.rawQuery(
    `INSERT INTO chat_reads (chat_id, user_id, last_read_at)
     VALUES (?, ?, ?)
     ON CONFLICT (chat_id, user_id)
     DO UPDATE SET last_read_at = EXCLUDED.last_read_at`,
    [chatId, userId, at.toISOString()]
  )
}

/**
 * Runs the same SQL query as ChatController.getUnreadCounts() and returns the raw rows.
 */
async function queryUnreadCounts(trainerId: number) {
  const rows = await db.rawQuery<{
    rows: Array<{
      chat_id: number
      type: string
      group_id: number | null
      athlete_id: number | null
      unread: number
    }>
  }>(
    `SELECT
       c.id          AS chat_id,
       c.type,
       c.group_id,
       c.athlete_id,
       COUNT(m.id)::int AS unread
     FROM chats c
     LEFT JOIN messages m
       ON m.chat_id = c.id
      AND m.sender_id != :trainerId
     LEFT JOIN chat_reads cr
       ON cr.chat_id = c.id
      AND cr.user_id = :trainerId
     WHERE c.trainer_id = :trainerId
       AND (m.id IS NULL OR cr.last_read_at IS NULL OR m.created_at > cr.last_read_at)
     GROUP BY c.id, c.type, c.group_id, c.athlete_id`,
    { trainerId }
  )
  return rows.rows
}

async function cleanupUsers(ids: number[]) {
  for (const id of ids) {
    await db.from('chat_reads').where('user_id', id).delete()
    await db
      .from('messages')
      .whereIn(
        'chat_id',
        db.from('chats').where('trainer_id', id).orWhere('athlete_id', id).select('id')
      )
      .delete()
    await db.from('chats').where('trainer_id', id).orWhere('athlete_id', id).delete()
    await db.from('balance_transactions').where('user_id', id).delete()
    await db.from('users').where('id', id).delete()
  }
}

// ─── tests ─────────────────────────────────────────────────────────────────

test.group('getUnreadCounts SQL: тренер без чатов', (group) => {
  let trainer: User

  group.each.setup(async () => {
    trainer = await createUser('trainer')
  })

  group.each.teardown(async () => {
    await cleanupUsers([trainer.id])
  })

  test('возвращает пустой результат', async ({ assert }) => {
    const rows = await queryUnreadCounts(trainer.id)
    assert.deepEqual(rows, [])
  })
})

test.group('getUnreadCounts SQL: персональный чат', (group) => {
  let trainer: User
  let athlete: User
  let chat: Chat

  group.each.setup(async () => {
    trainer = await createUser('trainer')
    athlete = await createUser('athlete')
    chat = await createPersonalChat(trainer.id, athlete.id)
  })

  group.each.teardown(async () => {
    await cleanupUsers([trainer.id, athlete.id])
  })

  test('чат без сообщений возвращает unread=0 (включён в результат из-за LEFT JOIN)', async ({ assert }) => {
    const rows = await queryUnreadCounts(trainer.id)
    // Чат есть, но нет сообщений → WHERE m.id IS NULL → строка включена
    assert.equal(rows.length, 1)
    assert.equal(rows[0].unread, 0)
    assert.ok(chat.id)
  })

  test('сообщения от атлета считаются непрочитанными', async ({ assert }) => {
    await createMessage(chat.id, athlete.id, 'сообщение атлета 1')
    await createMessage(chat.id, athlete.id, 'сообщение атлета 2')

    const rows = await queryUnreadCounts(trainer.id)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].unread, 2)
  })

  test('сообщения от тренера НЕ считаются непрочитанными для тренера', async ({ assert }) => {
    await createMessage(chat.id, trainer.id, 'ответ тренера')

    // Тренер читает только сообщения от других (sender_id != trainerId)
    const rows = await queryUnreadCounts(trainer.id)
    // WHERE m.id IS NULL OR ... — здесь m.sender_id == trainerId, поэтому m фильтруется
    // Строка включается с unread=0 благодаря условию m.id IS NULL (нет чужих сообщений)
    assert.equal(rows[0].unread, 0)
  })

  test('после отметки прочтения чат исчезает из результатов (unread=0)', async ({ assert }) => {
    const msgAt = new Date(Date.now() - 2000)
    await createMessage(chat.id, athlete.id, 'прочитанное', msgAt)
    // last_read_at после сообщения → сообщение прочитано
    await markRead(chat.id, trainer.id, new Date(Date.now() - 1000))

    const rows = await queryUnreadCounts(trainer.id)
    // SQL не возвращает чаты без непрочитанных сообщений
    assert.equal(rows.length, 0)
  })

  test('athlete_id корректно возвращается для персонального чата', async ({ assert }) => {
    const rows = await queryUnreadCounts(trainer.id)
    assert.equal(rows[0].athlete_id, athlete.id)
    assert.equal(rows[0].type, 'personal')
    assert.isNull(rows[0].group_id)
  })

  test('сообщения атлета до last_read_at не считаются — только после', async ({ assert }) => {
    const now = Date.now()
    // Старое сообщение — 3 секунды назад
    await createMessage(chat.id, athlete.id, 'старое сообщение', new Date(now - 3000))
    // Пометили прочитанным 2 секунды назад (после старого сообщения)
    await markRead(chat.id, trainer.id, new Date(now - 2000))
    // Новое сообщение — 1 секунду назад (после last_read_at)
    await createMessage(chat.id, athlete.id, 'новое сообщение', new Date(now - 1000))

    const rows = await queryUnreadCounts(trainer.id)
    assert.equal(rows[0].unread, 1)
  })
})
