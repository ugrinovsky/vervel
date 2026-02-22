import env from '#start/env'

export interface AiExercise {
  name: string
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
const PARSE_SYSTEM_PROMPT = `Ты — фитнес-ассистент. Тебе дан текст, распознанный с фотографии тренировочной доски или листка. Разбери его в строгом JSON-формате.

Требования:
1. Только JSON, никакого текста вокруг него
2. Формат: {"workoutType":"crossfit|bodybuilding|cardio","exercises":[{"name":"название упражнения","sets":3,"reps":10,"weight":80,"duration":null,"notes":null}],"notes":"общие заметки"}
3. weight — в килограммах, duration — в секундах
4. Если параметр не указан — используй null
5. Тип тренировки определи по контексту (CrossFit = WOD/AMRAP/For Time, бодибилдинг = изолирующие упражнения, кардио = бег/велосипед/плавание)
6. Переводи названия упражнений на русский язык
7. Интерпретируй сокращения: "5х10" = 5 подходов по 10 повторений, "x" или "×" = подходы×повторения`

// Системный промпт для генерации тренировки по текстовому описанию
const GENERATE_SYSTEM_PROMPT = `Ты — профессиональный тренер по фитнесу. Сгенерируй готовую тренировку по описанию и верни её в строгом JSON-формате.

Требования:
1. Только JSON, никакого текста вокруг него
2. Формат: {"workoutType":"crossfit|bodybuilding|cardio","exercises":[{"name":"название упражнения","sets":3,"reps":10,"weight":null,"duration":null,"notes":"подсказка по технике"}],"notes":"общие рекомендации"}
3. weight — в килограммах (null если не применимо), duration — в секундах (null если не применимо)
4. Генерируй реалистичную тренировку с правильными объёмами и интенсивностью
5. Учитывай уровень подготовки если указан: новичок, средний, продвинутый
6. Все названия упражнений на русском языке
7. 4-8 упражнений для обычной тренировки`

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
    const apiKey = env.get('YANDEX_CLOUD_API_KEY')
    const folderId = env.get('YANDEX_FOLDER_ID')

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
    const apiKey = env.get('YANDEX_CLOUD_API_KEY')
    const folderId = env.get('YANDEX_FOLDER_ID')

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
        model: `gpt://${folderId}/yandexgpt/latest`,
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
        name: String(ex.name || 'Упражнение'),
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
