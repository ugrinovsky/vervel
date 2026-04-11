/**
 * Распределяет доли нагрузки упражнения по зонам.
 * Используется при расчёте zonesLoad и после refine зон (когда список зон мог измениться).
 */
export function distributeZoneWeights(
  zones: string[],
  raw?: Record<string, number> | null
): number[] {
  const n = zones.length
  if (n === 0) return []
  if (!raw || Object.keys(raw).length === 0) {
    return Array(n).fill(1 / n)
  }

  const has = zones.map((z) => {
    const v = raw[z]
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null
  })

  let sumKnown = 0
  let knownCount = 0
  for (const h of has) {
    if (h != null) {
      sumKnown += h
      knownCount++
    }
  }

  if (knownCount === 0) {
    return Array(n).fill(1 / n)
  }

  if (knownCount === n) {
    if (sumKnown <= 0) return Array(n).fill(1 / n)
    return has.map((h) => h! / sumKnown)
  }

  const missing = n - knownCount
  const remainder = 1 - sumKnown
  if (remainder < 0 || sumKnown > 1 + 1e-6) {
    return has.map((h) => (h != null ? h / sumKnown : 0))
  }

  const perMissing = remainder / missing
  return has.map((h) => (h != null ? h : perMissing))
}
