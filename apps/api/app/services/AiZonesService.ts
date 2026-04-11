import { ExerciseAnatomyService } from '#services/ExerciseAnatomyService'
import type { AiParseChainCtx } from '#services/ai_parse_chain'
import type { AiExercise } from '#services/YandexAiService'

/**
 * Точка входа для уточнения zones после парсинга тренировки.
 * Реализация: {@link ExerciseAnatomyService} (двухшаговый CoT + кэш в БД).
 */
export class AiZonesService {
  static async refineZonesForExercises(
    exercises: AiExercise[],
    chain?: AiParseChainCtx
  ): Promise<AiExercise[]> {
    return ExerciseAnatomyService.refineZonesForExercises(exercises, chain)
  }
}
