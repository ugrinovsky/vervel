import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { MUSCLE_ZONES } from '#services/ExerciseCatalog'
import { normalizeExerciseLabel } from '#services/exercise_match_helpers'
import type { AiParseChainCtx } from '#services/ai_parse_chain'
import ExerciseAnatomyCache from '#models/exercise_anatomy_cache'
import { YandexAiService, type AiExercise } from '#services/YandexAiService'
import { distributeZoneWeights } from '#utils/zone_weights'

export const EXERCISE_ANATOMY_PROMPT_VERSION = 'v2-cot-map'

const ZONES_LIST = MUSCLE_ZONES.map((z) => `"${z}"`).join(',')

function biomechanicsSystemPrompt(): string {
  return `Ты биомеханик по силовым и функциональным тренировкам. По названию упражнения опиши движение так, чтобы по тексту можно было выбрать группы мышц для трекинга восстановления.

Верни только связный текст на русском, 2–5 коротких предложений, без списков, без JSON и без английских терминов из служебных списков:
- какие суставы ведут движение;
- положение тела, если это важно для отличия вариантов;
- какие группы мышц работают в первую очередь и какие заметно подключаются вторично.`
}

function zonesMapSystemPrompt(): string {
  return `По описанию движения на русском выбери зоны мышц для фитнес-приложения (восстановление / аватар нагрузки).

Верни ТОЛЬКО JSON, без markdown и пояснений.

Формат: {"zones":["zone1","zone2"]}

Правила:
- Только зоны из списка: [${ZONES_LIST}]. Столько, сколько в движении реально значимо нагружается (не дополняй список искусственно).
- Значения — строго как в списке (латиница).
- Опирайся на смысл описания, не додумывай снаряд, если его не было в описании.`
}

function stripMarkdownFences(raw: string): string {
  return raw.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
}

function normalizeZones(zones: unknown): string[] {
  const allowed = new Set(MUSCLE_ZONES as unknown as string[])
  const list = Array.isArray(zones) ? zones.map((z) => String(z)) : []
  return [...new Set(list)].filter((z) => allowed.has(z))
}

function surfaceLabel(ex: AiExercise): string {
  const d = ex.displayName?.trim()
  if (d) return d
  return ex.name?.trim() || ''
}

export class ExerciseAnatomyService {
  /**
   * Двухшаговый вызов (биомеханика → маппинг в зоны) с кэшем по нормализованному названию.
   * Возвращает null, если зоны определить нельзя или AI выключен — вызывающий оставляет исходные zones упражнения.
   */
  static async resolveZonesForExercise(
    exercise: Pick<AiExercise, 'name' | 'displayName' | 'notes'>,
    chain?: AiParseChainCtx
  ): Promise<string[] | null> {
    if (!YandexAiService.isEnabled()) return null

    const folderId = env.get('YANDEX_FOLDER_ID')!
    const modelId = env.get('YANDEX_GPT_PARSE_MODEL', 'yandexgpt')
    const label = surfaceLabel(exercise as AiExercise)
    if (!label) return null

    const normalized = normalizeExerciseLabel(label)
    if (!normalized) return null

    const cached = await ExerciseAnatomyCache.findBy('normalizedLabel', normalized)
    if (cached && cached.promptVersion === EXERCISE_ANATOMY_PROMPT_VERSION) {
      if (cached.status === 'ok' && Array.isArray(cached.zones) && cached.zones.length > 0) {
        logger.info(
          {
            ...(chain ? { traceId: chain.traceId, userId: chain.userId, route: chain.route } : {}),
            step: 'anatomy.cache_hit_ok',
            normalized,
            label,
            zones: normalizeZones(cached.zones),
          },
          'ai:chain'
        )
        return normalizeZones(cached.zones)
      }
      if (cached.status === 'unknown') {
        logger.info(
          {
            ...(chain ? { traceId: chain.traceId, userId: chain.userId, route: chain.route } : {}),
            step: 'anatomy.cache_hit_unknown',
            normalized,
            label,
          },
          'ai:chain'
        )
        return null
      }
    }

    const notes = exercise.notes?.trim()
    const userStep1 = notes
      ? `Название: ${label}\nКомментарий к технике или контексту: ${notes}`
      : `Название: ${label}`

    logger.info(
      {
        ...(chain ? { traceId: chain.traceId, userId: chain.userId, route: chain.route } : {}),
        step: 'anatomy.llm_start',
        normalized,
        label,
        modelId,
      },
      'ai:chain'
    )

    let bio: string
    try {
      bio = await YandexAiService.callGptRaw({
        folderId,
        systemPrompt: biomechanicsSystemPrompt(),
        userMessage: userStep1,
        temperature: 0.1,
        modelId,
        maxTokens: 512,
        llmLog: chain ? { chain, step: 'anatomy.biomechanics_llm' } : { step: 'anatomy.biomechanics_llm' },
      })
    } catch (e) {
      logger.warn({ err: String(e), label }, 'ExerciseAnatomyService: step1 failed')
      await this.saveUnknown(normalized, modelId)
      return null
    }

    const bioText = bio.trim()
    if (!bioText) {
      await this.saveUnknown(normalized, modelId)
      return null
    }

    let rawStep2: string
    try {
      rawStep2 = await YandexAiService.callGptRaw({
        folderId,
        systemPrompt: zonesMapSystemPrompt(),
        userMessage: `Описание движения:\n${bioText}`,
        temperature: 0.0,
        modelId,
        maxTokens: 256,
        llmLog: chain ? { chain, step: 'anatomy.zones_map_llm' } : { step: 'anatomy.zones_map_llm' },
      })
    } catch (e) {
      logger.warn({ err: String(e), label }, 'ExerciseAnatomyService: step2 failed')
      await this.saveUnknown(normalized, modelId)
      return null
    }

    let parsed: { zones?: unknown }
    try {
      parsed = JSON.parse(stripMarkdownFences(rawStep2))
    } catch {
      await this.saveUnknown(normalized, modelId)
      return null
    }

    const zones = normalizeZones(parsed?.zones)
    if (zones.length === 0) {
      await this.saveUnknown(normalized, modelId)
      return null
    }

    await ExerciseAnatomyCache.updateOrCreate(
      { normalizedLabel: normalized },
      {
        status: 'ok',
        zones,
        promptVersion: EXERCISE_ANATOMY_PROMPT_VERSION,
        modelId,
      }
    )

    logger.info(
      {
        ...(chain ? { traceId: chain.traceId, userId: chain.userId, route: chain.route } : {}),
        step: 'anatomy.llm_ok',
        normalized,
        label,
        zones,
        bioPreview: bioText.slice(0, 200),
      },
      'ai:chain'
    )

    return zones
  }

  private static async saveUnknown(normalizedLabel: string, modelId: string) {
    await ExerciseAnatomyCache.updateOrCreate(
      { normalizedLabel },
      {
        status: 'unknown',
        zones: null,
        promptVersion: EXERCISE_ANATOMY_PROMPT_VERSION,
        modelId,
      }
    )
  }

  /**
   * Обогащает zones для списка упражнений: один двухшаговый проход на уникальное нормализованное имя (кэш сокращает вызовы).
   */
  static async refineZonesForExercises(
    exercises: AiExercise[],
    chain?: AiParseChainCtx
  ): Promise<AiExercise[]> {
    if (!YandexAiService.isEnabled()) return exercises
    if (!Array.isArray(exercises) || exercises.length === 0) return exercises

    logger.info(
      {
        ...(chain ? { traceId: chain.traceId, userId: chain.userId, route: chain.route } : {}),
        step: 'anatomy.refine_in',
        count: exercises.length,
        exercises: exercises.map((e) => ({
          name: e.name,
          displayName: e.displayName,
          zonesBefore: e.zones ?? null,
        })),
      },
      'ai:chain'
    )

    const byNorm = new Map<
      string,
      { label: string; notes?: string | null; indices: number[] }
    >()

    exercises.forEach((ex, i) => {
      const label = surfaceLabel(ex)
      const norm = normalizeExerciseLabel(label)
      if (!norm) return
      const cur = byNorm.get(norm)
      if (!cur) {
        byNorm.set(norm, {
          label,
          notes: ex.notes,
          indices: [i],
        })
      } else {
        cur.indices.push(i)
        if (!cur.notes?.trim() && ex.notes?.trim()) cur.notes = ex.notes
      }
    })

    if (byNorm.size === 0) return exercises

    const normalizedKeys = [...byNorm.keys()]
    const existing = await ExerciseAnatomyCache.query().whereIn('normalizedLabel', normalizedKeys)
    const rowByNorm = new Map(existing.map((r) => [r.normalizedLabel, r]))

    const resolved = new Map<string, string[] | null>()

    for (const norm of normalizedKeys) {
      const row = rowByNorm.get(norm)
      if (row && row.promptVersion === EXERCISE_ANATOMY_PROMPT_VERSION) {
        if (row.status === 'ok' && Array.isArray(row.zones) && row.zones.length > 0) {
          resolved.set(norm, normalizeZones(row.zones))
          continue
        }
        if (row.status === 'unknown') {
          resolved.set(norm, null)
          continue
        }
      }

      const meta = byNorm.get(norm)!
      const zones = await this.resolveZonesForExercise(
        {
          name: meta.label,
          displayName: meta.label,
          notes: meta.notes ?? undefined,
        },
        chain
      )
      resolved.set(norm, zones)
    }

    const out = exercises.map((ex) => {
      const norm = normalizeExerciseLabel(surfaceLabel(ex))
      if (!norm) return ex
      const z = resolved.get(norm)
      if (z === undefined) return ex
      if (z === null || z.length === 0) return ex
      const next: AiExercise = { ...ex, zones: z }
      if (ex.zoneWeights && Object.keys(ex.zoneWeights).length > 0) {
        const wArr = distributeZoneWeights(z, ex.zoneWeights)
        next.zoneWeights = Object.fromEntries(z.map((zone, i) => [zone, wArr[i]!]))
      }
      return next
    })

    logger.info(
      {
        ...(chain ? { traceId: chain.traceId, userId: chain.userId, route: chain.route } : {}),
        step: 'anatomy.refine_out',
        uniqueNormalized: normalizedKeys.length,
        resolution: normalizedKeys.map((n) => ({ norm: n, zones: resolved.get(n) ?? 'skipped' })),
        exercises: out.map((e) => ({
          name: e.name,
          displayName: e.displayName,
          zonesAfter: e.zones ?? null,
        })),
      },
      'ai:chain'
    )

    return out
  }
}
