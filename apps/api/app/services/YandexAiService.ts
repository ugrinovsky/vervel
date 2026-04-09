import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import convert from 'heic-convert'
import { MUSCLE_ZONES } from '#services/ExerciseCatalog'
import {
  normalizeWorkoutTextForParsing,
  workoutProgramCleanupSystemPrompt,
  workoutProgramParseSystemPrompt,
} from '#services/ai_workout_ocr_parse'

export interface AiSetData {
  reps?: number
  weight?: number
  time?: number // секунды (кардио)
}

export interface AiExercise {
  name: string        // русское имя для матчинга с каталогом (как в промптах ИИ)
  displayName: string // русское имя для UI
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

export interface AiRecognizedWorkoutResult {
  /** После распознавания по фото тип должен выбрать пользователь */
  workoutType: null
  exercises: AiExercise[]
  notes?: string
}

const ZONES_LIST = MUSCLE_ZONES.map((z) => `"${z}"`).join(',')

// Только parseWorkoutNotes (текст заметок из формы). OCR/текст программы → workoutProgramParseSystemPrompt().
const PARSE_NOTES_SYSTEM_PROMPT = `Разбери текст тренировки в JSON. Верни только JSON, без текста вокруг.

Формат:
{"workoutType":"bodybuilding","exercises":[{"name":"Разгибания ног","sets":4,"supersetGroup":null,"setData":[{"reps":20,"weight":32},{"reps":15,"weight":36},{"reps":15,"weight":41},{"reps":15,"weight":41}]}],"notes":null}

Правила:
- workoutType: "bodybuilding" (силовые, изоляция, тренажёры), "crossfit" (круговые, кроссфит-протоколы, высокая интенсивность), "cardio" (бег, велосипед, растяжка)
- name: СТАНДАРТНОЕ название упражнения, как в учебнике или фитнес-приложении. Нормализуй сленг и анатомические термины: "голени" = "ног", "икры" → "Подъём на носки", "гакк присед" → "Гакк-приседания", "выпады смит" → "Выпады в тренажёре Смита", "сведения бёдер" → "Сведение бёдер"
- setData: каждый подход отдельно с reps и weight в кг
- ЕДИНИЦЫ ВЕСА: «кг» — килограммы. Если в тексте опечатка «кн», считай это «кг» (килограммы).
- "2х15, 41кг" → два подхода: [{"reps":15,"weight":41},{"reps":15,"weight":41}]
- "1х12+12, 21кг" → один подход: [{"reps":12,"weight":21}]
- «3х15 каждой ногой, 4,6 кг» / «3х15 на каждую ногу, 3,6 кг» → ТРИ подхода: [{"reps":15,"weight":4.6},{"reps":15,"weight":4.6},{"reps":15,"weight":4.6}]
- Для кардио: {"time": минуты} вместо reps/weight
- sets = количество записей в setData
- СУПЕРСЕТЫ И БЛОКИ: строка вида "Суперсет x N", "Табата x N", "Круговая x N" — это заголовок блока, где N = количество подходов каждого упражнения в блоке. Все упражнения ниже до следующего заголовка получают sets=N и одинаковый supersetGroup (первый блок "A", второй "B", третий "C" и т.д.). Заголовок блока не является упражнением — не добавляй его в exercises. Пример: "Суперсет x 3 / Жим лёжа 10 / Тяга 12" → два упражнения с sets=3, supersetGroup="A", setData из 3 подходов каждое
- ПОД СУПЕРСЕТОМ — СТРОКА = ОТДЕЛЬНОЕ УПРАЖНЕНИЕ: каждая строка вида «Название - повторы», «Название - макс», «Название 12» (одно движение на строку) — отдельный элемент в exercises с тем же supersetGroup. Если две строки (например «Подтягивания - макс» и «Зашагивания - 24») — в JSON ровно ДВА упражнения. НЕ объединяй в одно и НЕ пропускай второе.
- «Зашагивания», «засагивания» (опечатка) = зашагивания на платформу; name нормализуй к стандартному названию (например «Зашагивания на платформу» или близко к каталогу), не игнорируй из-за необычного слова.
- ОДНО УПРАЖНЕНИЕ: СТРОКА-НАЗВАНИЕ, ПОТОМ ПОДХОДЫ: если после блока суперсета (или в начале текста) идёт строка, которая выглядит как название движения без чисел подходов (например "Сумо", "Жим лёжа"), а следующие строки — только подходы вида "1x15", "3x12-10", "2х10", "NxM", "N×M" — это ОДНО отдельное упражнение: первая строка = name, все строки подходов = setData. НЕ пропускай такое упражнение и НЕ присоединяй его к предыдущему суперсету. Пример: "Сумо" затем "1x15" и "3x12-10" → одно упражнение, 2 подхода в setData.
- Короткие названия: "Сумо" в силовой тренировке почти всегда = становая в стойке сумо → нормализуй name в "Становая тяга сумо" (полное стандартное название).
- «макс», «до отказа» вместо числа повторов в строке упражнения (например «Подтягивания - макс»): один подход; reps укажи как 12 (заглушка для UI) или 1 если явно один подход на максимум — вес не выдумывай.
- КРОССФИТ-ФОРМАТЫ: строки вроде «ЗКМБР N мин», «амрап N мин», «на время», «эмом N мин», «табата N мин» — это описание формата, не упражнения. В exercises только конкретные движения под ними (трастеры, канат, скакалка и т.д.). Латинские аббревиатуры в тексте (AMRAP, EMOM) трактуй так же — не как упражнение.`

// NOTE: Если в силовой программе отдельно приписано кардио («Кардио 20 минут…») —
// добавляй это в notes, но НЕ делай отдельное упражнение и НЕ переключай workoutType на cardio.

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

// Генерация тренировки по текстовому описанию (тренеры)
const GENERATE_SYSTEM_PROMPT = `Ты профессиональный тренер. По описанию пользователя составь тренировку и верни строгий JSON.

Требования:
1. Только JSON, без текста вокруг.
2. Формат: {"workoutType":"crossfit|bodybuilding|cardio","exercises":[{"name":"Жим штанги лёжа","displayName":"Жим штанги лёжа","sets":3,"reps":10,"weight":null,"duration":null,"notes":"техника кратко по-русски","supersetGroup":null,"zones":["chests","triceps","shoulders"]}],"notes":"общие рекомендации по-русски"}
3. weight — кг или null; duration — минуты или null (не секунды).
4. Реалистичный объём и интенсивность.
5. Учитывай уровень, если указан (новичок, средний, продвинутый).
6. workoutType: crossfit — круги, кроссфит-задания, высокоинтенсивные блоки; bodybuilding — силовая/гипертрофия; cardio — аэробика, растяжка и т.п.
7. Кардио: duration у упражнений; reps и weight — null.
8. Кроссфит/силовые: reps; duration — null.
9. name и displayName — русские стандартные названия для каталога и интерфейса; с заглавной буквы в displayName.
10. zones — только из: [${ZONES_LIST}], 1–4 зоны.
   - zones (критично): это ключ для аватара восстановления, выбирай максимально точно.
   - Для базовых движений обычно 2–4 зоны.
   - «Румынская тяга» / hip hinge: обязательно включает "glutes" и "legs", часто также "back".
   - «Становая тяга»: обычно "glutes"+"legs"+"back".
   - Тяга в наклоне: "back"+"biceps" (иногда "forearms").
   - Жим лёжа: "chests"+"triceps"+"shoulders".
11. Обычно 4–8 упражнений.
12. notes и техника — по-русски.
13. supersetGroup — при суперсетах одна буква на группу ("A", "B"…); иначе null.`

// Yandex Vision OCR — специализированный OCR для текста (включая рукописный)
const VISION_OCR_URL = 'https://ocr.api.cloud.yandex.net/ocr/v1/recognizeText'

// OpenAI-совместимый API Yandex Cloud для YandexGPT (chat/completions)
const YANDEX_GPT_URL = 'https://ai.api.cloud.yandex.net/v1/chat/completions'

/**
 * model в запросе = URI без схемы: после `gpt://<folder>/` идёт либо `yandexgpt/latest`,
 * либо для новых моделей галереи просто `yandexgpt-5.1` (без второго `/latest`).
 * Строка с `/` или `@` передаётся как есть (дообученные вида `yandexgpt-lite/latest@…`).
 */
function yandexFoundationModelUri(folderId: string, modelId: string): string {
  const m = modelId.trim()
  if (!m) {
    throw new Error('Yandex model id is empty')
  }
  if (m.includes('/') || m.includes('@')) {
    return `gpt://${folderId}/${m}`
  }
  if (m === 'yandexgpt' || m === 'yandexgpt-lite') {
    return `gpt://${folderId}/${m}/latest`
  }
  return `gpt://${folderId}/${m}`
}

const SUGGEST_STANDARD_LINKS_PROMPT = `Ты сопоставляешь строки из двух списков: candidates (упражнения из журнала) и standards (эталоны пользователя). Глобального справочника нет — только текст в JSON.

Цель: в links указать пары только там, где кандидат и эталон — ОДНО И ТО ЖЕ упражнение, возможно названное по-разному (синоним, другой снаряд того же движения, сокращение). На каждого кандидата не больше одной связи.

Обязательный внутренний шаг (только в голове, в ответ не выводи):
Для каждого названия, с которым работаешь, сформулируй мысленно короткое описание движения в 1–2 фразы на русском: положение тела, какие суставы ведут движение, куда направлено усилие. Сопоставляй кандидат с эталоном, сравнивая эти мысленные описания, а не только общие слова в строках.

Как отличать одно упражнение от другого (делай для кандидата и для эталона отдельно, мысленно; в ответ не пиши):

Шаг 1 — главный двигательный смысл: какой сустав(ы) ведут движение и что именно делается (сгибание, разгибание, отведение, приведение, круговое движение над головой, выжимание от опоры и т.д.). Не путай категории: например выжимание вдоль одной оси и отведение в сторону — разные семейства; тяга снаряда к корпусу в одной плоскости и доминантное сгибание/разгибание тазобедренного сустава при работе с весом — разные семейства; движение преимущественно в локтях и преимущественно в плечевом суставе — часто разные семейства.

Шаг 2 — ориентация тела и направление усилия относительно корпуса (если из названия это можно понять): стоя, сидя, лёжа на скамье, наклон торса, над головой и т.п. Если для одного названия это ясно, а для другого противоречит — это разные упражнения.

Шаг 3 — снаряд или вариант, если явно названы оба конца сравнения: несовместимые снаряды для ОДНОГО И ТОГО ЖЕ варианта — не пара; если в названии снаряд не указан, не домысливай.

Шаг 4 — финальная проверка: представь, что в дневнике заменили название кандидата на displayLabel эталона. Поймёт ли человек без уточнений, что речь всё о том же движении? Если нет — не включай в links.

Ловушки, на которые нельзя вестись:
- Общие слова в русском названии (одинаковые корни, «жим», «тяга», «наклон», название снаряда) не доказывают совпадение.
- Пересечение по «рабочим мышцам» в голове не делает упражнения одинаковыми.
- Не заполняй links «чтобы что-то вернуть»: пустой массив links предпочтительнее любой сомнительной пары.

Типичные ошибки (это ВСЕГДА разные упражнения, не связывай):
- «Разведение» / «разводка» гантелей (отведение в стороны в плечевом) и любой «жим» лёжа или с гантелями вдоль тела.
- «Тяга штанги в наклоне» к корпусу и «румынская тяга» / мёртвая тяга (доминанта тазобедренного, другая траектория).
- «Пуловер» и «разводка на наклонной» / махи — разный паттерн плеча/локтя.
- «Выпады», «зашагивания», «степ-ап», приседы, гакк — нижняя часть тела / одна нога; «жим штанги лёжа» — верх лёжа; не пересекать эти категории.
- «Французский жим» / скалка и «жим гантелей лёжа» — разные движения по локтю и линии жима.

Верни ТОЛЬКО валидный JSON, без markdown и текста вокруг.

Формат (ключи строго латиницей):
{"links":[{"sourceExerciseId":"<как в candidates>","standardId":<число из standards>}]}

Требования к полям:
- sourceExerciseId — посимвольное копирование из candidates.
- standardId — целое из списка эталонов.
- Не добавляй id или числа, которых не было во входе.`

export class YandexAiService {
  /** Small public wrapper around internal chat-completions call (for other AI helpers). */
  static async callGptRaw(params: {
    folderId: string
    systemPrompt: string
    userMessage: string
    temperature?: number
    modelId?: string
    maxTokens?: number
  }): Promise<string> {
    const apiKey = env.get('YANDEX_CLOUD_API_KEY')!
    const folderId = params.folderId
    return await this.callGpt(
      folderId,
      params.systemPrompt,
      params.userMessage,
      params.temperature ?? 0.0,
      apiKey,
      params.modelId ?? env.get('YANDEX_GPT_PARSE_MODEL', 'yandexgpt'),
      params.maxTokens
    )
  }

  /**
   * Диагностика парсинга тренировки: сводка + полный сырой ответ модели (по частям, чтобы не резали логи).
   * В prod при шуме: AI_LOG_WORKOUT_GPT_RAW=false — только сводка без сырых чанков.
   */
  private static logWorkoutParseDebug(
    source: 'recognizeFromImage' | 'parseWorkoutTextLikeOcr',
    normalizedInput: string,
    gptRaw: string,
    parsed: AiWorkoutResult
  ) {
    const logRawChunks = env.get('AI_LOG_WORKOUT_GPT_RAW', 'true') === 'true'

    logger.info(
      {
        source,
        normalizedInputChars: normalizedInput.length,
        normalizedInputPreview: normalizedInput.slice(0, 500),
        gptRawChars: gptRaw.length,
        inferredWorkoutType: parsed.workoutType,
        exerciseCount: parsed.exercises.length,
        exercisesSummary: parsed.exercises.map((e) => ({
          name: e.name,
          sets: e.sets,
          setDataLen: e.setData?.length ?? 0,
          setData: e.setData,
          reps: e.reps,
          weight: e.weight,
        })),
      },
      'ai:workout parse (summary)'
    )

    if (!logRawChunks || !gptRaw.length) return

    const chunkSize = 8000
    const totalParts = Math.ceil(gptRaw.length / chunkSize)
    for (let i = 0, part = 0; i < gptRaw.length; i += chunkSize, part++) {
      logger.info(
        {
          source,
          part,
          parts: totalParts,
          gptRawChunk: gptRaw.slice(i, i + chunkSize),
        },
        'ai:workout parse (gpt raw chunk)'
      )
    }
  }

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
  static async recognizeFromImage(
    imageBase64: string,
    mimeType: string
  ): Promise<AiRecognizedWorkoutResult> {
    const apiKey = env.get('YANDEX_CLOUD_API_KEY')!
    const folderId = env.get('YANDEX_FOLDER_ID')!

    // HEIC/HEIF → конвертируем в JPEG через heic-convert (OCR не поддерживает HEIC)
    if (mimeType === 'image/heic' || mimeType === 'image/heif') {
      logger.info({ mimeType }, 'ai:recognize converting HEIC to JPEG')
      const buffer = Buffer.from(imageBase64, 'base64')
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      )
      const jpeg = await convert({ buffer: arrayBuffer, format: 'JPEG', quality: 0.9 })
      imageBase64 = Buffer.from(jpeg).toString('base64')
      mimeType = 'image/jpeg'
    }

    // Шаг 1: OCR — извлечь текст с изображения
    const extractedText = await this.extractTextWithOcr(imageBase64, mimeType, apiKey, folderId)
    logger.info({ mimeType, ocrChars: extractedText.length, ocrPreview: extractedText.slice(0, 300) }, 'ai:ocr result')

    if (!extractedText.trim()) {
      throw new Error('Не удалось распознать текст на изображении. Убедитесь, что текст виден чётко.')
    }

    // Шаг 2a: LLM — очистить текст (убрать мусор OCR/шапки), без JSON
    const cleanedText = await this.callGpt(
      folderId,
      workoutProgramCleanupSystemPrompt(),
      extractedText,
      0.0,
      apiKey,
      undefined,
      4096
    )

    let normalizedText = normalizeWorkoutTextForParsing(cleanedText)
    if (!normalizedText.trim()) {
      // fallback: если cleanup перестарался — парсим исходник
      logger.warn({ mimeType }, 'ai:cleanup produced empty text — fallback to raw OCR')
      normalizedText = normalizeWorkoutTextForParsing(extractedText)
      if (!normalizedText.trim()) {
        throw new Error('Не удалось распознать текст на изображении. Убедитесь, что текст виден чётко.')
      }
    }

    // Шаг 2b: LLM — разобрать очищенный текст в JSON
    const result = await this.callGpt(
      folderId,
      workoutProgramParseSystemPrompt(),
      `Разбери следующий текст тренировки в JSON:\n\n${normalizedText}`,
      0.1,
      apiKey,
      undefined,
      4096
    )

    // workoutType намеренно НЕ выставляем: пользователь выбирает его явно.
    const parsed = this.parseWorkoutJson(result)
    this.logWorkoutParseDebug('recognizeFromImage', normalizedText, result, parsed)
    return { workoutType: null, exercises: parsed.exercises, notes: parsed.notes }
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
      env.get('YANDEX_GPT_PARSE_MODEL', 'yandexgpt'),
      4096
    )

    return this.parseWorkoutJson(result)
  }

  /**
   * Парсит произвольный текст так же, как после OCR (без этапа OCR).
   * Нужен, чтобы "распознать по тексту" работало максимально идентично распознаванию по фото.
   */
  static async parseWorkoutTextLikeOcr(text: string): Promise<AiWorkoutResult> {
    const apiKey = env.get('YANDEX_CLOUD_API_KEY')!
    const folderId = env.get('YANDEX_FOLDER_ID')!
    // 1) cleanup pass — убрать мусор/шапки, без JSON
    const cleanedText = await this.callGpt(
      folderId,
      workoutProgramCleanupSystemPrompt(),
      text,
      0.0,
      apiKey,
      env.get('YANDEX_GPT_PARSE_MODEL', 'yandexgpt'),
      4096
    )

    const normalizedText = normalizeWorkoutTextForParsing(cleanedText)

    const result = await this.callGpt(
      folderId,
      workoutProgramParseSystemPrompt(),
      `Разбери следующий текст тренировки в JSON:\n\n${normalizedText}`,
      0.1,
      apiKey,
      // Для парсинга текста используем полную модель — она надёжнее lite
      env.get('YANDEX_GPT_PARSE_MODEL', 'yandexgpt'),
      4096
    )

    const parsed = this.parseWorkoutJson(result)
    this.logWorkoutParseDebug('parseWorkoutTextLikeOcr', normalizedText, result, parsed)
    return parsed
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

    const systemPrompt = `Ты подбираешь упражнения к каталогу. На входе JSON-массив: у каждого упражнения есть список кандидатов с id.

Для каждого упражнения выбери лучший id кандидата. Верни ТОЛЬКО JSON-объект вида {"<имя_упражнения_как_во_входе>": "catalog_id_или_null"} — ключи совпадают с полем name из входа.

Правила:
- Значение — ровно один из переданных candidate id, скопируй посимвольно, или null если нет разумного совпадения.
- Без markdown и без текста вокруг — только объект JSON.`

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
   * Силовой журнал: предложить связи exerciseId → standardId (ids только из переданных списков).
   */
  static async suggestStrengthLogStandardLinks(
    standards: Array<{ id: number; displayLabel: string }>,
    candidates: Array<{ exerciseId: string; exerciseName: string }>
  ): Promise<Array<{ sourceExerciseId: string; standardId: number }>> {
    const apiKey = env.get('YANDEX_CLOUD_API_KEY')!
    const folderId = env.get('YANDEX_FOLDER_ID')!

    const payload = {
      standards: standards.map((s) => ({ id: s.id, displayLabel: s.displayLabel })),
      candidates: candidates.map((c) => ({ exerciseId: c.exerciseId, exerciseName: c.exerciseName })),
    }

    logger.info(
      {
        event: 'ai:suggest-standard-links:request',
        standardsCount: standards.length,
        candidatesCount: candidates.length,
        payload,
      },
      'YandexAiService.suggestStrengthLogStandardLinks: request'
    )

    const raw = await this.callGpt(
      folderId,
      SUGGEST_STANDARD_LINKS_PROMPT,
      JSON.stringify(payload),
      0,
      apiKey,
      env.get('YANDEX_GPT_PARSE_MODEL', 'yandexgpt'),
      4096
    )

    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let parsed: unknown
    try {
      parsed = JSON.parse(cleaned)
    } catch (e) {
      logger.warn(
        {
          event: 'ai:suggest-standard-links:json-error',
          cleanedLength: cleaned.length,
          cleanedPreview: cleaned.slice(0, 800),
          err: String(e),
        },
        'YandexAiService.suggestStrengthLogStandardLinks: JSON parse failed'
      )
      throw new Error('AI вернул некорректный JSON для связей с эталонами')
    }

    const linksRaw = Array.isArray((parsed as { links?: unknown }).links)
      ? ((parsed as { links: unknown[] }).links)
      : []
    const out: Array<{ sourceExerciseId: string; standardId: number }> = []
    for (const item of linksRaw) {
      if (item == null || typeof item !== 'object') continue
      const rec = item as Record<string, unknown>
      const sid = rec.sourceExerciseId != null ? String(rec.sourceExerciseId).trim() : ''
      const std = rec.standardId
      const stdNum = typeof std === 'number' ? std : Number(std)
      if (!sid || !Number.isFinite(stdNum)) continue
      out.push({ sourceExerciseId: sid, standardId: stdNum })
    }

    const maxLoggedRaw = 16_000
    logger.info(
      {
        event: 'ai:suggest-standard-links:response',
        cleanedLength: cleaned.length,
        rawResponse: cleaned.length <= maxLoggedRaw ? cleaned : `${cleaned.slice(0, maxLoggedRaw)}…(truncated)`,
        parsedLinksCount: linksRaw.length,
        normalizedLinksCount: out.length,
        links: out,
      },
      'YandexAiService.suggestStrengthLogStandardLinks: response'
    )

    return out
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
        model: yandexFoundationModelUri(folderId, env.get('YANDEX_GPT_MODEL', 'yandexgpt-lite')),
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
    modelOverride?: string,
    maxTokens = 2000
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
        model: yandexFoundationModelUri(folderId, model),
        messages: [
          { role: 'system', content: instructions },
          { role: 'user', content: input },
        ],
        temperature,
        max_tokens: maxTokens,
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
    const parsedType = validTypes.includes(parsed.workoutType) ? parsed.workoutType : 'bodybuilding'

    const toNumberLoose = (v: any): number | undefined => {
      if (v == null) return undefined
      const s = String(v).trim().replace(',', '.')
      const n = Number(s)
      return Number.isFinite(n) ? n : undefined
    }

    const exercises: AiExercise[] = (Array.isArray(parsed.exercises) ? parsed.exercises : []).map(
      (ex: any) => {
        const rawSetData = Array.isArray(ex.setData) ? ex.setData : null
        const setData: AiSetData[] | undefined = rawSetData
          ? rawSetData.map((s: any) => ({
              reps: toNumberLoose(s.reps),
              weight: toNumberLoose(s.weight),
              time: toNumberLoose(s.time),
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
          reps: toNumberLoose(ex.reps),
          weight: toNumberLoose(ex.weight),
          duration: toNumberLoose(ex.duration),
          setData,
          notes: ex.notes != null ? String(ex.notes) : undefined,
          supersetGroup: ex.supersetGroup != null ? String(ex.supersetGroup) : undefined,
          zones: zones.length > 0 ? zones : undefined,
        }
      }
    )

    return { workoutType: parsedType, exercises, notes: parsed.notes ? String(parsed.notes) : undefined }
  }
}
