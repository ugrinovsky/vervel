export { formatVolume, formatVolumeCompact } from '@/constants/AnalyticsConstants';
import { WORKOUT_TYPE_CONFIG } from '@/constants/AnalyticsConstants';

export const getWorkoutTypeLabel = (type: string): string =>
  WORKOUT_TYPE_CONFIG[type] ?? 'Тренировка';

export { exerciseIdForDisplay as exerciseIdToLabel } from '@/utils/exerciseIdForDisplay';
