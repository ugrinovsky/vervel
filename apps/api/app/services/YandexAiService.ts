import env from '#start/env'

export interface AiExercise {
  name: string        // English name for catalog matching
  displayName: string // Russian name for display in UI
  sets: number
  reps?: number
  weight?: number
  duration?: number // секунды (кардио)
  notes?: string
  /** Заполняется после матчинга к каталогу упражнений (если нашли совпадение) */
  exerciseId?: string
}

export interface AiWorkoutResult {
  workoutType: 'crossfit' | 'bodybuilding' | 'cardio'
  exercises: AiExercise[]
  notes?: string
}

// Системный промпт для парсинга текста тренировки в JSON
const PARSE_SYSTEM_PROMPT = `You are a fitness assistant. You are given text recognized from a photo of a workout board or sheet. Parse it into strict JSON format.

Requirements:
1. Return only JSON, no surrounding text
2. Format: {"workoutType":"crossfit|bodybuilding|cardio","exercises":[{"name":"Barbell Bench Press","displayName":"Жим штанги лёжа","sets":3,"reps":10,"weight":80,"duration":null,"notes":null}],"notes":"general notes"}
3. weight — in kilograms, duration — in seconds
4. If a parameter is not specified — use null
5. Determine workout type from context (CrossFit = WOD/AMRAP/For Time, bodybuilding = isolation exercises, cardio = running/cycling/swimming)
6. "name" — standard English gym terminology for catalog matching (e.g. "Barbell Bench Press", "Back Squat", "Pull-Up", "Deadlift")
7. "displayName" — Russian name shown to the user (e.g. "Жим штанги лёжа", "Приседания со штангой", "Подтягивания", "Становая тяга"). For non-standard CrossFit exercises write the Russian transliteration or translation.
8. Interpret abbreviations: "5х10" = 5 sets of 10 reps, "x" or "×" = sets×reps
9. notes field — write in Russian for user readability`

// Системный промпт для AI-чата (фитнес-советник)
const CHAT_SYSTEM_PROMPT = `Ты — AI-помощник фитнес-приложения Vervel. Ты разбираешься в тренировках, питании, восстановлении и спортивной науке. Отвечай на русском языке. Давай конкретные, полезные советы. Если вопрос не связан с фитнесом или спортом — вежливо перенаправь разговор к теме тренировок. Будь дружелюбным и мотивирующим.`

// Системный промпт для генерации тренировки по текстовому описанию
const GENERATE_SYSTEM_PROMPT = `You are a professional fitness trainer. Generate a complete workout based on the description and return it in strict JSON format.

Requirements:
1. Return only JSON, no surrounding text
2. Format: {"workoutType":"crossfit|bodybuilding|cardio","exercises":[{"name":"Barbell Bench Press","displayName":"Жим штанги лёжа","sets":3,"reps":10,"weight":null,"duration":null,"notes":"техника в 1-2 предложения"}],"notes":"общие рекомендации"}
3. weight — in kilograms (null if not applicable), duration — in seconds (null if not applicable)
4. Generate a realistic workout with correct volume and intensity
5. Take into account fitness level if specified: beginner, intermediate, advanced
6. "name" — standard English gym terminology for catalog matching (e.g. "Barbell Bench Press", "Back Squat", "Pull-Up", "Deadlift", "Dumbbell Curl")
7. "displayName" — Russian exercise name shown in the app UI (e.g. "Жим штанги лёжа", "Приседания со штангой")
8. 4-8 exercises for a standard workout
9. notes and technique tips — write in Russian for user readability`

// Yandex Vision OCR — специализированный OCR для текста (включая рукописный)
const VISION_OCR_URL = 'https://ocr.api.cloud.yandex.net/ocr/v1/recognizeText'

// OpenAI-совместимый API Yandex Cloud для YandexGPT (chat/completions)
const YANDEX_GPT_URL = 'https://ai.api.cloud.yandex.net/v1/chat/completions'

export class YandexAiService {
  /**
   * Проверяет, включена ли функция AI-тренировок.
   * Легко отключить через env FEATURE_AI_WORKOUT=false
   */
  static isEnabled(): boolean {
    return env.get('FEATURE_AI_WORKOUT', 'false') === 'true'
  }

  /**
   * Распознаёт тренировку с изображения (для атлетов).
   * Шаг 1: Yandex Vision OCR → извлекает текст с фото (поддерживает рукопись)
   * Шаг 2: YandexGPT (текстовый, дешевле) → парсит текст в JSON тренировки
   */
  static async recognizeFromImage(imageBase64: string, mimeType: string): Promise<AiWorkoutResult> {
    const apiKey = env.get('YANDEX_CLOUD_API_KEY')!
    const folderId = env.get('YANDEX_FOLDER_ID')!

    // Шаг 1: OCR — извлечь текст с изображения
    const extractedText = await this.extractTextWithOcr(imageBase64, mimeType, apiKey, folderId)

    if (!extractedText.trim()) {
      throw new Error('Не удалось распознать текст на изображении. Убедитесь, что текст виден чётко.')
    }

    // Шаг 2: LLM — разобрать текст в структуру тренировки
    const result = await this.callGpt(
      folderId,
      PARSE_SYSTEM_PROMPT,
      `Разбери следующий текст тренировки в JSON:\n\n${extractedText}`,
      0.1,
      apiKey
    )

    return this.parseWorkoutJson(result)
  }

  /**
   * Генерирует тренировку по текстовому описанию (для тренеров).
   * Использует YandexGPT — один запрос, без OCR.
   */
  static async generateFromText(prompt: string): Promise<AiWorkoutResult> {
    const apiKey = env.get('YANDEX_CLOUD_API_KEY')!
    const folderId = env.get('YANDEX_FOLDER_ID')!

    const result = await this.callGpt(
      folderId,
      GENERATE_SYSTEM_PROMPT,
      `Создай тренировку: ${prompt}`,
      0.4,
      apiKey
    )

    return this.parseWorkoutJson(result)
  }

  /**
   * AI-чат — фитнес-советник для атлетов и тренеров.
   * messages — история диалога: [{ role: 'user'|'assistant', content: string }]
   * Возвращает текст ответа ассистента.
   */
  static async chat(messages: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<string> {
    const apiKey = env.get('YANDEX_CLOUD_API_KEY')!
    const folderId = env.get('YANDEX_FOLDER_ID')!

    const response = await fetch(YANDEX_GPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Api-Key ${apiKey}`,
        'x-folder-id': folderId,
      },
      body: JSON.stringify({
        model: `gpt://${folderId}/${env.get('YANDEX_GPT_MODEL', 'yandexgpt-lite')}/latest`,
        messages: [
          { role: 'system', content: CHAT_SYSTEM_PROMPT },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      throw new Error(`YandexGPT error ${response.status}: ${errBody}`)
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const text = data?.choices?.[0]?.message?.content
    if (!text) throw new Error(`Пустой ответ от YandexGPT: ${JSON.stringify(data)}`)
    return text
  }

  /**
   * Конвертирует MIME-тип в формат, ожидаемый Vision OCR API.
   * API принимает "JPEG", "PNG", "PDF" — не "image/jpeg".
   */
  private static toOcrMimeType(mimeType: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'JPEG',
      'image/jpg': 'JPEG',
      'image/png': 'PNG',
      'image/webp': 'JPEG', // webp конвертируем в JPEG на фронте или принимаем как JPEG
      'image/heic': 'JPEG',
      'application/pdf': 'PDF',
    }
    return map[mimeType.toLowerCase()] ?? 'JPEG'
  }

  /**
   * Yandex Vision OCR: извлекает текст с изображения.
   * Документация: https://yandex.cloud/ru/docs/vision/ocr/
   * Модели:
   *   "page"        — 0,1322 ₽/запрос (любой текст, большинство залов)
   *   "handwritten" — 1,52 ₽/запрос   (рукописный текст)
   */
  private static async extractTextWithOcr(
    imageBase64: string,
    mimeType: string,
    apiKey: string,
    folderId: string
  ): Promise<string> {
    const response = await fetch(VISION_OCR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Api-Key ${apiKey}`,
        'x-folder-id': folderId,
        'x-data-logging-enabled': 'false',
      },
      body: JSON.stringify({
        // API принимает "JPEG"/"PNG"/"PDF", не "image/jpeg"
        mimeType: this.toOcrMimeType(mimeType),
        // "*" — автоопределение языка
        languageCodes: ['ru', 'en'],
        // "page"        — 0,13 ₽/req, любой текст (дефолт)
        // "handwritten" — 1,52 ₽/req, рукопись
        // Меняется через YANDEX_OCR_MODEL в .env
        model: env.get('YANDEX_OCR_MODEL', 'page'),
        content: imageBase64,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Vision OCR error ${response.status}: ${err}`)
    }

    const data = (await response.json()) as {
      result?: {
        textAnnotation?: {
          fullText?: string
          blocks?: Array<{ lines?: Array<{ text?: string }> }>
        }
      }
    }

    // fullText содержит весь распознанный текст в одну строку
    const fullText = data?.result?.textAnnotation?.fullText
    if (fullText) return fullText

    // Fallback: собрать из блоков если fullText отсутствует
    const blocks = data?.result?.textAnnotation?.blocks ?? []
    return blocks
      .flatMap((b) => b.lines ?? [])
      .map((l) => l.text ?? '')
      .filter(Boolean)
      .join('\n')
  }

  /**
   * YandexGPT через OpenAI-совместимый chat/completions API.
   * Документация: https://ai.api.cloud.yandex.net/v1/chat/completions
   * Формат запроса/ответа идентичен OpenAI Chat Completions.
   */
  private static async callGpt(
    folderId: string,
    instructions: string,
    input: string,
    temperature: number,
    apiKey: string
  ): Promise<string> {
    const response = await fetch(YANDEX_GPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // API-ключи Yandex Cloud используют "Api-Key", не "Bearer" (Bearer только для IAM-токенов)
        Authorization: `Api-Key ${apiKey}`,
        'x-folder-id': folderId,
      },
      body: JSON.stringify({
        model: `gpt://${folderId}/${env.get('YANDEX_GPT_MODEL', 'yandexgpt-lite')}/latest`,
        messages: [
          { role: 'system', content: instructions },
          { role: 'user', content: input },
        ],
        temperature,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const errBody = await response.text()
      throw new Error(`YandexGPT error ${response.status}: ${errBody}`)
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const text = data?.choices?.[0]?.message?.content
    if (!text) throw new Error(`Пустой ответ от YandexGPT: ${JSON.stringify(data)}`)
    return text
  }

  private static parseWorkoutJson(raw: string): AiWorkoutResult {
    const cleaned = raw
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()

    let parsed: any
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      throw new Error('AI вернул некорректный JSON')
    }

    const validTypes = ['crossfit', 'bodybuilding', 'cardio'] as const
    const workoutType = validTypes.includes(parsed.workoutType) ? parsed.workoutType : 'crossfit'

    const exercises: AiExercise[] = (Array.isArray(parsed.exercises) ? parsed.exercises : []).map(
      (ex: any) => ({
        name: String(ex.name || 'Exercise'),
        displayName: String(ex.displayName || ex.name || 'Упражнение'),
        sets: Math.max(1, Number(ex.sets) || 1),
        reps: ex.reps != null ? Number(ex.reps) : undefined,
        weight: ex.weight != null ? Number(ex.weight) : undefined,
        duration: ex.duration != null ? Number(ex.duration) : undefined,
        notes: ex.notes != null ? String(ex.notes) : undefined,
      })
    )

    return {
      workoutType,
      exercises,
      notes: parsed.notes ? String(parsed.notes) : undefined,
    }
  }
}
