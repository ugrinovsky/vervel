import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { MUSCLE_ZONES } from '#services/ExerciseCatalog'
import { YandexAiService, type AiExercise } from '#services/YandexAiService'

const ZONES_LIST = MUSCLE_ZONES.map((z) => `"${z}"`).join(',')

export class AiZonesService {
  private static systemPrompt(): string {
    return `Ты определяешь zones (зоны мышц) для упражнений.

Верни ТОЛЬКО JSON, без markdown и пояснений.

Формат: {"zones":[["back","biceps"],["glutes","legs","back"]]}

Правила:
- Вход — JSON с массивом exercises, порядок важен.
- Верни zones как массив массивов СТРОГО в том же порядке и той же длины, что и exercises.
- Каждый zones[i] содержит 1–4 значения только из списка: [${ZONES_LIST}]
- Выбирай зоны по смыслу движения, а не по случайным словам.`
  }

  private static normalizeZones(zones: unknown): string[] {
    const allowed = new Set(MUSCLE_ZONES as unknown as string[])
    const list = Array.isArray(zones) ? zones.map((z) => String(z)) : []
    return [...new Set(list)].filter((z) => allowed.has(z)).slice(0, 4)
  }

  /**
   * Refine zones for already-parsed AI exercises using one zones-only request.
   * Minimal safety: whitelist + length + positional alignment. No heuristics/repair loops.
   */
  static async refineZonesForExercises(exercises: AiExercise[]): Promise<AiExercise[]> {
    if (!YandexAiService.isEnabled()) return exercises

    const folderId = env.get('YANDEX_FOLDER_ID')!

    if (!Array.isArray(exercises) || exercises.length === 0) return exercises

    const payload = {
      exercises: exercises.map((e) => ({
        name: e.name,
        displayName: e.displayName,
        notes: e.notes ?? null,
      })),
    }

    let raw: string
    try {
      raw = await YandexAiService.callGptRaw({
        folderId,
        systemPrompt: this.systemPrompt(),
        userMessage: JSON.stringify(payload),
        temperature: 0.0,
        modelId: env.get('YANDEX_GPT_PARSE_MODEL', 'yandexgpt'),
        maxTokens: 2048,
      })
    } catch (e) {
      logger.warn({ err: String(e) }, 'AiZonesService: zones-only request failed')
      return exercises
    }

    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    let parsed: any
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return exercises
    }

    const zonesArr = Array.isArray(parsed?.zones) ? parsed.zones : null
    if (!zonesArr || zonesArr.length !== exercises.length) return exercises

    return exercises.map((e, i) => {
      const z = this.normalizeZones(zonesArr[i])
      return z.length > 0 ? { ...e, zones: z } : e
    })
  }
}

