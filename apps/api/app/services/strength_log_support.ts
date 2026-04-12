/**
 * Чистая логика силового журнала — закрепления и топ по частоте (юнит-тестируемо).
 */

export function normalizePinnedExerciseIdList(exerciseIds: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of exerciseIds) {
    const t = id.trim()
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

export function pickTopExerciseIdsBySessionCount(
  sessionCounts: Map<string, number>,
  limit: number
): string[] {
  return [...sessionCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([id]) => id)
}
