import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Chat from '#models/chat'
import Message from '#models/message'
import DialogService from '#services/DialogService'

// ─── helpers ───────────────────────────────────────────────────────────────

let userSeq = 0

async function createUser(role: 'trainer' | 'athlete' | 'both' = 'athlete'): Promise<User> {
  userSeq++
  return User.create({
    email: `dialog-test-${userSeq}-${Date.now()}@example.com`,
    password: null,
    fullName: `Dialog User ${userSeq}`,
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
  content = 'hello'
): Promise<Message> {
  return Message.create({ chatId, senderId, content })
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

test.group('DialogService: listForUser() — пустые случаи', (group) => {
  let trainer: User
  let athlete: User

  group.each.setup(async () => {
    trainer = await createUser('trainer')
    athlete = await createUser('athlete')
  })

  group.each.teardown(async () => {
    await cleanupUsers([trainer.id, athlete.id])
  })

  test('возвращает пустой массив для пользователя без чатов', async ({ assert }) => {
    const dialogs = await DialogService.listForUser(trainer.id)
    assert.deepEqual(dialogs, [])
  })
})

test.group('DialogService: listForUser() — персональный чат', (group) => {
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

  test('lastMessage равен null когда сообщений нет', async ({ assert }) => {
    const dialogs = await DialogService.listForUser(trainer.id)
    assert.equal(dialogs.length, 1)
    assert.isNull(dialogs[0].lastMessage)
  })

  test('unreadCount равен 0 когда все сообщения прочитаны', async ({ assert }) => {
    const msg = await createMessage(chat.id, athlete.id, 'привет тренер')
    await markRead(chat.id, trainer.id, new Date(Date.now() + 1000))

    const dialogs = await DialogService.listForUser(trainer.id)
    assert.equal(dialogs[0].unreadCount, 0)
    // silence unused var warning
    assert.ok(msg.id)
  })

  test('unreadCount равен N когда есть непрочитанные сообщения от атлета', async ({ assert }) => {
    await createMessage(chat.id, athlete.id, 'сообщение 1')
    await createMessage(chat.id, athlete.id, 'сообщение 2')
    await createMessage(chat.id, athlete.id, 'сообщение 3')

    const dialogs = await DialogService.listForUser(trainer.id)
    assert.equal(dialogs[0].unreadCount, 3)
  })

  test('собственные сообщения не считаются непрочитанными', async ({ assert }) => {
    await createMessage(chat.id, trainer.id, 'мой ответ')
    await createMessage(chat.id, athlete.id, 'ответ атлета')

    const dialogs = await DialogService.listForUser(trainer.id)
    // только сообщение от атлета непрочитано
    assert.equal(dialogs[0].unreadCount, 1)
  })

  test('lastMessage содержит последнее сообщение', async ({ assert }) => {
    await createMessage(chat.id, athlete.id, 'первое')
    await new Promise((r) => setTimeout(r, 5))
    await createMessage(chat.id, athlete.id, 'последнее')

    const dialogs = await DialogService.listForUser(trainer.id)
    assert.isNotNull(dialogs[0].lastMessage)
    assert.equal(dialogs[0].lastMessage!.content, 'последнее')
  })

  test('isOwnMessage корректно для тренера и атлета', async ({ assert }) => {
    await createMessage(chat.id, trainer.id, 'от тренера')

    const dialogs = await DialogService.listForUser(trainer.id)
    assert.isTrue(dialogs[0].lastMessage!.isOwnMessage)

    const athleteDialogs = await DialogService.listForUser(athlete.id)
    assert.isFalse(athleteDialogs[0].lastMessage!.isOwnMessage)
  })

  test('athleteId и trainerId корректно заполнены', async ({ assert }) => {
    const dialogs = await DialogService.listForUser(trainer.id)
    assert.equal(dialogs[0].trainerId, trainer.id)
    assert.equal(dialogs[0].athleteId, athlete.id)
    assert.isNull(dialogs[0].groupId)
  })

  test('тип чата personal', async ({ assert }) => {
    const dialogs = await DialogService.listForUser(trainer.id)
    assert.equal(dialogs[0].type, 'personal')
  })
})

test.group('DialogService: listForUser() — сортировка', (group) => {
  let trainer: User
  let athlete1: User
  let athlete2: User
  let chat1: Chat
  let chat2: Chat

  group.each.setup(async () => {
    trainer = await createUser('trainer')
    athlete1 = await createUser('athlete')
    athlete2 = await createUser('athlete')
    chat1 = await createPersonalChat(trainer.id, athlete1.id)
    chat2 = await createPersonalChat(trainer.id, athlete2.id)
  })

  group.each.teardown(async () => {
    await cleanupUsers([trainer.id, athlete1.id, athlete2.id])
  })

  test('сортировка по дате последнего сообщения убывает', async ({ assert }) => {
    await createMessage(chat1.id, athlete1.id, 'старое сообщение')
    await new Promise((r) => setTimeout(r, 20))
    await createMessage(chat2.id, athlete2.id, 'свежее сообщение')

    const dialogs = await DialogService.listForUser(trainer.id)
    assert.equal(dialogs.length, 2)
    // чат с самым свежим сообщением идёт первым
    assert.equal(dialogs[0].athleteId, athlete2.id)
    assert.equal(dialogs[1].athleteId, athlete1.id)
  })
})
