/**
 * Текст для интерфейса: убирает префикс custom: (любой регистр), подчёркивания → пробелы.
 * Используйте для exerciseId и для имён, если бэкенд/данные могли оставить префикс.
 */
export function exerciseIdForDisplay(raw: string | null | undefined): string {
  const t = String(raw ?? '').trim();
  if (!t) return t;
  return t.replace(/^custom:/i, '').replace(/_/g, ' ').trim();
}
