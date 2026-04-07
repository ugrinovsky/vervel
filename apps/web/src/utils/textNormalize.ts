/**
 * Общая нормализация для матчинга/стабильных ключей.
 * - Unicode NFKC
 * - нижний регистр
 * - ё → е
 * - разные тире → '-'
 * - множественные пробелы → один пробел
 *
 * Держите в синхроне с apps/api/app/services/exercise_match_helpers.ts → normalizeExerciseLabel
 */
export function normalizeExerciseLabel(s: string): string {
  return String(s ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[\u2013\u2014–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

