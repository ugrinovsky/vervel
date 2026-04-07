/**
 * Стабильный ключ для суффикса custom:id после матчинга к каталогу.
 * Одинаковые по смыслу названия (регистр, ё/е, пробелы, тире) → один id.
 *
 * Держите в синхроне с apps/api/app/services/exercise_match_helpers.ts → canonicalCustomExerciseKey
 */
import { normalizeExerciseLabel } from './textNormalize';

export function canonicalCustomExerciseKey(label: string): string {
  const t = normalizeExerciseLabel(label);
  if (!t) return 'unnamed';
  return t;
}
