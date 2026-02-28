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

const WORKOUT_TYPE_LABELS: Record<string, string> = {
  crossfit: '🔥 Кроссфит',
  cardio: '🏃 Кардио',
  bodybuilding: '🏋️ Бодибилдинг',
  mixed: '💪 Смешанная',
  unknown: '🏋️ Тренировка',
};

export const getWorkoutTypeLabel = (type: string): string =>
  WORKOUT_TYPE_LABELS[type] ?? '🏋️ Тренировка';
