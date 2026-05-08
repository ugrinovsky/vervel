import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { CopilotInsightsService } from '#services/CopilotInsightsService'
import { CopilotPlanService } from '#services/CopilotPlanService'
import { CopilotPriorityService } from '#services/CopilotPriorityService'
import { AiBalanceService } from '#services/AiBalanceService'
import ScheduledWorkout from '#models/scheduled_workout'
import Workout from '#models/workout'
import TrainerAthlete from '#models/trainer_athlete'
import Chat from '#models/chat'
import Message from '#models/message'
import User from '#models/user'
import emitter from '@adonisjs/core/services/emitter'
import env from '#start/env'

function getWeekStart(input: string | undefined): string {
  return (input ? DateTime.fromISO(input) : DateTime.now()).startOf('week').toISODate()!
}

export default class TrainerCopilotController {
  /**
   * GET /trainer/copilot/priority-list
   */
  async priorityList({ auth, response }: HttpContext) {
    const trainer = auth.user!
    const result = await CopilotPriorityService.list(trainer.id)
    return response.ok({ success: true, data: result })
  }

  /**
   * POST /trainer/copilot/draft
   * Возвращает: сводку по атлету, предлагаемые даты тренировок, черновик сообщения
   */
  async draft({ auth, request, response }: HttpContext) {
    const trainer = auth.user!

    const { athleteId, weekStart: rawWeekStart } = request.only(['athleteId', 'weekStart'])

    if (!athleteId || typeof athleteId !== 'number') {
      return response.badRequest({ message: 'athleteId обязателен' })
    }

    const isActive = await TrainerAthlete.isActiveBinding(trainer.id, athleteId)
    if (!isActive) {
      return response.forbidden({ message: 'Нет доступа к этому атлету' })
    }

    const weekStart = getWeekStart(rawWeekStart)

    const weekStartDt = DateTime.fromISO(weekStart)
    const lastScheduled = await ScheduledWorkout.query()
      .where('trainerId', trainer.id)
      .where((q) => {
        q.whereRaw(`assigned_to::text like ?`, [`%"id":${athleteId}%`]).orWhereRaw(
          `assigned_to::text like ?`,
          [`%"id": ${athleteId}%`]
        )
      })
      .where('scheduledDate', '<', weekStartDt.toJSDate())
      .orderBy('scheduledDate', 'desc')
      .first()

    const daysSinceLastPlan = lastScheduled
      ? Math.floor(
          (weekStartDt.toJSDate().getTime() -
            (lastScheduled.scheduledDate.toJSDate
              ? lastScheduled.scheduledDate.toJSDate()
              : new Date(lastScheduled.scheduledDate.toString())
            ).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 14

    const insights = await CopilotInsightsService.collect(athleteId, { daysSinceLastPlan })

    const copilotCost = Number(env.get('AI_COST_COPILOT', '8'))

    const balance = await AiBalanceService.getBalance(trainer.id)
    if (balance < copilotCost) {
      return response.paymentRequired({
        message: `Недостаточно средств: баланс ${balance}₽, требуется ${copilotCost}₽`,
        balance,
        required: copilotCost,
      })
    }

    const { suggestedDates, chatMessage } = await CopilotPlanService.build({
      trainerId: trainer.id,
      athleteId,
      weekStart,
      insights,
    })

    const balanceAfter = await AiBalanceService.charge(
      trainer.id,
      copilotCost,
      `Ассистент: анализ атлета #${athleteId}`
    )

    return response.ok({
      success: true,
      data: {
        insights: {
          phase: insights.phase,
          phaseAdvice: insights.phaseAdvice,
          tsb: insights.tsb,
          atl: insights.atl,
          ctl: insights.ctl,
          acwrZone: insights.acwrZone,
          overloadedZones: insights.overloadedZones,
          daysSinceLastWorkout: insights.daysSinceLastWorkout,
          daysSinceLastPlan,
          recentWorkoutsCount: insights.recentWorkoutsCount,
          coldStart: insights.coldStart,
        },
        suggestedDates,
        chatMessageDraft: chatMessage,
        ai: { cost: copilotCost, balanceAfter },
      },
    })
  }

  /**
   * POST /trainer/copilot/send-message
   * Отправляет сообщение атлету в чат
   */
  async sendMessage({ auth, request, response }: HttpContext) {
    const trainer = auth.user!

    const { athleteId, chatMessage } = request.only(['athleteId', 'chatMessage'])

    if (!athleteId || typeof athleteId !== 'number') {
      return response.badRequest({ message: 'athleteId обязателен' })
    }
    if (!chatMessage || typeof chatMessage !== 'string' || !chatMessage.trim()) {
      return response.badRequest({ message: 'chatMessage обязателен' })
    }

    const isActive = await TrainerAthlete.isActiveBinding(trainer.id, athleteId)
    if (!isActive) {
      return response.forbidden({ message: 'Нет доступа к этому атлету' })
    }

    const athlete = await User.find(athleteId)
    if (!athlete) return response.notFound({ message: 'Атлет не найден' })

    let messageId: number | null = null
    let chatId: number | null = null
    let messageError: string | null = null

    try {
      const chat = await Chat.findOrCreatePersonal(trainer.id, athleteId)
      chatId = chat.id

      const msg = await Message.create({
        chatId: chat.id,
        senderId: trainer.id,
        content: chatMessage.trim(),
        aiGenerated: false,
      })
      await msg.load('sender', (q) => q.select('id', 'fullName', 'email'))

      messageId = msg.id

      emitter.emit('chat:new_message', { chatId: chat.id, message: msg.serialize() })
      emitter.emit('push:message', {
        senderName: `Тренер ${trainer.fullName ?? trainer.email}`,
        content: chatMessage.trim().slice(0, 100),
        recipientIds: [athleteId],
        url: '/dialogs',
      })
    } catch {
      messageError = 'Не удалось отправить сообщение'
    }

    return response.ok({
      success: true,
      data: { messageId, chatId, messageError },
    })
  }

  /**
   * DELETE /trainer/copilot/week-plan?athleteId=X&weekStart=Y
   * Удаляет все тренировки недели для атлета (откат плана)
   */
  async cancelWeekPlan({ auth, request, response }: HttpContext) {
    const trainer = auth.user!
    const athleteId = Number(request.input('athleteId'))
    const weekStart = getWeekStart(request.input('weekStart'))

    if (!athleteId) {
      return response.badRequest({ message: 'athleteId обязателен' })
    }

    const isActive = await TrainerAthlete.isActiveBinding(trainer.id, athleteId)
    if (!isActive) {
      return response.forbidden({ message: 'Нет доступа к этому атлету' })
    }

    const weekStartDt = DateTime.fromISO(weekStart)
    const weekEndDt = weekStartDt.plus({ days: 6 })

    const scheduled = await ScheduledWorkout.query()
      .where('trainerId', trainer.id)
      .where((q) => {
        q.whereRaw(`assigned_to::text like ?`, [`%"id":${athleteId}%`]).orWhereRaw(
          `assigned_to::text like ?`,
          [`%"id": ${athleteId}%`]
        )
      })
      .whereBetween('scheduledDate', [weekStartDt.toJSDate(), weekEndDt.toJSDate()])
      .where('status', 'scheduled')

    let deleted = 0
    for (const sw of scheduled) {
      await Workout.query().where('scheduledWorkoutId', sw.id).delete()
      await sw.delete()
      deleted++
    }

    return response.ok({ success: true, data: { deleted } })
  }
}
