import type { HttpContext } from '@adonisjs/core/http'
import Chat from '#models/chat'
import Message from '#models/message'
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
}
