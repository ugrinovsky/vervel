import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { YandexAiService, type AiExercise, type AiWorkoutResult } from '#services/YandexAiService'
import { AiBalanceService, InsufficientBalanceError } from '#services/AiBalanceService'
import { ExerciseCatalog } from '#services/ExerciseCatalog'
import AchievementService from '#services/AchievementService'
import { token_set_ratio } from 'fuzzball'
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
      // Инжектируем только релевантные упражнения каталога (по зонам мышц из заметок).
      // ~50–120 упражнений вместо 736 — модель не захлёбывается, AI выбирает точные названия.
      const catalogTitles = selectCatalogForNotes(workout.notes)

      const result = await YandexAiService.parseWorkoutNotes(workout.notes, catalogTitles)
      const matched = await matchExercisesToCatalog(result)
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
        parseNotes: AiBalanceService.COST_PARSE_NOTES,
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
  return exercises
    .filter((ex) => !!ex.exerciseId)
    .map((ex) => {
      if (workoutType === 'cardio') {
        const set: WorkoutSet = { id: crypto.randomUUID(), time: (ex.duration ?? 20) * 60 }
        return {
          exerciseId: ex.exerciseId!,
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
        exerciseId: ex.exerciseId!,
        type: workoutType === 'crossfit' ? ('wod' as const) : ('strength' as const),
        sets,
        blockId: ex.supersetGroup ?? undefined,
      }
    })
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

/**
 * Выбирает подмножество каталога для инъекции в промпт AI.
 * Определяет зоны мышц по ключевым словам из заметок (русский текст),
 * возвращает только релевантные упражнения (~50–120 вместо 736).
 * Предотвращает перегрузку YandexGPT Lite большим контекстом.
 */
function selectCatalogForNotes(notes: string): string[] {
  const catalog = ExerciseCatalog.all().filter((ex) => ex.category !== 'cardio')
  const n = notes.toLowerCase()

  const detectedZones = new Set<string>()

  // Ключевые слова на русском → зоны каталога
  const rules: Array<[string[], string[]]> = [
    [['нога', 'ног', 'голен', 'присед', 'выпад', 'жим ногами', 'гакк', 'квадриц'], ['legs']],
    [['икр', 'носк', 'голеностоп'], ['calves']],
    [['ягодиц', 'мостик', 'разгибани бедр', 'отведени бедр', 'жопомах'], ['glutes']],
    [['бедр', 'сведени', 'приводящ'], ['legs', 'glutes']],
    [['спина', 'спин', 'широчайш', 'трапеци', 'поясниц', 'тяга', 'становая'], ['back']],
    [['грудь', 'груд', 'жим лёж', 'жим штанг', 'отжима'], ['chests']],
    [['плечи', 'плеч', 'дельт', 'жим стоя', 'махи', 'разводк'], ['shoulders']],
    [['бицепс', 'подъём на бицепс', 'сгибани рук'], ['biceps']],
    [['трицепс', 'разгибани рук', 'жим узким'], ['triceps']],
    [['пресс', 'живот', 'скручиван', 'планк'], ['core', 'obliques']],
    [['предплечь', 'запястье'], ['forearms']],
  ]

  for (const [keywords, zones] of rules) {
    if (keywords.some((kw) => n.includes(kw))) {
      for (const z of zones) detectedZones.add(z)
    }
  }

  if (detectedZones.size === 0) {
    return catalog.slice(0, 200).map((ex) => ex.title)
  }

  return catalog.filter((ex) => ex.zones.some((z) => detectedZones.has(z))).map((ex) => ex.title)
}
