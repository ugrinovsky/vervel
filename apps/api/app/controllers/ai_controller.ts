import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import limiter from '@adonisjs/limiter/services/main'
import vine from '@vinejs/vine'
import { YandexAiService, type AiWorkoutResult, type AiRecognizedWorkoutResult } from '#services/YandexAiService'
import { AiBalanceService, InsufficientBalanceError } from '#services/AiBalanceService'
import { ExerciseCatalog, type CatalogExercise } from '#services/ExerciseCatalog'
import { tokenizeForMatch, tokenSubsetOverlap } from '#services/exercise_match_helpers'
import AchievementService from '#services/AchievementService'
import Workout from '#models/workout'
import { WorkoutCalculator } from '#services/WorkoutCalculator'
import { aiExercisesToWorkoutExercises } from '#services/WorkoutConverter'

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
        name: vine.string().optional(),
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
        zones: vine.array(vine.string()).optional(),
        bodyweight: vine.boolean().optional(),
        duration: vine.number().optional(),
        rounds: vine.number().optional(),
        wodType: vine.enum(['amrap', 'fortime', 'emom', 'tabata'] as const).optional(),
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
   * Атлет: загружает фото → проверка баланса → AI распознаёт (без матчингa к каталогу)
   */
  async recognizeWorkout({ auth, request, response }: HttpContext) {
    if (!YandexAiService.isEnabled()) {
      return response.forbidden({ message: 'AI-функция временно недоступна' })
    }

    const data = await request.validateUsing(recognizeValidator)
    const userId = auth.user!.id
    const cost = AiBalanceService.COST_RECOGNIZE

    if (!(await this.chargeOrFail(userId, cost, 'Распознавание тренировки по фото', response))) return

    logger.info({ userId, mimeType: data.mimeType, base64Kb: Math.round(data.imageBase64.length / 1024) }, 'ai:recognize start')
    try {
      const result = await YandexAiService.recognizeFromImage(data.imageBase64, data.mimeType)
      logger.info({ userId, exerciseCount: result.exercises.length }, 'ai:recognize ok')
      // Тип тренировки выбирает пользователь вручную.
      // Матчинг к каталогу отключён, чтобы не было "рандомных" подмен упражнений.
      const out: AiRecognizedWorkoutResult = { workoutType: null, exercises: result.exercises, notes: result.notes }
      return response.ok({ data: out })
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

    if (!(await this.chargeOrFail(userId, cost, 'Генерация тренировки AI', response))) return

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

    if (!isFree && !(await this.chargeOrFail(userId, cost, 'Разбор программы тренировки через AI', response))) return

    try {
      const result = await YandexAiService.parseWorkoutNotes(workout.notes)
      const matched = matchExercisesToCatalog(result)
      const workoutExercises = aiExercisesToWorkoutExercises(matched.exercises, matched.workoutType)

      // Проверка качества: дубликаты или слишком мало упражнений
      const uniqueIds = new Set(workoutExercises.map((e) => e.exerciseId))
      const hasDuplicates = uniqueIds.size < workoutExercises.length
      const tooFew = workoutExercises.length === 0

      // Превью: имена из каталога + данные подходов
      const catalogMap = ExerciseCatalog.getIdToTitleMap()
      const previewItems = workoutExercises.map((ex) => {
        const allSets = ex.sets ?? []
        const weights = allSets.map((s) => s.weight).filter((w): w is number => w != null)
        const weightMin = weights.length ? Math.min(...weights) : undefined
        const weightMax = weights.length ? Math.max(...weights) : undefined
        const isCustom = ex.exerciseId.startsWith('custom:')
        return {
          exerciseId: ex.exerciseId,
          // В UI показываем человеческое имя, а не internal id custom:*
          name: catalogMap.get(ex.exerciseId) ?? (isCustom ? ex.name : ex.exerciseId.replace(/_/g, ' ')),
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

    if (!isFree && !(await this.chargeOrFail(userId, cost, 'Разбор программы тренировки через AI', response))) return

    try {
      // Важно: "распознать по тексту" должен работать так же, как распознавание по фото (после OCR),
      // иначе модель начинает "придумывать" упражнения и терять подходы/веса.
      const result = await YandexAiService.parseWorkoutTextLikeOcr(notes)
      // Тип тренировки пользователь выбирает вручную — AI не должен проставлять его автоматически.
      // Для превью и сетов берём силовой формат (веса/повторы) по умолчанию.
      const workoutExercises = aiExercisesToWorkoutExercises(result.exercises, 'bodybuilding')

      const uniqueIds = new Set(workoutExercises.map((e) => e.exerciseId))
      const hasDuplicates = uniqueIds.size < workoutExercises.length
      const tooFew = workoutExercises.length === 0

      const catalogMap = ExerciseCatalog.getIdToTitleMap()
      const previewItems = workoutExercises.map((ex) => {
        const allSets = ex.sets ?? []
        const weights = allSets.map((s) => s.weight).filter((w): w is number => w != null)
        const weightMin = weights.length ? Math.min(...weights) : undefined
        const weightMax = weights.length ? Math.max(...weights) : undefined
        return {
          exerciseId: ex.exerciseId,
          // Матчинг отключён: показываем распознанное имя.
          name: catalogMap.get(ex.exerciseId) ?? ex.name,
          sets: allSets.length,
          reps: allSets[0]?.reps,
          weight: weightMin,
          weightMax: weightMax !== weightMin ? weightMax : undefined,
        }
      })

      const balance = await AiBalanceService.getBalance(userId)
      return response.ok({
        workoutType: null,
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
      zonesLoadAbs: calculated.zonesLoadAbs,
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
        suggestStandardLinks: AiBalanceService.COST_SUGGEST_STANDARD_LINKS,
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

    // Rate limit: 30 chat requests per user per hour
    const chatLimit = limiter.use({ requests: 30, duration: '1 hour' })
    const allowed = await chatLimit.attempt(`ai_chat_${userId}`, async () => true)
    if (allowed === null) {
      return response.tooManyRequests({ message: 'Слишком много запросов. Попробуйте позже.' })
    }

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
          return response.paymentRequired({
            message: `Недостаточно средств для оплаты ответа`,
            balance: chargeErr.balance,
            required: cost,
          })
        }
        throw chargeErr
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

  private async chargeOrFail(
    userId: number,
    cost: number,
    description: string,
    response: HttpContext['response']
  ): Promise<boolean> {
    try {
      await AiBalanceService.charge(userId, cost, description)
      return true
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        response.paymentRequired({
          message: `Недостаточно средств. Баланс: ${err.balance}₽, требуется: ${err.required}₽`,
          balance: err.balance,
          required: err.required,
        })
        return false
      }
      throw err
    }
  }
}

const TOKEN_OVERLAP_MIN = 0.7
const KW_MIN_FOR_NAME_INCLUDES_KW = 4

function bestMatchByTitleTokenOverlap(
  nameTokens: string[],
  catalog: CatalogExercise[]
): CatalogExercise | undefined {
  if (nameTokens.length < 2) return undefined
  let best: { ex: CatalogExercise; score: number } | undefined
  for (const ex of catalog) {
    const titleTokens = tokenizeForMatch(ex.title)
    if (titleTokens.length === 0) continue
    const forward = tokenSubsetOverlap(nameTokens, titleTokens)
    const backward = tokenSubsetOverlap(titleTokens, nameTokens)
    const score = Math.max(forward, backward)
    if (score >= TOKEN_OVERLAP_MIN && (!best || score > best.score)) {
      best = { ex, score }
    }
  }
  return best?.ex
}

function aiNameSimilarity(a: string, b: string): number {
  const aTokens = tokenizeForMatch(a)
  const bTokens = tokenizeForMatch(b)
  if (aTokens.length === 0 || bTokens.length === 0) return 0
  const forward = tokenSubsetOverlap(aTokens, bTokens)
  const backward = tokenSubsetOverlap(bTokens, aTokens)
  return Math.max(forward, backward)
}

/**
 * Матчит упражнения из AI-ответа к реальным ID каталога.
 * Детерминированные шаги + пересечение токенов с русским title из каталога.
 * Всё что не матчится → custom: + AI-зоны для аналитики.
 */
function matchExercisesToCatalog(result: AiWorkoutResult): AiWorkoutResult {
  const catalog = ExerciseCatalog.all()

  const exercises = result.exercises.map((aiEx) => {
    const nameLower = aiEx.name.trim().toLowerCase()
    const nameTokens = tokenizeForMatch(aiEx.name)

    // 1. Точное совпадение по нормализованному ID
    let found = catalog.find((ex) => ex.id.replace(/_/g, ' ').toLowerCase() === nameLower)

    // 2. Substring: ID содержит AI-имя с coverage ≥ 0.6, или AI-имя содержит длинный ID (≥ 3 слов)
    if (!found) {
      found = catalog.find((ex) => {
        const idPhrase = ex.id.replace(/_/g, ' ').toLowerCase()
        const idWordCount = idPhrase.split(' ').filter((w) => w !== '-').length
        const nameWordCount = nameLower.split(/\s+/).filter(Boolean).length
        return (idPhrase.includes(nameLower) && nameWordCount / idWordCount >= 0.6)
          || (idWordCount >= 3 && nameLower.includes(idPhrase))
      })
    }

    // 3. Точное совпадение с keyword (в т.ч. полное русское название из JSON)
    if (!found) {
      found = catalog.find((ex) =>
        (ex.keywords ?? []).some((kw) => kw.trim().toLowerCase() === nameLower)
      )
    }

    // 4. Keyword содержит имя с coverage ≥ 0.6, или имя содержит достаточно длинный keyword
    if (!found) {
      found = catalog.find((ex) =>
        (ex.keywords ?? []).some((kw) => {
          const kwLower = kw.trim().toLowerCase()
          if (kwLower.length < 2) return false
          if (kwLower.includes(nameLower)) {
            const kwWordCount = kwLower.split(/\s+/).filter((w) => w !== '-').length || 1
            const nameWordCount = nameLower.split(/\s+/).filter(Boolean).length
            return nameWordCount / kwWordCount >= 0.6
          }
          if (nameLower.includes(kwLower) && kwLower.length >= KW_MIN_FOR_NAME_INCLUDES_KW) return true
          return false
        })
      )
    }

    // 5. Token overlap с title каталога (≥2 токена в AI-имени — меньше ложных «пресс» и т.п.)
    if (!found) {
      found = bestMatchByTitleTokenOverlap(nameTokens, catalog)
    }

    if (found) {
      // Safety: avoid "random" mismatches (e.g. matching by a single generic token like "тяга/сгибания").
      // If the match is not obviously close by token similarity, keep it as custom:* instead of polluting data.
      const similarity = aiNameSimilarity(aiEx.name, found.title)
      if (similarity < 0.6) {
        logger.warn(
          { name: aiEx.name, candidateId: found.id, candidateTitle: found.title, similarity },
          'ai:match weak similarity — will keep as custom'
        )
        return aiEx
      }
      logger.info({ name: aiEx.name, exerciseId: found.id }, 'ai:match hit')
      return { ...aiEx, exerciseId: found.id }
    }

    logger.info({ name: aiEx.name }, 'ai:match miss — will use custom: prefix')
    return aiEx
  })

  // Guardrail: avoid merging two different movements into one catalog id inside a single AI result.
  // If duplicates happen but names are not similar enough, drop exerciseId for the weaker entries
  // so they become custom:* and won't contaminate strength log / analytics.
  const byId = new Map<string, number>()
  for (let i = 0; i < exercises.length; i++) {
    const id = exercises[i]?.exerciseId
    if (!id) continue
    if (!byId.has(id)) {
      byId.set(id, i)
      continue
    }
    const firstIdx = byId.get(id)!
    const first = exercises[firstIdx]!
    const cur = exercises[i]!
    const sim = aiNameSimilarity(first.name, cur.name)
    if (sim < 0.6) {
      logger.warn(
        { exerciseId: id, a: first.name, b: cur.name, similarity: sim },
        'ai:match duplicate id with low similarity — downgrading to custom'
      )
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { exerciseId: _drop, ...rest } = cur as any
      exercises[i] = rest
    }
  }

  return { ...result, exercises }
}

