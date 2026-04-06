/**
 * Стабильный ключ для суффикса custom:id после матчинга к каталогу.
 * Одинаковые по смыслу названия (регистр, ё/е, пробелы, тире) → один id.
 *
 * Держите в синхроне с apps/api/app/services/exercise_match_helpers.ts → canonicalCustomExerciseKey
 */
export function canonicalCustomExerciseKey(label: string): string {
  const t = label.trim().replace(/\s+/g, ' ')
  if (!t) return 'unnamed'
  return t
    .normalize('NFKC')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[\u2013\u2014–—]/g, '-')
    .trim()
}
