export { formatVolume, formatVolumeCompact } from '@/constants/AnalyticsConstants';
import { WORKOUT_TYPE_CONFIG } from '@/constants/AnalyticsConstants';

export const getWorkoutTypeLabel = (type: string): string =>
  WORKOUT_TYPE_CONFIG[type] ?? 'Тренировка';

/**
 * Превращает exerciseId в читаемое название:
 * - снимает префикс "custom:" у кастомных упражнений
 * - заменяет подчёркивания на пробелы у каталожных
 */
export function exerciseIdToLabel(exerciseId: string): string {
  return exerciseId.replace(/^custom:/, '').replace(/_/g, ' ');
}
