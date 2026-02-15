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
  mixed: '💪 Смешанная',
};

export const getWorkoutTypeLabel = (type: string): string =>
  WORKOUT_TYPE_LABELS[type] ?? '🏋️ Бодибилдинг';

export const getWorkoutEffortLabel = (volume: number): string => {
  if (volume > 10000) return '⚡ Сегодня была тяжелая тренировка!';
  if (volume > 5000) return '💪 Хорошая нагрузка';
  return '🏋️ Поддерживающая тренировка';
};
