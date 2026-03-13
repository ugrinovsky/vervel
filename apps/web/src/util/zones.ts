import zones from '@/constants/zones';

const zoneMap = new Map(zones.map((zone) => [zone.id, zone.label]));

/**
 * Алиасы: короткие API-ключи и camelCase-варианты, которые не совпадают с zone.id.
 * Единственное место, где хранится маппинг мышечных зон — больше нигде не надо.
 */
const ALIASES: Record<string, string> = {
  // camelCase id из AnalyticsConstants/AvatarView
  legMuscles: 'Ноги',
  backMuscles: 'Спина',
  calfMuscles: 'Икры',
  glutealMuscles: 'Ягодицы',
  abdominalPress: 'Пресс',
  obliquePress: 'Косые мышцы',
  trapezoids: 'Трапеции',
  // короткие API-ключи из бэкенда
  back: 'Спина',
  legs: 'Ноги',
  glutes: 'Ягодицы',
  core: 'Кор',
  abs: 'Пресс',
  obliques: 'Косые мышцы',
  traps: 'Трапеции',
  calves: 'Икры',
  chest: 'Грудь',
  arms: 'Руки',
  neck: 'Шея',
};

/**
 * Возвращает русское название мышечной зоны по id.
 * Поддерживает zone.id из zones.ts, camelCase-алиасы и короткие API-ключи.
 */
export function getZoneLabel(id: string): string {
  return zoneMap.get(id) ?? ALIASES[id] ?? ALIASES[id.toLowerCase()] ?? id;
}
