import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { YandexAiService, type AiExercise, type AiWorkoutResult } from '#services/YandexAiService'
import Exercise from '#models/exercise'

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

export default class AiController {
  /**
   * POST /ai/recognize-workout
   * Атлет: загружает фото → AI распознаёт → матчинг к каталогу → результат
   */
  async recognizeWorkout({ request, response }: HttpContext) {
    if (!YandexAiService.isEnabled()) {
      return response.forbidden({ message: 'AI-функция временно недоступна' })
    }

    const data = await request.validateUsing(recognizeValidator)

    try {
      const result = await YandexAiService.recognizeFromImage(data.imageBase64, data.mimeType)
      const matched = await matchExercisesToCatalog(result)
      return response.ok({ data: matched })
    } catch (err: any) {
      return response.internalServerError({
        message: 'Не удалось распознать тренировку',
        detail: err?.message,
      })
    }
  }

  /**
   * POST /ai/generate-workout
   * Тренер: текстовый запрос → AI генерирует → матчинг к каталогу → результат
   */
  async generateWorkout({ request, response }: HttpContext) {
    if (!YandexAiService.isEnabled()) {
      return response.forbidden({ message: 'AI-функция временно недоступна' })
    }

    const data = await request.validateUsing(generateValidator)

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
}

/**
 * Матчит упражнения из AI-ответа к реальным ID каталога.
 * Порядок поиска:
 *   1. Точное совпадение title (без учёта регистра)
 *   2. title содержит имя из AI (или наоборот)
 *   3. Любое keyword совпадает с именем из AI
 *
 * Если совпадение найдено — заполняет exerciseId, иначе оставляет undefined
 * (тренировка запишется, но зоны будут пустыми).
 */
async function matchExercisesToCatalog(result: AiWorkoutResult): Promise<AiWorkoutResult> {
  const catalog = await Exercise.all()

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

    return found ? { ...aiEx, exerciseId: found.id } : aiEx
  })

  return { ...result, exercises: matched }
}
