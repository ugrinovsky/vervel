import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import convert from 'heic-convert'
import { MUSCLE_ZONES } from '#services/ExerciseCatalog'

export interface AiSetData {
  reps?: number
  weight?: number
  time?: number // секунды (кардио)
}

export interface AiExercise {
  name: string        // English name for catalog matching
  displayName: string // Russian name for display in UI
  sets: number
  reps?: number       // fallback если setData отсутствует
  weight?: number     // fallback если setData отсутствует
  duration?: number   // минуты (кардио)
  /** Данные по каждому подходу отдельно (приоритет над reps/weight) */
  setData?: AiSetData[]
  notes?: string
  /** Если упражнение часть суперсета — одинаковая метка у группы (напр. "A") */
  supersetGroup?: string
  /** Заполняется после матчинга к каталогу упражнений (если нашли совпадение) */
  exerciseId?: string
  /** Зоны мышц, задействованные в упражнении — заполняется GPT напрямую */
  zones?: string[]
}

export interface AiWorkoutResult {
  workoutType: 'crossfit' | 'bodybuilding' | 'cardio'
  exercises: AiExercise[]
  notes?: string
}

const ZONES_LIST = MUSCLE_ZONES.map((z) => `"${z}"`).join(',')

// Системный промпт для парсинга текста тренировки в JSON (OCR / изображения)
const PARSE_SYSTEM_PROMPT = `You are a fitness assistant. You are given text recognized from a photo of a workout board or sheet. Parse it into strict JSON format.

Requirements:
1. Return only a single JSON object — NOT an array, NOT wrapped in markdown code blocks, NO extra text
2. Format: {"workoutType":"crossfit|bodybuilding|cardio","exercises":[{"name":"Barbell Bench Press","displayName":"Жим штанги лёжа","sets":3,"reps":10,"weight":null,"setData":[{"reps":15},{"reps":12},{"reps":10}],"duration":null,"notes":null,"supersetGroup":null,"zones":["chests","triceps","shoulders"]}],"notes":"general notes"}
3. weight — in kilograms, duration — in MINUTES (not seconds)
4. If a parameter is not specified — use null
5. supersetGroup — if exercises are performed as a superset, assign them the same letter (e.g. "A"). Different superset pairs use different letters ("A", "B", etc.). If not a superset — use null
6. Determine workout type strictly:
   - "crossfit" = WOD, AMRAP, For Time, EMOM, Tabata, circuit training, functional fitness, HIIT with barbell/bodyweight
   - "bodybuilding" = strength training, weightlifting, isolation exercises, hypertrophy, powerlifting, muscle building (bench press, squats, curls, etc.)
   - "cardio" = running, cycling, swimming, rowing, stretching, yoga, mobility, flexibility, pilates, walking, any low-intensity or duration-based activity
7. "name" — precise English gym terminology for catalog matching. ALWAYS include equipment and variant:
   - Include equipment: "Barbell", "Dumbbell", "Kettlebell", "Cable", "Machine", "Bodyweight" etc.
   - Include variant if known: "Incline", "Decline", "Overhead", "Seated", "Standing", "One-Arm" etc.
   - Examples: "Barbell Thruster" (not "Thruster"), "Dumbbell Lateral Raise" (not "Lateral Raise"), "Kettlebell Swing" (not "Swing")
   - For unknown/unclear Russian exercises: use the closest standard English equivalent, NOT a transliteration
   - "Скалолаз" = "Mountain Climber", "Трастеры" = "Thruster", "Пресс книжка" = "Jackknife Sit-Up"
8. "displayName" — Russian name shown to the user (e.g. "Жим штанги лёжа", "Приседания со штангой", "Подтягивания", "Становая тяга"). For non-standard CrossFit exercises write the Russian transliteration or translation.
9. "zones" — array of muscle zones this exercise primarily works. Choose ONLY from: [${ZONES_LIST}]. Include 1-4 most relevant zones. Examples: bench press = ["chests","triceps","shoulders"], squat = ["legs","glutes"], plank = ["core"]
10. Interpret abbreviations: "5х10" = 5 sets of 10 reps, "x" or "×" = sets×reps
11. For cardio exercises always set duration (in minutes); for strength/crossfit set reps
12. notes field — write in Russian for user readability
13. CRITICAL — progressive/varied sets: if the same exercise name is followed by multiple "1×N" or "1×N-M" lines (e.g. "Bench Press / 1×15 / 1×12-10 / 1×10-8 / 1×8-6"), treat them as ONE exercise with setData listing each set. For ranges like "12-10" use the first (higher) number as reps. sets = number of setData entries. Do NOT create a separate exercise for each set line.
14. setData: for each set provide {reps, weight} — include weight if known, otherwise omit it. Use setData whenever sets have different rep counts or when individual set lines are listed explicitly.`

// Системный промпт для парсинга заметок тренера
const PARSE_NOTES_SYSTEM_PROMPT = `Разбери текст тренировки в JSON. Верни только JSON, без текста вокруг.

Формат:
{"workoutType":"bodybuilding","exercises":[{"name":"Разгибания ног","sets":4,"setData":[{"reps":20,"weight":32},{"reps":15,"weight":36},{"reps":15,"weight":41},{"reps":15,"weight":41}]}],"notes":null}

Правила:
- workoutType: "bodybuilding" (силовые, изоляция, тренажёры), "crossfit" (круговые, WOD, HIIT), "cardio" (бег, велосипед, растяжка)
- name: СТАНДАРТНОЕ название упражнения, как в учебнике или фитнес-приложении. Нормализуй сленг и анатомические термины: "голени" = "ног", "икры" → "Подъём на носки", "гакк присед" → "Гакк-приседания", "выпады смит" → "Выпады в тренажёре Смита", "сведения бёдер" → "Сведение бёдер"
- setData: каждый подход отдельно с reps и weight в кг
- "2х15, 41кг" → два подхода: [{"reps":15,"weight":41},{"reps":15,"weight":41}]
- "1х12+12, 21кг" → один подход: [{"reps":12,"weight":21}]
- Для кардио: {"time": минуты} вместо reps/weight
- sets = количество записей в setData`

// Системный промпт для AI-чата (фитнес-советник)
const CHAT_SYSTEM_PROMPT = `Ты — AI-помощник фитнес-приложения Vervel. Ты разбираешься в тренировках, питании, восстановлении и спортивной науке.

Правила ответов:
- Отвечай на русском языке
- Давай конкретные, практичные советы — без воды и вступлений
- Не объясняй что ты умеешь и не спрашивай уточнений без крайней необходимости — сразу давай ответ
- Не упоминай Markdown, форматирование или примеры кода — просто пиши текст
- Если нужен список упражнений — пиши его как обычный текст, без блоков кода
- Если вопрос не связан с фитнесом — вежливо перенаправь к теме тренировок
- Будь кратким, дружелюбным и мотивирующим`

// Системный промпт для генерации тренировки по текстовому описанию
const GENERATE_SYSTEM_PROMPT = `You are a professional fitness trainer. Generate a complete workout based on the description and return it in strict JSON format.

Requirements:
1. Return only JSON, no surrounding text
2. Format: {"workoutType":"crossfit|bodybuilding|cardio","exercises":[{"name":"Barbell Bench Press","displayName":"Жим штанги лёжа","sets":3,"reps":10,"weight":null,"duration":null,"notes":"техника в 1-2 предложения","supersetGroup":null,"zones":["chests","triceps","shoulders"]}],"notes":"общие рекомендации"}
3. weight — in kilograms (null if not applicable), duration — in MINUTES (not seconds, null if not applicable)
4. Generate a realistic workout with correct volume and intensity
5. Take into account fitness level if specified: beginner, intermediate, advanced
6. Determine workout type strictly:
   - "crossfit" = WOD, AMRAP, For Time, EMOM, Tabata, circuit training, functional fitness, HIIT with barbell/bodyweight
   - "bodybuilding" = strength training, weightlifting, isolation exercises, hypertrophy, powerlifting, muscle building (bench press, squats, curls, etc.)
   - "cardio" = running, cycling, swimming, rowing, stretching, yoga, mobility, flexibility, pilates, walking, any low-intensity or duration-based activity
7. For cardio workouts: set duration (in minutes) for each exercise, set reps and weight to null
8. For crossfit/bodybuilding: set reps, set duration to null
9. "name" — standard English gym terminology for catalog matching (e.g. "Barbell Bench Press", "Back Squat", "Pull-Up", "Deadlift", "Dumbbell Curl")
10. "displayName" — Russian exercise name shown in the app UI (e.g. "Жим штанги лёжа", "Приседания со штангой")
11. "zones" — array of muscle zones. Choose ONLY from: [${ZONES_LIST}]. Include 1-4 most relevant zones.
12. 4-8 exercises for a standard workout
13. notes and technique tips — write in Russian for user readability
14. supersetGroup — if the user mentions supersets or paired exercises, assign them the same letter (e.g. "A"). Different superset pairs use different letters ("A", "B", etc.). If not a superset — use null`

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

    // HEIC/HEIF → конвертируем в JPEG через heic-convert (OCR не поддерживает HEIC)
    if (mimeType === 'image/heic' || mimeType === 'image/heif') {
      logger.info({ mimeType }, 'ai:recognize converting HEIC to JPEG')
      const buffer = Buffer.from(imageBase64, 'base64')
      const jpeg = await convert({ buffer, format: 'JPEG', quality: 0.9 })
      imageBase64 = Buffer.from(jpeg).toString('base64')
      mimeType = 'image/jpeg'
    }

    // Шаг 1: OCR — извлечь текст с изображения
    const extractedText = await this.extractTextWithOcr(imageBase64, mimeType, apiKey, folderId)
    logger.info({ mimeType, ocrChars: extractedText.length, ocrPreview: extractedText.slice(0, 300) }, 'ai:ocr result')

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
    logger.info({ gptPreview: result.slice(0, 500) }, 'ai:gpt result')

    return this.parseWorkoutJson(result)
  }

  /**
   * Парсит текст заметок тренировки в структуру упражнений (для атлетов).
   * catalogTitles — список точных названий упражнений из каталога для инъекции в промпт.
   * AI должен выбирать "name" только из этого списка → matchExercisesToCatalog даёт точное совпадение.
   */
  static async parseWorkoutNotes(notes: string): Promise<AiWorkoutResult> {
    const apiKey = env.get('YANDEX_CLOUD_API_KEY')!
    const folderId = env.get('YANDEX_FOLDER_ID')!

    const result = await this.callGpt(
      folderId,
      PARSE_NOTES_SYSTEM_PROMPT,
      notes,
      0.1,
      apiKey,
      // Для парсинга заметок используем полную модель — она надёжнее lite
      env.get('YANDEX_GPT_PARSE_MODEL', 'yandexgpt')
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
      apiKey,
      env.get('YANDEX_GPT_PARSE_MODEL', 'yandexgpt')
    )

    return this.parseWorkoutJson(result)
  }

  /**
   * Второй проход матчинга: для нераспознанных упражнений отправляет батч в GPT.
   * exercises — массив { name, displayName, candidates: [{id, phrase}] }
   * Возвращает Map: originalName → catalogId | null
   */
  static async matchExercisesWithAi(
    exercises: Array<{
      name: string
      displayName: string
      candidates: Array<{ id: string; phrase: string }>
    }>
  ): Promise<Map<string, string | null>> {
    const apiKey = env.get('YANDEX_CLOUD_API_KEY')!
    const folderId = env.get('YANDEX_FOLDER_ID')!

    const systemPrompt = `You are a fitness exercise catalog matcher. You receive a JSON array of exercises, each with candidate catalog entries.
For each exercise select the best matching candidate ID. Return ONLY a JSON object: {"exercise_name": "catalog_id_or_null"}.
Rules:
- The returned ID must be exactly one of the provided candidate IDs (copy it verbatim)
- Use null if no candidate is a reasonable semantic match
- No markdown, no extra text — only the JSON object`

    const userMessage = JSON.stringify(
      exercises.map((ex) => ({
        name: ex.name,
        displayName: ex.displayName,
        candidates: ex.candidates,
      }))
    )

    const raw = await this.callGpt(
      folderId,
      systemPrompt,
      userMessage,
      0.0,
      apiKey,
      env.get('YANDEX_GPT_PARSE_MODEL', 'yandexgpt')
    )

    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed: Record<string, string | null> = JSON.parse(cleaned)
    return new Map(Object.entries(parsed))
  }

  /**
   * AI-чат — фитнес-советник для атлетов и тренеров.
   * messages — история диалога: [{ role: 'user'|'assistant', content: string }]
   * Возвращает текст ответа ассистента.
   */
  static async chat(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<{ reply: string; inputTokens: number; outputTokens: number }> {
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
      usage?: { prompt_tokens?: number; completion_tokens?: number }
    }
    const text = data?.choices?.[0]?.message?.content
    if (!text) throw new Error(`Пустой ответ от YandexGPT: ${JSON.stringify(data)}`)

    return {
      reply: text,
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    }
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
    apiKey: string,
    modelOverride?: string
  ): Promise<string> {
    const model = modelOverride ?? env.get('YANDEX_GPT_MODEL', 'yandexgpt-lite')
    const response = await fetch(YANDEX_GPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // API-ключи Yandex Cloud используют "Api-Key", не "Bearer" (Bearer только для IAM-токенов)
        Authorization: `Api-Key ${apiKey}`,
        'x-folder-id': folderId,
      },
      body: JSON.stringify({
        model: `gpt://${folderId}/${model}/latest`,
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
      // GPT иногда оборачивает результат в массив — берём первый элемент
      if (Array.isArray(parsed)) parsed = parsed[0]
    } catch {
      throw new Error('AI вернул некорректный JSON')
    }

    const validTypes = ['crossfit', 'bodybuilding', 'cardio'] as const
    const workoutType = validTypes.includes(parsed.workoutType) ? parsed.workoutType : 'bodybuilding'

    const exercises: AiExercise[] = (Array.isArray(parsed.exercises) ? parsed.exercises : []).map(
      (ex: any) => {
        const rawSetData = Array.isArray(ex.setData) ? ex.setData : null
        const setData: AiSetData[] | undefined = rawSetData
          ? rawSetData.map((s: any) => ({
              reps: s.reps != null ? Number(s.reps) : undefined,
              weight: s.weight != null ? Number(s.weight) : undefined,
              time: s.time != null ? Number(s.time) : undefined,
            }))
          : undefined

        const rawZones = Array.isArray(ex.zones) ? ex.zones : []
        const zones = rawZones
          .map((z: any) => String(z))
          .filter((z: string) => (MUSCLE_ZONES as readonly string[]).includes(z))

        return {
          name: String(ex.name || 'Exercise'),
          displayName: String(ex.displayName || ex.name || 'Упражнение'),
          sets: setData ? setData.length : Math.max(1, Number(ex.sets) || 1),
          reps: ex.reps != null ? Number(ex.reps) : undefined,
          weight: ex.weight != null ? Number(ex.weight) : undefined,
          duration: ex.duration != null ? Number(ex.duration) : undefined,
          setData,
          notes: ex.notes != null ? String(ex.notes) : undefined,
          supersetGroup: ex.supersetGroup != null ? String(ex.supersetGroup) : undefined,
          zones: zones.length > 0 ? zones : undefined,
        }
      }
    )

    return {
      workoutType,
      exercises,
      notes: parsed.notes ? String(parsed.notes) : undefined,
    }
  }
}
