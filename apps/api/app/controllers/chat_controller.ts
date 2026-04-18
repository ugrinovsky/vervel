import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import Chat from '#models/chat'
import Message from '#models/message'
import TrainerGroup from '#models/trainer_group'
import TrainerAthlete from '#models/trainer_athlete'
import AchievementService from '#services/AchievementService'
import DialogService from '#services/DialogService'
import KlipyService from '#services/KlipyService'
import { resolveAfterId, formatSseEvent } from '#services/chat_stream_logic'
import {
  KLIPY_MESSAGE_PREFIX,
  parseKlipyMessageContent,
  pushBodyForChatMessage,
} from '#utils/klipy_message'
import emitter from '@adonisjs/core/services/emitter'

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

    if (!(await TrainerAthlete.isActiveBinding(trainer.id, Number(params.athleteId)))) {
      return response.forbidden({ message: 'Нет доступа к этому атлету' })
    }

    const chat = await Chat.findOrCreatePersonal(trainer.id, Number(params.athleteId))
    return response.ok({ success: true, data: { chatId: chat.id } })
  }

  /**
   * Get messages for chat
   * GET /trainer/chats/:chatId/messages
   */
  async getMessages({ auth, params, request, response }: HttpContext) {
    const trainer = auth.user!

    // Verify trainer owns the chat
    const chat = await Chat.query()
      .where('id', params.chatId)
      .where('trainerId', trainer.id)
      .first()

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

    const trimmed = content.trim()
    if (trimmed.startsWith(KLIPY_MESSAGE_PREFIX) && !parseKlipyMessageContent(trimmed)) {
      return response.badRequest({ message: 'Некорректная GIF-ссылка' })
    }

    // Verify trainer owns the chat
    const chat = await Chat.query()
      .where('id', params.chatId)
      .where('trainerId', trainer.id)
      .first()

    if (!chat) {
      return response.notFound({ message: 'Чат не найден' })
    }

    const message = await Message.create({
      chatId: params.chatId,
      senderId: trainer.id,
      content: trimmed,
    })

    await message.load('sender', (query) => {
      query.select('id', 'fullName', 'email')
    })

    const messageData = message.serialize()

    emitter.emit('chat:new_message', { chatId: Number(params.chatId), message: messageData })

    // Notify recipients via push
    let recipientIds: number[] = []
    if (chat.type === 'personal' && chat.athleteId) {
      recipientIds = [chat.athleteId]
    } else if (chat.type === 'group' && chat.groupId) {
      const rows = await db.from('group_athletes').where('group_id', chat.groupId)
      recipientIds = rows.map((r: { athlete_id: number }) => r.athlete_id)
    }
    if (recipientIds.length > 0) {
      emitter.emit('push:message', {
        senderName: `Тренер ${message.sender.fullName}`,
        content: pushBodyForChatMessage(trimmed),
        recipientIds,
        url: '/dialogs',
      })
    }

    return response.created({ success: true, data: messageData })
  }

  /**
   * Get last message for chat (for preview)
   * GET /trainer/chats/:chatId/last
   */
  async getLastMessage({ auth, params, response }: HttpContext) {
    const trainer = auth.user!

    // Verify trainer owns the chat
    const chat = await Chat.query()
      .where('id', params.chatId)
      .where('trainerId', trainer.id)
      .first()

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
   * GET /chats/klipy/status — whether GIF picker should be shown (key configured)
   */
  async klipyStatus({ response }: HttpContext) {
    const enabled = Boolean(KlipyService.getApiKey())
    return response.ok({ success: true, data: { enabled } })
  }

  /**
   * GET /chats/klipy/categories?kind=gif|sticker
   */
  async listKlipyCategories({ request, response }: HttpContext) {
    const kindRaw = String(request.input('kind', 'gif'))
    const kind = kindRaw === 'sticker' ? 'sticker' : 'gif'

    try {
      const categories = await KlipyService.listCategories(kind)
      return response.ok({ success: true, data: { categories } })
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg.includes('not configured')) {
        return response.serviceUnavailable({ message: 'GIF временно недоступны' })
      }
      return response.badGateway({ message: 'Не удалось загрузить категории' })
    }
  }

  private klipyPathSegment(raw: string): string | null {
    const t = raw.trim()
    if (t.length === 0 || t.length > 120) return null
    if (t.includes('/') || t.includes('..') || t.includes('\\')) return null
    return t
  }

  /**
   * GET /chats/klipy/search?q=&offset=&kind=gif|sticker&category=&tag=
   * category+tag = первая подборка KLIPY для категории (сервер отдаёт `defaultTagEncoded` в списке категорий)
   */
  async searchKlipy({ request, response }: HttpContext) {
    const q = String(request.input('q', '')).trim()
    if (q.length > 200) {
      return response.badRequest({ message: 'Слишком длинный запрос' })
    }
    const kindRaw = String(request.input('kind', 'gif'))
    const kind = kindRaw === 'sticker' ? 'sticker' : 'gif'
    const category = this.klipyPathSegment(String(request.input('category', '')))
    const tag = this.klipyPathSegment(String(request.input('tag', '')))
    const offset = Math.max(0, Math.min(Number(request.input('offset', 0)) || 0, 4999))
    const limit = Math.min(50, Math.max(1, Number(request.input('limit', 24)) || 24))

    const catProvided = String(request.input('category', '')).trim().length > 0
    const tagProvided = String(request.input('tag', '')).trim().length > 0
    if (catProvided || tagProvided) {
      if (!category || !tag) {
        return response.badRequest({ message: 'Некорректные параметры категории' })
      }
    }

    const hasQ = q.length > 0
    try {
      let data
      if (!hasQ && category && tag) {
        data = await KlipyService.categoryGifs(kind, category, tag, offset, limit)
      } else if (hasQ) {
        data = await KlipyService.search(q, offset, limit, kind)
      } else {
        data = await KlipyService.trending(offset, limit, kind)
      }
      return response.ok({ success: true, data })
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg.includes('not configured')) {
        return response.serviceUnavailable({ message: 'GIF временно недоступны' })
      }
      if (/Klipy \w+ HTTP (401|403)/.test(msg)) {
        return response.serviceUnavailable({
          message: 'GIF: проверьте KLIPY_API_KEY в окружении API',
        })
      }
      if (/Klipy \w+ HTTP 429/.test(msg)) {
        return response.serviceUnavailable({
          message:
            'Подборка GIF сейчас недоступна. Через минуту откройте окно снова или откройте «Недавние».',
        })
      }
      return response.badGateway({
        message: 'Не удалось загрузить GIF (сеть или KLIPY). Проверьте ключ и логи API',
      })
    }
  }

  /**
   * GET /chats — all dialogs for the current user
   */
  async listChats({ auth, response }: HttpContext) {
    const data = await DialogService.listForUser(auth.user!.id)
    return response.ok({ success: true, data })
  }

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

    const limit = Number(request.input('limit', 20))
    const beforeId = request.input('before_id', null)

    let query = Message.query()
      .where('chatId', params.chatId)
      .preload('sender', (q) => q.select('id', 'fullName', 'email'))
      .orderBy('createdAt', 'desc')
      .limit(limit)

    if (beforeId) {
      query = query.where('id', '<', Number(beforeId))
    }

    const messages = await query

    return response.ok({ success: true, data: messages.reverse().map((m) => m.serialize()) })
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

    // Single query: join chats + messages + chat_reads, group by chat
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
      { trainerId: trainer.id }
    )

    const chats = rows.rows

    const groups = chats
      .filter((r) => r.type === 'group' && r.group_id)
      .map((r) => ({ groupId: r.group_id!, chatId: r.chat_id, unread: r.unread }))

    const athletes = chats
      .filter((r) => r.type === 'personal' && r.athlete_id)
      .map((r) => ({ athleteId: r.athlete_id!, chatId: r.chat_id, unread: r.unread }))

    const total = chats.reduce((sum, r) => sum + r.unread, 0)

    return response.ok({ success: true, data: { total, groups, athletes } })
  }

  /**
   * GET /chats/:chatId/stream  — SSE real-time messages
   * Uses Last-Event-ID header on reconnect (set by browser automatically)
   */
  async streamMessages({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const chatId = Number(params.chatId)

    const chat = await this.findChatForUser(user.id, chatId)
    if (!chat) return response.notFound({ message: 'Чат не найден' })

    // After_id: use Last-Event-ID header (auto-sent by browser on reconnect) or query param
    const lastEventId = request.header('last-event-id')
    let latestId = resolveAfterId(lastEventId, request.input('after_id'))

    const raw = response.response

    // CORS headers must be set directly on raw before flushHeaders()
    // because AdonisJS CORS middleware buffers headers and writes them
    // only at response finalization — too late for SSE streams.
    const origin = request.header('origin')
    if (origin) {
      raw.setHeader('Access-Control-Allow-Origin', origin)
      raw.setHeader('Access-Control-Allow-Credentials', 'true')
    }
    raw.setHeader('Content-Type', 'text/event-stream')
    raw.setHeader('Cache-Control', 'no-cache')
    raw.setHeader('Connection', 'keep-alive')
    raw.setHeader('X-Accel-Buffering', 'no')
    raw.flushHeaders()

    let closed = false

    const sendEvent = (id: number, data: object) => {
      if (!closed && !raw.writableEnded) {
        raw.write(formatSseEvent(id, data))
      }
    }

    // Initial catch-up: deliver messages sent since latestId (e.g. after reconnect)
    try {
      const pending = await Message.query()
        .where('chatId', chatId)
        .where('id', '>', latestId)
        .preload('sender', (q) => q.select('id', 'fullName', 'email'))
        .orderBy('id', 'asc')
        .limit(50)

      for (const m of pending) {
        sendEvent(m.id, {
          type: 'message',
          data: {
            id: m.id,
            content: m.content,
            senderId: m.senderId,
            sender: { id: m.sender.id, fullName: m.sender.fullName, email: m.sender.email },
            createdAt: m.createdAt,
          },
        })
        latestId = m.id
      }
    } catch {
      /* ignore */
    }

    // Subscribe to new messages via emitter (zero DB polling)
    const onNewMessage = (event: {
      chatId: number
      message: {
        id: number
        content: string
        senderId: number
        sender: { id: number; fullName: string | null; email: string }
        createdAt: unknown
      }
    }) => {
      if (event.chatId !== chatId) return
      sendEvent(event.message.id, { type: 'message', data: event.message })
    }

    emitter.on('chat:new_message', onNewMessage)

    // Keepalive comment every 25s to prevent proxy timeouts
    const ping = setInterval(() => {
      if (!closed && !raw.writableEnded) raw.write(': ping\n\n')
    }, 25000)

    return new Promise<void>((resolve) => {
      request.request.on('close', () => {
        closed = true
        emitter.off('chat:new_message', onNewMessage)
        clearInterval(ping)
        resolve()
      })
    })
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

    const trimmed = content.trim()
    if (trimmed.startsWith(KLIPY_MESSAGE_PREFIX) && !parseKlipyMessageContent(trimmed)) {
      return response.badRequest({ message: 'Некорректная GIF-ссылка' })
    }

    const chat = await this.findChatForUser(user.id, Number(params.chatId))

    if (!chat) {
      return response.notFound({ message: 'Чат не найден или нет доступа' })
    }

    const message = await Message.create({
      chatId: Number(params.chatId),
      senderId: user.id,
      content: trimmed,
    })

    await message.load('sender', (q) => q.select('id', 'fullName', 'email'))

    const messageData = message.serialize()

    emitter.emit('chat:new_message', { chatId: Number(params.chatId), message: messageData })

    // Проверяем ачивки на сообщения тренеру (не блокирует ответ)
    if (chat.type === 'personal' && user.id !== chat.trainerId) {
      AchievementService.checkAndUnlockAchievements(user.id).catch(() => {})
    }

    // Notify recipients via push
    const isTrainer = user.id === chat.trainerId
    let recipientIds: number[] = []
    let senderLabel: string
    let url: string

    if (isTrainer) {
      senderLabel = `Тренер ${message.sender.fullName}`
      url = '/dialogs'
      if (chat.type === 'personal' && chat.athleteId) {
        recipientIds = [chat.athleteId]
      } else if (chat.type === 'group' && chat.groupId) {
        const rows = await db.from('group_athletes').where('group_id', chat.groupId)
        recipientIds = rows.map((r: { athlete_id: number }) => r.athlete_id)
      }
    } else {
      senderLabel = message.sender.fullName ?? message.sender.email
      url = '/dialogs'
      recipientIds = [chat.trainerId]
    }

    if (recipientIds.length > 0) {
      emitter.emit('push:message', {
        senderName: senderLabel,
        content: pushBodyForChatMessage(trimmed),
        recipientIds,
        url,
      })
    }

    return response.created({ success: true, data: messageData })
  }
}
