import { TYPE_LABELS } from '@/constants/AnalyticsConstants';

export const formatVolume = (volume: number): string => {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)} т`;
  }
  return `${volume} кг`;
};

export const formatVolumeCompact = (volume: number): string => {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}т`;
  }
  return `${volume}кг`;
};

export const getWorkoutTypeLabel = (type: string): string =>
  TYPE_LABELS[type] ?? 'Тренировка';
