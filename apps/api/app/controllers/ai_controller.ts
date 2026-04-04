import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import vine from '@vinejs/vine'
import { YandexAiService, type AiExercise, type AiWorkoutResult } from '#services/YandexAiService'
import { AiBalanceService, InsufficientBalanceError } from '#services/AiBalanceService'
import { ExerciseCatalog } from '#services/ExerciseCatalog'
import AchievementService from '#services/AchievementService'
import Workout, { type WorkoutExercise, type WorkoutSet } from '#models/workout'
import { WorkoutCalculator } from '#services/WorkoutCalculator'

const recognizeValidator = vine.compile(
  vine.object({
    imageBase64: vine.string().trim().minLength(100),
    mimeType: vine.enum(['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  })
)

const generateValidator = vine.compile(
  vine.object({
    prompt: vine.string().trim().minLength(3).maxLength(500),
  })
)

const parseWorkoutNotesValidator = vine.compile(
  vine.object({
    workoutId: vine.number().positive(),
  })
)

const parseNotesTextValidator = vine.compile(
  vine.object({
    notes: vine.string().trim().minLength(5).maxLength(5000),
  })
)

const applyParsedWorkoutValidator = vine.compile(
  vine.object({
    workoutId: vine.number().positive(),
    workoutType: vine.enum(['crossfit', 'bodybuilding', 'cardio'] as const),
    exercises: vine.array(
      vine.object({
        exerciseId: vine.string(),
        type: vine.enum(['strength', 'cardio', 'wod'] as const),
        sets: vine
          .array(
            vine.object({
              id: vine.string(),
              reps: vine.number().optional(),
              weight: vine.number().optional(),
              time: vine.number().optional(),
              distance: vine.number().optional(),
            })
          )
          .optional(),
        blockId: vine.string().optional(),
      })
    ),
  })
)

const chatValidator = vine.compile(
  vine.object({
    messages: vine
      .array(
        vine.object({
          role: vine.enum(['user', 'assistant'] as const),
          content: vine.string().trim().minLength(1).maxLength(2000),
        })
      )
      .minLength(1)
      .maxLength(20),
  })
)

export default class AiController {
  /**
   * POST /ai/recognize-workout
   * Атлет: загружает фото → проверка баланса → AI распознаёт → матчинг к каталогу
   */
  async recognizeWorkout({ auth, request, response }: HttpContext) {
    if (!YandexAiService.isEnabled()) {
      return response.forbidden({ message: 'AI-функция временно недоступна' })
    }

    const data = await request.validateUsing(recognizeValidator)
    const userId = auth.user!.id
    const cost = AiBalanceService.COST_RECOGNIZE

    try {
      await AiBalanceService.charge(userId, cost, 'Распознавание тренировки по фото')
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        return response.paymentRequired({
          message: `Недостаточно средств. Баланс: ${err.balance}₽, требуется: ${err.required}₽`,
          balance: err.balance,
          required: err.required,
        })
      }
      throw err
    }

    logger.info({ userId, mimeType: data.mimeType, base64Kb: Math.round(data.imageBase64.length / 1024) }, 'ai:recognize start')
    try {
      const result = await YandexAiService.recognizeFromImage(data.imageBase64, data.mimeType)
      logger.info({ userId, exerciseCount: result.exercises.length, workoutType: result.workoutType }, 'ai:recognize ok')
      const matched = matchExercisesToCatalog(result)
      return response.ok({ data: matched })
    } catch (err: any) {
      logger.error({ userId, err: err?.message }, 'ai:recognize failed')
      return response.internalServerError({
        message: 'Не удалось распознать тренировку',
        detail: err?.message,
      })
    }
  }

  /**
   * POST /ai/generate-workout
   * Тренер: текстовый запрос → проверка баланса → AI генерирует → матчинг к каталогу
   */
  async generateWorkout({ auth, request, response }: HttpContext) {
    if (!YandexAiService.isEnabled()) {
      return response.forbidden({ message: 'AI-функция временно недоступна' })
    }

    const data = await request.validateUsing(generateValidator)
    const userId = auth.user!.id
    const cost = AiBalanceService.COST_GENERATE

    try {
      await AiBalanceService.charge(userId, cost, 'Генерация тренировки AI')
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        return response.paymentRequired({
          message: `Недостаточно средств. Баланс: ${err.balance}₽, требуется: ${err.required}₽`,
          balance: err.balance,
          required: err.required,
        })
      }
      throw err
    }

    try {
      const result = await YandexAiService.generateFromText(data.prompt)
      const matched = matchExercisesToCatalog(result)
      return response.ok({ data: matched })
    } catch (err: any) {
      return response.internalServerError({
        message: 'Не удалось сгенерировать тренировку',
        detail: err?.message,
      })
    }
  }

  /**
   * POST /ai/parse-workout-notes
   * Атлет: парсит заметки через AI и возвращает превью — НЕ сохраняет.
   * Списывает баланс. После подтверждения атлет вызывает /ai/apply-parsed-workout.
   */
  async parseWorkoutNotes({ auth, request, response }: HttpContext) {
    if (!YandexAiService.isEnabled()) {
      return response.forbidden({ message: 'AI-функция временно недоступна' })
    }

    const { workoutId } = await request.validateUsing(parseWorkoutNotesValidator)
    const userId = auth.user!.id

    const workout = await Workout.query()
      .where('id', workoutId)
      .where('userId', userId)
      .firstOrFail()

    if (!workout.notes?.trim()) {
      return response.badRequest({ message: 'У тренировки нет заметок для парсинга' })
    }

    const isFree = auth.user!.aiNotesFree
    const cost = isFree ? 0 : AiBalanceService.COST_PARSE_NOTES

    if (!isFree) {
      try {
        await AiBalanceService.charge(userId, cost, 'Разбор программы тренировки через AI')
      } catch (err) {
        if (err instanceof InsufficientBalanceError) {
          return response.paymentRequired({
            message: `Недостаточно средств. Баланс: ${err.balance}₽, требуется: ${err.required}₽`,
            balance: err.balance,
            required: err.required,
          })
        }
        throw err
      }
    }

    try {
      const result = await YandexAiService.parseWorkoutNotes(workout.notes)
      const matched = matchExercisesToCatalog(result)
      const workoutExercises = aiExercisesToWorkoutExercises(matched.exercises, matched.workoutType)

      // Проверка качества: дубликаты или слишком мало упражнений
      const uniqueIds = new Set(workoutExercises.map((e) => e.exerciseId))
      const hasDuplicates = uniqueIds.size < workoutExercises.length
      const tooFew = workoutExercises.length === 0

      // Превью: имена из каталога + данные подходов
      const catalog = ExerciseCatalog.all()
      const catalogMap = new Map(catalog.map((e) => [e.id, e.title]))
      const previewItems = workoutExercises.map((ex) => {
        const allSets = ex.sets ?? []
        const weights = allSets.map((s) => s.weight).filter((w): w is number => w != null)
        const weightMin = weights.length ? Math.min(...weights) : undefined
        const weightMax = weights.length ? Math.max(...weights) : undefined
        return {
          exerciseId: ex.exerciseId,
          name: catalogMap.get(ex.exerciseId) ?? ex.exerciseId.replace(/_/g, ' '),
          sets: allSets.length,
          reps: allSets[0]?.reps,
          weight: weightMin,
          weightMax: weightMax !== weightMin ? weightMax : undefined,
        }
      })

      const balance = await AiBalanceService.getBalance(userId)
      return response.ok({
        workoutType: matched.workoutType,
        previewItems,
        exercises: workoutExercises,
        warning: tooFew
          ? 'AI не нашёл ни одного упражнения в заметках'
          : hasDuplicates
            ? 'Некоторые упражнения определились как одинаковые — проверьте список перед сохранением'
            : null,
        balance,
      })
    } catch (err: any) {
      return response.internalServerError({
        message: 'Не удалось разобрать программу тренировки',
        detail: err?.message,
      })
    }
  }

  /**
   * POST /ai/parse-notes-text
   * Тренер: парсит произвольный текст (без workoutId) — для формы создания тренировки.
   * Списывает баланс. Возвращает превью для подтверждения.
   */
  async parseNotesText({ auth, request, response }: HttpContext) {
    if (!YandexAiService.isEnabled()) {
      return response.forbidden({ message: 'AI-функция временно недоступна' })
    }

    const { notes } = await request.validateUsing(parseNotesTextValidator)
    const userId = auth.user!.id

    const isFree = auth.user!.aiNotesFree
    const cost = isFree ? 0 : AiBalanceService.COST_PARSE_NOTES

    if (!isFree) {
      try {
        await AiBalanceService.charge(userId, cost, 'Разбор программы тренировки через AI')
      } catch (err) {
        if (err instanceof InsufficientBalanceError) {
          return response.paymentRequired({
            message: `Недостаточно средств. Баланс: ${err.balance}₽, требуется: ${err.required}₽`,
            balance: err.balance,
            required: err.required,
          })
        }
        throw err
      }
    }

    try {
      const result = await YandexAiService.parseWorkoutNotes(notes)
      const matched = matchExercisesToCatalog(result)
      const workoutExercises = aiExercisesToWorkoutExercises(matched.exercises, matched.workoutType)

      const uniqueIds = new Set(workoutExercises.map((e) => e.exerciseId))
      const hasDuplicates = uniqueIds.size < workoutExercises.length
      const tooFew = workoutExercises.length === 0

      const catalog = ExerciseCatalog.all()
      const catalogMap = new Map(catalog.map((e) => [e.id, e.title]))
      const previewItems = workoutExercises.map((ex) => {
        const allSets = ex.sets ?? []
        const weights = allSets.map((s) => s.weight).filter((w): w is number => w != null)
        const weightMin = weights.length ? Math.min(...weights) : undefined
        const weightMax = weights.length ? Math.max(...weights) : undefined
        return {
          exerciseId: ex.exerciseId,
          name: catalogMap.get(ex.exerciseId) ?? ex.exerciseId.replace(/_/g, ' '),
          sets: allSets.length,
          reps: allSets[0]?.reps,
          weight: weightMin,
          weightMax: weightMax !== weightMin ? weightMax : undefined,
        }
      })

      const balance = await AiBalanceService.getBalance(userId)
      return response.ok({
        workoutType: matched.workoutType,
        previewItems,
        exercises: workoutExercises,
        warning: tooFew
          ? 'AI не нашёл ни одного упражнения в заметках'
          : hasDuplicates
            ? 'Некоторые упражнения определились как одинаковые — проверьте список перед сохранением'
            : null,
        balance,
      })
    } catch (err: any) {
      return response.internalServerError({
        message: 'Не удалось разобрать программу тренировки',
        detail: err?.message,
      })
    }
  }

  /**
   * POST /ai/apply-parsed-workout
   * Атлет: сохраняет упражнения после подтверждения превью (без повторного списания).
   */
  async applyParsedWorkout({ auth, request, response }: HttpContext) {
    const { workoutId, workoutType, exercises } = await request.validateUsing(
      applyParsedWorkoutValidator
    )
    const userId = auth.user!.id

    const workout = await Workout.query()
      .where('id', workoutId)
      .where('userId', userId)
      .firstOrFail()

    const calculated = await WorkoutCalculator.calculateZoneLoads(exercises, workoutType)

    workout.merge({
      workoutType,
      exercises,
      zonesLoad: calculated.zonesLoad,
      totalIntensity: calculated.totalIntensity,
      totalVolume: calculated.totalVolume,
    })
    await workout.save()

    return response.ok({ data: workout })
  }

  /**
   * GET /ai/status
   */
  async status({ response }: HttpContext) {
    return response.ok({ enabled: YandexAiService.isEnabled() })
  }

  /**
   * GET /ai/balance
   * Текущий баланс и последние транзакции пользователя.
   */
  async balance({ auth, response }: HttpContext) {
    const userId = auth.user!.id
    const [balance, transactions] = await Promise.all([
      AiBalanceService.getBalance(userId),
      AiBalanceService.getTransactions(userId, 20),
    ])
    return response.ok({
      balance,
      costs: {
        generate: AiBalanceService.COST_GENERATE,
        recognize: AiBalanceService.COST_RECOGNIZE,
        parseNotes: auth.user!.aiNotesFree ? 0 : AiBalanceService.COST_PARSE_NOTES,
        chatMinCharge: AiBalanceService.CHAT_MIN_CHARGE,
      },
      transactions,
    })
  }

  /**
   * GET /ai/transactions
   * Постраничная история транзакций пользователя.
   */
  async transactions({ auth, request, response }: HttpContext) {
    const userId = auth.user!.id
    const limit = Math.min(Number(request.input('limit', 20)), 100)
    const offset = Number(request.input('offset', 0))
    const data = await AiBalanceService.getTransactions(userId, limit, offset)
    return response.ok({ success: true, data })
  }

  /**
   * POST /ai/chat
   * Универсальный AI-чат для атлетов и тренеров.
   * Стоимость рассчитывается по фактическим токенам × markup.
   * Возвращает reply, balance, cost (фактически списано).
   */
  async chat({ auth, request, response }: HttpContext) {
    if (!YandexAiService.isEnabled()) {
      return response.forbidden({ message: 'AI-функция временно недоступна' })
    }

    const data = await request.validateUsing(chatValidator)
    const userId = auth.user!.id

    // Pre-check: нужно хотя бы CHAT_MIN_CHARGE на балансе
    const currentBalance = await AiBalanceService.getBalance(userId)
    if (currentBalance < AiBalanceService.CHAT_MIN_CHARGE) {
      return response.paymentRequired({
        message: `Недостаточно средств. Баланс: ${currentBalance}₽, минимум: ${AiBalanceService.CHAT_MIN_CHARGE}₽`,
        balance: currentBalance,
        required: AiBalanceService.CHAT_MIN_CHARGE,
      })
    }

    try {
      const { reply, inputTokens, outputTokens } = await YandexAiService.chat(data.messages)
      const cost = AiBalanceService.calculateChatCost(inputTokens, outputTokens)

      let newBalance: number
      try {
        newBalance = await AiBalanceService.charge(
          userId,
          cost,
          `AI-чат (${inputTokens}+${outputTokens} токенов)`
        )
      } catch (chargeErr) {
        if (chargeErr instanceof InsufficientBalanceError) {
          newBalance = chargeErr.balance
        } else {
          throw chargeErr
        }
      }

      // Проверяем достижения (огрехи не должны ломать ответ)
      AchievementService.checkAndUnlockAchievements(userId).catch(() => {})

      return response.ok({ reply, balance: newBalance, cost })
    } catch (err: any) {
      return response.internalServerError({
        message: 'Не удалось получить ответ от AI',
        detail: err?.message,
      })
    }
  }
}

/**
 * Конвертирует AiExercise[] (после матчинга) в WorkoutExercise[] для сохранения в Workout.
 * Логика аналогична toWorkoutExercises в scheduled_workout_controller.
 */
function aiExercisesToWorkoutExercises(
  exercises: AiExercise[],
  workoutType: 'crossfit' | 'bodybuilding' | 'cardio'
): WorkoutExercise[] {
  return exercises.map((ex) => {
      // exerciseId обязателен для схемы — используем каталожный если нашли,
      // иначе "custom:<displayName>" (зоны = 0, но упражнение не теряется)
      const exerciseId = ex.exerciseId ?? `custom:${ex.displayName ?? ex.name}`
      const name = ex.displayName ?? ex.name

      const zones = ex.zones && ex.zones.length > 0 ? ex.zones : undefined

      if (workoutType === 'cardio') {
        const set: WorkoutSet = { id: crypto.randomUUID(), time: (ex.duration ?? 20) * 60 }
        return {
          exerciseId,
          name,
          zones,
          type: 'cardio' as const,
          sets: [set],
          blockId: ex.supersetGroup ?? undefined,
        }
      }
      const sets: WorkoutSet[] = ex.setData?.length
        ? ex.setData.map((s) => ({
            id: crypto.randomUUID(),
            reps: s.reps,
            weight: s.weight,
          }))
        : Array.from({ length: ex.sets ?? 3 }, () => ({
            id: crypto.randomUUID(),
            reps: ex.reps,
            weight: ex.weight,
          }))
      return {
        exerciseId,
        name,
        zones,
        type: workoutType === 'crossfit' ? ('wod' as const) : ('strength' as const),
        sets,
        blockId: ex.supersetGroup ?? undefined,
      }
    })
}

/**
 * Матчит упражнения из AI-ответа к реальным ID каталога.
 * Три шага — только детерминированные совпадения, без fuzzy и GPT.
 * Всё что не матчится → custom: + AI-зоны для аналитики.
 */
function matchExercisesToCatalog(result: AiWorkoutResult): AiWorkoutResult {
  const catalog = ExerciseCatalog.all()

  const exercises = result.exercises.map((aiEx) => {
    const nameLower = aiEx.name.toLowerCase()

    // 1. Точное совпадение по нормализованному ID
    let found = catalog.find((ex) => ex.id.replace(/_/g, ' ').toLowerCase() === nameLower)

    // 2. Substring: ID содержит AI-имя с coverage ≥ 0.6, или AI-имя содержит длинный ID (≥ 3 слов)
    if (!found) {
      found = catalog.find((ex) => {
        const idPhrase = ex.id.replace(/_/g, ' ').toLowerCase()
        const idWordCount = idPhrase.split(' ').filter((w) => w !== '-').length
        const nameWordCount = nameLower.split(' ').length
        return (idPhrase.includes(nameLower) && nameWordCount / idWordCount >= 0.6)
          || (idWordCount >= 3 && nameLower.includes(idPhrase))
      })
    }

    // 3. Keyword: любой keyword содержит AI-имя с coverage ≥ 0.6
    if (!found) {
      found = catalog.find((ex) =>
        (ex.keywords ?? []).some((kw) => {
          const kwLower = kw.toLowerCase()
          if (!kwLower.includes(nameLower)) return false
          const kwWordCount = kwLower.split(' ').filter((w) => w !== '-').length
          return nameLower.split(' ').length / kwWordCount >= 0.6
        })
      )
    }

    if (found) {
      logger.info({ name: aiEx.name, exerciseId: found.id }, 'ai:match hit')
      return { ...aiEx, exerciseId: found.id }
    }

    logger.info({ name: aiEx.name }, 'ai:match miss — will use custom: prefix')
    return aiEx
  })

  return { ...result, exercises }
}

