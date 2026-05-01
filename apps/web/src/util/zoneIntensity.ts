/** Безопасно читает intensity из объекта зоны API (recovery avatar). */
export function intensityFromZoneState(raw: unknown): number {
  if (typeof raw !== 'object' || raw === null || !('intensity' in raw)) return 0;
  const v = Reflect.get(raw, 'intensity');
  return typeof v === 'number' ? v : 0;
}
