/**
 * Первая буква в верхний регистр (locale ru) — для отображения имён с ИИ, часто со строчной.
 * Остаток строки не меняем. Названия из каталога БД лучше не прогонять через это.
 */
export function capitalizeFirstForDisplay(s: string): string {
  const t = s.trim()
  if (!t) return t
  const chars = [...t]
  const head = chars[0]
  if (!head) return t
  const tail = chars.slice(1).join('')
  return head.toLocaleUpperCase('ru-RU') + tail
}

/** Разбиение на токены для матчинга рус/англ названий (Unicode-буквы и цифры). */
const TOKEN_SPLIT = /[^\p{L}\p{N}]+/u

/**
 * Общая нормализация для матчинга/стабильных ключей.
 * - Unicode NFKC
 * - нижний регистр
 * - ё → е
 * - разные тире → '-'
 * - множественные пробелы → один пробел
 *
 * Синхронно с apps/web/src/utils/textNormalize.ts
 */
export function normalizeExerciseLabel(s: string): string {
  const t = String(s ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[\u2013\u2014–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
  return t
}

export function tokenizeForMatch(s: string): string[] {
  return normalizeExerciseLabel(s)
    .split(TOKEN_SPLIT)
    .filter((t) => t.length >= 2)
}

/**
 * Доля пересечения относительно меньшего набора токенов.
 * 1.0 = все токены короткой строки есть в длинной.
 */
export function tokenSubsetOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const setB = new Set(b)
  let inter = 0
  for (const t of a) {
    if (setB.has(t)) inter++
  }
  return inter / Math.min(a.length, b.length)
}

const TITLE_MATCH_MIN = 0.7

export function displayNameMatchesCatalogTitle(displayName: string, catalogTitle: string): boolean {
  const a = tokenizeForMatch(displayName)
  const b = tokenizeForMatch(catalogTitle)
  if (a.length === 0 || b.length === 0) return false
  return (
    tokenSubsetOverlap(a, b) >= TITLE_MATCH_MIN || tokenSubsetOverlap(b, a) >= TITLE_MATCH_MIN
  )
}

/**
 * Стабильный ключ для суффикса custom:id (после того как каталог не сматчился).
 * Регистр, ё/е, пробелы, Unicode-тире → одна каноническая строка, меньше дублей в журнале/эталонах.
 *
 * Синхронно с apps/web/src/utils/canonicalCustomExerciseKey.ts
 */
export function canonicalCustomExerciseKey(label: string): string {
  const t = normalizeExerciseLabel(label)
  if (!t) return 'unnamed'
  return t
}
