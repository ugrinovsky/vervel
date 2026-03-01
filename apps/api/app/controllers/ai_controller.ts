import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { YandexAiService, type AiExercise, type AiWorkoutResult } from '#services/YandexAiService'
import { AiBalanceService, InsufficientBalanceError } from '#services/AiBalanceService'
import { ExerciseCatalog } from '#services/ExerciseCatalog'
import { token_set_ratio } from 'fuzzball'

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

    try {
      const result = await YandexAiService.recognizeFromImage(data.imageBase64, data.mimeType)
      const matched = await matchExercisesToCatalog(result)
      return response.ok({ data: matched })
    } catch (err: any) {
      // Возвращаем средства при ошибке AI
      // (упрощённая логика — без refund для Phase 1)
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
      const matched = await matchExercisesToCatalog(result)
      return response.ok({ data: matched })
    } catch (err: any) {
      return response.internalServerError({
        message: 'Не удалось сгенерировать тренировку',
        detail: err?.message,
      })
    }
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
 * Порог fuzz.token_set_ratio [0..100].
 * 72 ≈ "barbell bench press" vs "bench press" (~80% overlap).
 * AI возвращает английские имена, каталог — тоже английский.
 */
const FUZZY_THRESHOLD = 72

/**
 * Матчит упражнения из AI-ответа к реальным ID каталога.
 * AI возвращает английские имена (см. промпт), каталог — тоже английский.
 *
 * Порядок поиска (от точного к нечёткому):
 *   1. Точное совпадение title (без учёта регистра)
 *   2. title содержит имя из AI (или наоборот)
 *   3. Любое keyword содержит имя из AI (или наоборот)
 *   4. fuzz.token_set_ratio по title + keywords
 *
 * Если совпадение найдено — заполняет exerciseId, иначе оставляет undefined
 * (тренировка запишется, но зоны будут пустыми).
 */
async function matchExercisesToCatalog(result: AiWorkoutResult): Promise<AiWorkoutResult> {
  const catalog = ExerciseCatalog.all()

  const matched: AiExercise[] = result.exercises.map((aiEx) => {
    const nameLower = aiEx.name.toLowerCase()

    // 1. Точное совпадение title
    let found = catalog.find((ex) => ex.title.toLowerCase() === nameLower)

    // 2. Частичное совпадение (AI-имя содержится в title или наоборот)
    if (!found) {
      found = catalog.find(
        (ex) =>
          ex.title.toLowerCase().includes(nameLower) ||
          nameLower.includes(ex.title.toLowerCase())
      )
    }

    // 3. Совпадение по keywords
    if (!found) {
      found = catalog.find((ex) =>
        (ex.keywords ?? []).some(
          (kw) => kw.toLowerCase().includes(nameLower) || nameLower.includes(kw.toLowerCase())
        )
      )
    }

    // 4. Нечёткий поиск: token_set_ratio по title + keywords.
    // token_set_ratio сортирует токены перед сравнением — устойчив к порядку слов.
    if (!found) {
      let bestScore = 0
      let bestMatch: (typeof catalog)[number] | undefined

      for (const ex of catalog) {
        let score = token_set_ratio(nameLower, ex.title.toLowerCase())

        for (const kw of ex.keywords ?? []) {
          const kwScore = token_set_ratio(nameLower, kw.toLowerCase())
          if (kwScore > score) score = kwScore
        }

        if (score > bestScore) {
          bestScore = score
          bestMatch = ex
        }
      }

      if (bestScore >= FUZZY_THRESHOLD) {
        found = bestMatch
      }
    }

    return found ? { ...aiEx, exerciseId: found.id } : aiEx
  })

  return { ...result, exercises: matched }
}
