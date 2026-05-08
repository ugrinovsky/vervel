import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { CopilotInsightsService } from '#services/CopilotInsightsService'
import { AthleteCopilotPlanService } from '#services/AthleteCopilotPlanService'
import { COLD_START_MIN_WORKOUTS } from '#services/CopilotSharedRules'
import TrainerAthlete from '#models/trainer_athlete'
import ScheduledWorkout from '#models/scheduled_workout'
import WorkoutDraft from '#models/workout_draft'
import Chat from '#models/chat'
import Message from '#models/message'
import emitter from '@adonisjs/core/services/emitter'
import { isRecord, type JsonObject } from '#utils/type_guards'

function getWeekStart(input: string | undefined): string {
  const dt = input ? DateTime.fromISO(input) : DateTime.now()
  return dt.startOf('week').toISODate() ?? dt.startOf('week').toFormat('yyyy-LL-dd')
}

export default class AthleteCopilotController {
  /**
   * GET /athlete/copilot/week?weekStart=YYYY-MM-DD
   * Основной endpoint: план на неделю + инсайты + мета
   */
  async week({ auth, request, response }: HttpContext) {
    const athlete = auth.user!
    const weekStart = getWeekStart(request.input('weekStart'))

    // Определяем режим: solo или with_coach
    const trainerBinding = await TrainerAthlete.query()
      .where('athleteId', athlete.id)
      .where('status', 'active')
      .first()

    const trainerId = trainerBinding?.trainerId ?? null
    const mode = trainerId ? 'with_coach' : 'solo'
    const canSendToCoach = !!trainerId

    // Собираем инсайты
    const insights = await CopilotInsightsService.collect(athlete.id)

    // Cold start — возвращаем заглушку
    if (insights.coldStart) {
      return response.ok({
        success: true,
        data: {
          todaySuggestion: null,
          weekItems: [],
          explain: [],
          meta: {
            mode,
            coldStart: true,
            canSendToCoach,
            workoutFrequency: 3,
            message: `Добавьте ${COLD_START_MIN_WORKOUTS} первые тренировки — Copilot начнёт адаптировать план под вас`,
          },
        },
      })
    }

    // Частота тренировок из настроек
    const prefs = athlete.clientPreferences as Record<string, unknown> | null
    const workoutFrequency = Math.min(Math.max(Number(prefs?.workoutFrequency ?? 3), 1), 5)

    // Строим план
    const plan = await AthleteCopilotPlanService.build({
      athleteId: athlete.id,
      trainerId,
      weekStart,
      workoutFrequency,
      insights,
    })

    return response.ok({
      success: true,
      data: {
        ...plan,
        meta: {
          mode,
          coldStart: false,
          canSendToCoach,
          workoutFrequency,
        },
      },
    })
  }

  /**
   * POST /athlete/copilot/start
   * Создаёт/обновляет WorkoutDraft для немедленного старта
   */
  async start({ auth, request, response }: HttpContext) {
    const athlete = auth.user!

    const {
      date,
      scheduledWorkoutId,
      durationMin,
      mode: envMode,
    } = request.only(['date', 'scheduledWorkoutId', 'durationMin', 'mode'])

    let draftPayload: JsonObject

    const asJsonObjectArray = (value: unknown): JsonObject[] => {
      if (!Array.isArray(value)) return []
      return value.filter((v): v is JsonObject => isRecord(v))
    }

    if (scheduledWorkoutId) {
      // Берём данные из тренерского назначения
      const trainerBinding = await TrainerAthlete.query()
        .where('athleteId', athlete.id)
        .where('status', 'active')
        .first()

      const sw = await ScheduledWorkout.query()
        .where('id', scheduledWorkoutId)
        .where(trainerBinding ? 'trainerId' : 'trainerId', trainerBinding?.trainerId ?? 0)
        .first()

      if (!sw) {
        return response.notFound({ message: 'Назначение не найдено' })
      }

      const wd: Record<string, unknown> = isRecord(sw.workoutData) ? sw.workoutData : {}
      draftPayload = {
        type: typeof wd.type === 'string' ? wd.type : 'bodybuilding',
        exercises: asJsonObjectArray(wd.exercises),
        notes: `Тренировка от тренера · ${new Date(date ?? sw.scheduledDate.toString()).toLocaleDateString('ru-RU')}`,
        meta: {
          copilot: true,
          source: 'trainer',
          scheduledWorkoutId,
          mode: envMode ?? 'gym',
          durationMin: durationMin ?? null,
        },
      }
    } else {
      // Строим черновик из copilot-рекомендации
      const insights = await CopilotInsightsService.collect(athlete.id)
      const trainerBinding = await TrainerAthlete.query()
        .where('athleteId', athlete.id)
        .where('status', 'active')
        .first()

      const weekStart = (date ? DateTime.fromISO(date) : DateTime.now())
        .startOf('week')
        .toISODate()!

      const prefs = athlete.clientPreferences as Record<string, unknown> | null
      const workoutFrequency = Math.min(Math.max(Number(prefs?.workoutFrequency ?? 3), 1), 5)

      const plan = await AthleteCopilotPlanService.build({
        athleteId: athlete.id,
        trainerId: trainerBinding?.trainerId ?? null,
        weekStart,
        workoutFrequency,
        insights,
      })

      const todaySuggestion = plan.todaySuggestion
      const wd = todaySuggestion?.draftWorkoutData

      draftPayload = {
        type: wd?.type ?? 'bodybuilding',
        exercises: asJsonObjectArray(wd?.exercises),
        notes: wd?.notes ?? '',
        meta: {
          copilot: true,
          source: 'copilot',
          mode: envMode ?? 'gym',
          durationMin: durationMin ?? null,
        },
      }
    }

    await WorkoutDraft.updateOrCreate({ userId: athlete.id }, { payload: draftPayload })

    return response.ok({
      success: true,
      data: { draft: draftPayload, redirectTo: '/workouts/new' },
    })
  }

  /**
   * POST /athlete/copilot/send-to-coach
   * Отправляет черновик плана тренеру в чат
   */
  async sendToCoach({ auth, request, response }: HttpContext) {
    const athlete = auth.user!

    const trainerBinding = await TrainerAthlete.query()
      .where('athleteId', athlete.id)
      .where('status', 'active')
      .first()

    if (!trainerBinding?.trainerId) {
      return response.forbidden({ message: 'У вас нет активного тренера' })
    }

    const { weekStart, items, customMessage } = request.only([
      'weekStart',
      'items',
      'customMessage',
    ])

    // Формируем текст сообщения
    let messageText: string
    if (customMessage && typeof customMessage === 'string' && customMessage.trim().length > 0) {
      messageText = customMessage.trim()
    } else {
      const weekLabel = weekStart
        ? new Date(weekStart).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
        : 'текущей недели'

      const planLines = Array.isArray(items)
        ? items
            .map((item: { date: string; title: string }) => {
              const d = new Date(item.date).toLocaleDateString('ru-RU', {
                weekday: 'short',
                day: 'numeric',
              })
              return `• ${d} — ${item.title}`
            })
            .join('\n')
        : ''

      messageText = `[Copilot] Предлагаю план на неделю с ${weekLabel}:\n${planLines}\n\nПодтвердите или скорректируйте.`
    }

    const chat = await Chat.findOrCreatePersonal(trainerBinding.trainerId, athlete.id)

    const msg = await Message.create({
      chatId: chat.id,
      senderId: athlete.id,
      content: messageText,
      aiGenerated: false,
    })
    await msg.load('sender', (q) => q.select('id', 'fullName', 'email'))

    emitter.emit('chat:new_message', { chatId: chat.id, message: msg.serialize() })
    emitter.emit('push:message', {
      senderName: athlete.fullName ?? 'Атлет',
      content: messageText.slice(0, 100),
      recipientIds: [trainerBinding.trainerId],
      url: '/dialogs',
    })

    return response.created({
      success: true,
      data: { chatId: chat.id, messageId: msg.id },
    })
  }
}
