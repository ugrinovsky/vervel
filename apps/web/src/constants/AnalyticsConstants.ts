/**
 * Константы для аналитических расчетов и отображения
 * Централизованное хранилище всех пороговых значений и коэффициентов
 */

/* -------------------------------- ОТОБРАЖЕНИЕ -------------------------------- */

/**
 * Нормализация и форматирование
 */
export const DISPLAY = {
  /** Делитель для преобразования процентов (0-1 → 0-100) */
  PERCENT_MULTIPLIER: 100,

  /** Порог для форматирования объема в тоннах (>= 1000кг → тонны) */
  VOLUME_TO_TONS_THRESHOLD: 1000,

  /** Делитель для преобразования объема в тонны */
  VOLUME_TO_TONS_DIVIDER: 1000,

  /** Количество зон по умолчанию для отображения */
  DEFAULT_ZONES_TO_SHOW: 3,

  /** Топ N мышц для отображения */
  TOP_MUSCLES_COUNT: 5,
} as const;

/* -------------------------------- ПОРОГИ НАГРУЗКИ -------------------------------- */

/**
 * Пороговые значения для классификации относительной нагрузки мышц (в процентах)
 */
export const LOAD_THRESHOLDS = {
  /** >= 80% - Очень высокая нагрузка */
  VERY_HIGH: 80,

  /** >= 60% - Высокая нагрузка */
  HIGH: 60,

  /** >= 40% - Средняя нагрузка */
  MEDIUM: 40,

  /** >= 20% - Низкая нагрузка */
  LOW: 20,

  /** < 20% - Очень низкая нагрузка */
  // VERY_LOW - implicit (< LOW)
} as const;

/**
 * Текстовые метки для уровней нагрузки
 */
export const LOAD_LABELS = {
  VERY_HIGH: 'Очень высокая',
  HIGH: 'Высокая',
  MEDIUM: 'Средняя',
  LOW: 'Низкая',
  VERY_LOW: 'Очень низкая',
} as const;

/**
 * Получить текстовую метку для уровня нагрузки по проценту
 */
export function getLoadLabel(percentage: number): string {
  if (percentage >= LOAD_THRESHOLDS.VERY_HIGH) return LOAD_LABELS.VERY_HIGH;
  if (percentage >= LOAD_THRESHOLDS.HIGH) return LOAD_LABELS.HIGH;
  if (percentage >= LOAD_THRESHOLDS.MEDIUM) return LOAD_LABELS.MEDIUM;
  if (percentage >= LOAD_THRESHOLDS.LOW) return LOAD_LABELS.LOW;
  return LOAD_LABELS.VERY_LOW;
}

/* -------------------------------- ТРЕНДЫ -------------------------------- */

/**
 * Пороговые значения для определения тренда изменений (в процентах)
 */
export const TREND_THRESHOLDS = {
  /** Если изменение > 2% - тренд вверх */
  UP: 2,

  /** Если изменение < -2% - тренд вниз */
  DOWN: -2,

  /** Если |изменение| <= 2% - стабильно */
  // STABLE - implicit (between DOWN and UP)
} as const;

export type TrendDirection = 'up' | 'down' | 'stable';

/**
 * Определить направление тренда по изменению
 */
export function getTrendDirection(change: number): TrendDirection {
  if (change > TREND_THRESHOLDS.UP) return 'up';
  if (change < TREND_THRESHOLDS.DOWN) return 'down';
  return 'stable';
}

/* -------------------------------- МЕТРИКИ -------------------------------- */

/**
 * Параметры для расчета метрик
 */
export const METRICS = {
  /** Делитель для расчета частоты тренировок в неделю (предполагаем месяц = 4 недели) */
  WEEKS_PER_PERIOD: 4,

  /** Минимальный объем тренировки для учета в расчетах (кг) */
  MIN_VOLUME: 1000,

  /** Минимальное количество тренировок с объемом для расчета прогресса */
  MIN_WORKOUTS_FOR_PROGRESS: 4,

  /** Минимальное количество тренировок для отображения динамики объема */
  MIN_WORKOUTS_FOR_DYNAMICS: 6,

  /** Минимальное количество тренировок для расчета изменений */
  MIN_WORKOUTS_FOR_CHANGES: 2,
} as const;

/* -------------------------------- РАДАР -------------------------------- */

/**
 * Параметры для радарной диаграммы
 */
export const RADAR = {
  /** Максимальное значение для всех метрик радара */
  MAX_VALUE: 100,

  /** Коэффициент для расчета выносливости от интенсивности */
  ENDURANCE_COEFFICIENT: 0.8,

  /** Процент затемнения цвета для заливки радара */
  DARKEN_PERCENT: 0.2,
} as const;

/* -------------------------------- ЗОНЫ И ТИПЫ -------------------------------- */

/**
 * Лейблы для мышечных зон (используется в нескольких компонентах)
 */
export const ZONE_LABELS: Record<string, string> = {
  chests: 'Грудь',
  triceps: 'Трицепс',
  shoulders: 'Плечи',
  legMuscles: 'Ноги',
  trapezoids: 'Трапеции',
  calfMuscles: 'Икры',
  abdominalPress: 'Пресс',
  biceps: 'Бицепс',
  glutes: 'Ягодицы',
  backMuscles: 'Спина',
  forearms: 'Предплечья',
  obliquePress: 'Косые мышцы',
  core: 'Кор',
} as const;

/**
 * Лейблы для типов тренировок
 */
export const TYPE_LABELS: Record<string, string> = {
  mixed: 'Смешанная',
  crossfit: 'Кроссфит',
  bodybuilding: 'Бодибилдинг',
  cardio: 'Кардио',
} as const;

/**
 * Лейблы для периодов
 */
export const PERIOD_LABELS: Record<'week' | 'month' | 'year', string> = {
  week: 'неделю',
  month: 'месяц',
  year: 'год',
} as const;

/* -------------------------------- НОРМАЛИЗАЦИЯ -------------------------------- */

/**
 * Утилиты для нормализации данных
 */
export const NORMALIZATION = {
  /** Порог для определения, нужно ли делить значение на 100 (если > 1, то это 0-100, иначе 0-1) */
  PERCENT_THRESHOLD: 1,

  /** Делитель для нормализации процентов обратно в 0-1 */
  PERCENT_DIVIDER: 100,
} as const;

/**
 * Нормализовать зоны (конвертировать значения > 1 в диапазон 0-1)
 */
export function normalizeZones(zones: Record<string, number>): Record<string, number> {
  return Object.entries(zones).reduce<Record<string, number>>((acc, [zone, value]) => {
    acc[zone] = value > NORMALIZATION.PERCENT_THRESHOLD
      ? value / NORMALIZATION.PERCENT_DIVIDER
      : value;
    return acc;
  }, {});
}

/**
 * Нормализовать интенсивность (если > 1, значит уже в процентах 0-100, иначе переводим из 0-1)
 */
export function normalizeIntensity(intensity: number): number {
  return intensity > NORMALIZATION.PERCENT_THRESHOLD
    ? intensity
    : intensity * DISPLAY.PERCENT_MULTIPLIER;
}

/**
 * Форматировать объем (если >= 1000кг, то в тоннах)
 */
export function formatVolume(value: number): string {
  return value >= DISPLAY.VOLUME_TO_TONS_THRESHOLD
    ? `${Math.round(value / DISPLAY.VOLUME_TO_TONS_DIVIDER)}т`
    : `${value}кг`;
}
