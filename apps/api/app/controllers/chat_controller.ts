import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Chat from '#models/chat'
import Message from '#models/message'
import ChatRead from '#models/chat_read'
import TrainerGroup from '#models/trainer_group'
import User from '#models/user'
import TrainerAthlete from '#models/trainer_athlete'

export default class ChatController {
  /**
   * Get or create group chat
   * GET /trainer/chats/group/:groupId
   */
  async getOrCreateGroupChat({ auth, params, response }: HttpContext) {
    const trainer = auth.user!

    // Verify trainer owns the group
    const group = await TrainerGroup.query()
      .where('id', params.groupId)
      .where('trainerId', trainer.id)
      .first()

    if (!group) {
      return response.notFound({ message: 'Группа не найдена' })
    }

    // Find or create chat
    let chat = await Chat.query()
      .where('type', 'group')
      .where('trainerId', trainer.id)
      .where('groupId', params.groupId)
      .first()

    if (!chat) {
      chat = await Chat.create({
        type: 'group',
        trainerId: trainer.id,
        groupId: params.groupId,
        athleteId: null,
      })
    }

    return response.ok({ success: true, data: { chatId: chat.id } })
  }

  /**
   * Get or create personal athlete chat
   * GET /trainer/chats/athlete/:athleteId
   */
  async getOrCreateAthleteChat({ auth, params, response }: HttpContext) {
    const trainer = auth.user!

    // Verify trainer has access to athlete
    const binding = await TrainerAthlete.query()
      .where('trainerId', trainer.id)
      .where('athleteId', params.athleteId)
      .where('status', 'active')
      .first()

    if (!binding) {
      return response.forbidden({ message: 'Нет доступа к этому атлету' })
    }

    // Find or create chat
    let chat = await Chat.query()
      .where('type', 'personal')
      .where('trainerId', trainer.id)
      .where('athleteId', params.athleteId)
      .first()

    if (!chat) {
      chat = await Chat.create({
        type: 'personal',
        trainerId: trainer.id,
        groupId: null,
        athleteId: params.athleteId,
      })
    }

    return response.ok({ success: true, data: { chatId: chat.id } })
  }

  /**
   * Get messages for chat
   * GET /trainer/chats/:chatId/messages
   */
  async getMessages({ auth, params, request, response }: HttpContext) {
    const trainer = auth.user!

    // Verify trainer owns the chat
    const chat = await Chat.query().where('id', params.chatId).where('trainerId', trainer.id).first()

    if (!chat) {
      return response.notFound({ message: 'Чат не найден' })
    }

    const limit = request.input('limit', 50)
    const offset = request.input('offset', 0)

    const messages = await Message.query()
      .where('chatId', params.chatId)
      .preload('sender', (query) => {
        query.select('id', 'fullName', 'email')
      })
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)

    return response.ok({
      success: true,
      data: messages.reverse().map((m) => ({
        id: m.id,
        content: m.content,
        senderId: m.senderId,
        sender: {
          id: m.sender.id,
          fullName: m.sender.fullName,
          email: m.sender.email,
        },
        createdAt: m.createdAt,
      })),
    })
  }

  /**
   * Send message to chat
   * POST /trainer/chats/:chatId/messages
   */
  async sendMessage({ auth, params, request, response }: HttpContext) {
    const trainer = auth.user!
    const { content } = request.only(['content'])

    if (!content || content.trim().length === 0) {
      return response.badRequest({ message: 'Сообщение не может быть пустым' })
    }

    // Verify trainer owns the chat
    const chat = await Chat.query().where('id', params.chatId).where('trainerId', trainer.id).first()

    if (!chat) {
      return response.notFound({ message: 'Чат не найден' })
    }

    const message = await Message.create({
      chatId: params.chatId,
      senderId: trainer.id,
      content: content.trim(),
    })

    await message.load('sender', (query) => {
      query.select('id', 'fullName', 'email')
    })

    return response.created({
      success: true,
      data: {
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        sender: {
          id: message.sender.id,
          fullName: message.sender.fullName,
          email: message.sender.email,
        },
        createdAt: message.createdAt,
      },
    })
  }

  /**
   * Get last message for chat (for preview)
   * GET /trainer/chats/:chatId/last
   */
  async getLastMessage({ auth, params, response }: HttpContext) {
    const trainer = auth.user!

    // Verify trainer owns the chat
    const chat = await Chat.query().where('id', params.chatId).where('trainerId', trainer.id).first()

    if (!chat) {
      return response.notFound({ message: 'Чат не найден' })
    }

    const lastMessage = await Message.query()
      .where('chatId', params.chatId)
      .preload('sender', (query) => {
        query.select('id', 'fullName', 'email')
      })
      .orderBy('createdAt', 'desc')
      .first()

    if (!lastMessage) {
      return response.ok({ success: true, data: null })
    }

    return response.ok({
      success: true,
      data: {
        id: lastMessage.id,
        content: lastMessage.content,
        senderId: lastMessage.senderId,
        sender: {
          id: lastMessage.sender.id,
          fullName: lastMessage.sender.fullName,
        },
        createdAt: lastMessage.createdAt,
      },
    })
  }

  // ─── Shared (trainer OR athlete member) ──────────────────────────────────

  /**
   * Check if user has access to a chat (trainer or athlete participant)
   */
  private async findChatForUser(userId: number, chatId: number): Promise<Chat | null> {
    const chat = await Chat.find(chatId)
    if (!chat) return null

    // Trainer access
    if (chat.trainerId === userId) return chat

    // Personal chat: the athlete side
    if (chat.type === 'personal' && chat.athleteId === userId) return chat

    // Group chat: check group membership
    if (chat.type === 'group' && chat.groupId) {
      const row = await db
        .from('group_athletes')
        .where('group_id', chat.groupId)
        .where('athlete_id', userId)
        .first()
      if (row) return chat
    }

    return null
  }

  /**
   * GET /chats/:chatId/messages  (shared – trainer or athlete)
   */
  async getMessagesShared({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const chat = await this.findChatForUser(user.id, Number(params.chatId))

    if (!chat) {
      return response.notFound({ message: 'Чат не найден или нет доступа' })
    }

    const limit = request.input('limit', 50)
    const offset = request.input('offset', 0)

    const messages = await Message.query()
      .where('chatId', params.chatId)
      .preload('sender', (q) => q.select('id', 'fullName', 'email'))
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)

    return response.ok({
      success: true,
      data: messages.reverse().map((m) => ({
        id: m.id,
        content: m.content,
        senderId: m.senderId,
        sender: { id: m.sender.id, fullName: m.sender.fullName, email: m.sender.email },
        createdAt: m.createdAt,
      })),
    })
  }

  /**
   * POST /chats/:chatId/read  (shared – mark chat as read for current user)
   */
  async markAsRead({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const chatId = Number(params.chatId)

    const chat = await this.findChatForUser(user.id, chatId)
    if (!chat) {
      return response.notFound({ message: 'Чат не найден или нет доступа' })
    }

    await db.rawQuery(
      `INSERT INTO chat_reads (chat_id, user_id, last_read_at)
       VALUES (?, ?, ?)
       ON CONFLICT (chat_id, user_id)
       DO UPDATE SET last_read_at = EXCLUDED.last_read_at`,
      [chatId, user.id, DateTime.now().toISO()]
    )

    return response.ok({ success: true })
  }

  /**
   * GET /trainer/unread-counts
   */
  async getUnreadCounts({ auth, response }: HttpContext) {
    const trainer = auth.user!

    // All trainer chats
    const chats = await Chat.query().where('trainerId', trainer.id)

    if (chats.length === 0) {
      return response.ok({ success: true, data: { total: 0, groups: [], athletes: [] } })
    }

    const chatIds = chats.map((c) => c.id)

    // Last read timestamps for trainer
    const reads = await ChatRead.query()
      .whereIn('chatId', chatIds)
      .where('userId', trainer.id)

    const readMap = new Map(reads.map((r) => [r.chatId, r.lastReadAt]))

    // Count unread per chat (messages not sent by trainer, after lastReadAt)
    const results: Array<{ type: 'group' | 'personal'; refId: number; chatId: number; unread: number }> = []

    for (const chat of chats) {
      const lastRead = readMap.get(chat.id)
      let query = Message.query()
        .where('chatId', chat.id)
        .whereNot('senderId', trainer.id)

      if (lastRead) {
        query = query.where('createdAt', '>', lastRead.toISO()!)
      }

      const count = await query.count('* as total')
      const unread = Number(count[0].$extras.total)

      if (chat.type === 'group' && chat.groupId) {
        results.push({ type: 'group', refId: chat.groupId, chatId: chat.id, unread })
      } else if (chat.type === 'personal' && chat.athleteId) {
        results.push({ type: 'personal', refId: chat.athleteId, chatId: chat.id, unread })
      }
    }

    const groups = results
      .filter((r) => r.type === 'group')
      .map((r) => ({ groupId: r.refId, chatId: r.chatId, unread: r.unread }))

    const athletes = results
      .filter((r) => r.type === 'personal')
      .map((r) => ({ athleteId: r.refId, chatId: r.chatId, unread: r.unread }))

    const total = results.reduce((sum, r) => sum + r.unread, 0)

    return response.ok({ success: true, data: { total, groups, athletes } })
  }

  /**
   * POST /chats/:chatId/messages  (shared – trainer or athlete)
   */
  async sendMessageShared({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const { content } = request.only(['content'])

    if (!content || content.trim().length === 0) {
      return response.badRequest({ message: 'Сообщение не может быть пустым' })
    }

    const chat = await this.findChatForUser(user.id, Number(params.chatId))

    if (!chat) {
      return response.notFound({ message: 'Чат не найден или нет доступа' })
    }

    const message = await Message.create({
      chatId: Number(params.chatId),
      senderId: user.id,
      content: content.trim(),
    })

    await message.load('sender', (q) => q.select('id', 'fullName', 'email'))

    return response.created({
      success: true,
      data: {
        id: message.id,
        content: message.content,
        senderId: message.senderId,
        sender: { id: message.sender.id, fullName: message.sender.fullName, email: message.sender.email },
        createdAt: message.createdAt,
      },
    })
  }
}
