import zones from '@/constants/zones';

const zoneMap = new Map(zones.map((zone) => [zone.id, zone.label]));

/**
 * Возвращает русское название мышечной зоны по id
 */
export function getZoneLabel(id: string): string {
  return zoneMap.get(id) ?? id;
}
