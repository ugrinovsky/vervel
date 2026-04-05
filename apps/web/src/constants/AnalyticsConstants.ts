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

  /**
   * Устаревший жёсткий порог (1 т); раньше отсекал почти все реальные сессии → прочерк «прогресс объёма».
   * Оставлен для совместимости импортов; в UI используйте MIN_VOLUME_FOR_VOLUME_PROGRESS.
   */
  MIN_VOLUME: 1000,

  /** Сессия попадает в сравнение «первая / вторая половина периода», если объём ≥ (кг). */
  MIN_VOLUME_FOR_VOLUME_PROGRESS: 1,

  /** Минимум таких сессий в таймлайне, чтобы показать % прогресса объёма */
  MIN_WORKOUTS_FOR_VOLUME_PROGRESS: 2,

  /** Минимальное количество тренировок с объемом для расчета прогресса (legacy) */
  MIN_WORKOUTS_FOR_PROGRESS: 4,

  /** Минимальное количество тренировок для отображения динамики объема */
  MIN_WORKOUTS_FOR_DYNAMICS: 6,

  /** Минимальное количество тренировок для расчета изменений */
  MIN_WORKOUTS_FOR_CHANGES: 2,
} as const;

/**
 * Пороги бейджа на карточках «Показатели».
 * У каждой метрики свой `score` в шкале 0–100 (чем выше — тем лучше для этой оси).
 *
 * Карта: Отлично ≥ EXCELLENT, Хорошо ≥ GOOD, Норма ≥ OK, иначе Слабо.
 * Для «Прогресс объёма» score = clamp(50 + 50×относит._изменение_среднего_объёма); 50 ≈ «без изменений».
 */
export const METRIC_CARD_BADGE_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 55,
  OK: 35,
} as const;

export function metricCardBadge(score: number | null | undefined): { label: string; cls: string } {
  if (score == null || Number.isNaN(score)) {
    return { label: '—', cls: 'text-white/40 bg-white/8' };
  }
  const s = Math.max(0, Math.min(100, score));
  const { EXCELLENT, GOOD, OK } = METRIC_CARD_BADGE_THRESHOLDS;
  if (s >= EXCELLENT) return { label: 'Отлично', cls: 'text-emerald-400 bg-emerald-400/10' };
  if (s >= GOOD) return { label: 'Хорошо', cls: 'text-emerald-300 bg-emerald-300/10' };
  if (s >= OK) return { label: 'Норма', cls: 'text-amber-400 bg-amber-400/10' };
  return { label: 'Слабо', cls: 'text-red-400 bg-red-400/10' };
}

/* -------------------------------- РАДАР -------------------------------- */

/**
 * Параметры для радарной диаграммы
 */
export const RADAR = {
  /** Максимальное значение для всех метрик радара */
  MAX_VALUE: 100,

  /** Процент затемнения цвета для заливки радара */
  DARKEN_PERCENT: 0.2,
} as const;

/** Длительность периода аналитики в неделях (для «тренировок в неделю» и радара «ритм») */
export const ANALYTICS_PERIOD_WEEKS: Record<'week' | 'month' | 'year', number> = {
  week: 1,
  month: 30 / 7,
  year: 365.25 / 7,
};

/**
 * Ориентир «высокого» суммарного объёма за период (кг) для шкалы радара 0–100%.
 * Не медицинская норма — только чтобы сравнивать неделю/месяц/год на одной шкале.
 */
export const RADAR_VOLUME_REF_KG: Record<'week' | 'month' | 'year', number> = {
  week: 12_000,
  month: 45_000,
  year: 520_000,
};

/** Целевая частота для шкалы «ритм» в радаре (тренировок в неделю) */
export const IDEAL_WORKOUTS_PER_WEEK = 3;

/**
 * Грубая оценка числа календарных дней в окне аналитики (для «активных дней» и долей).
 */
export function analyticsCalendarDaysApprox(period: 'week' | 'month' | 'year'): number {
  return Math.max(1, Math.round(ANALYTICS_PERIOD_WEEKS[period] * 7));
}

/** Как на API в calculatePeriodStats: сумма по сессиям, затем деление на max (пиковая зона = 1). */
const ZONES_AGG_MIN_DENOM = 0.01;

/**
 * Агрегировать `zones` с точек таймлайна так же, как бэкенд за период (сумма → нормализация к max).
 * Нужен для «Топ мышц»: тренд первой vs второй половины периода на сопоставимой шкале.
 */
export function aggregateZonesFromTimeline(
  entries: ReadonlyArray<{ zones?: Record<string, number> }>
): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const t of entries) {
    const z = t.zones ?? {};
    for (const [k, v] of Object.entries(z)) {
      acc[k] = (acc[k] ?? 0) + (Number(v) || 0);
    }
  }
  const vals = Object.values(acc);
  if (vals.length === 0) return {};
  const maxZ = Math.max(...vals, ZONES_AGG_MIN_DENOM);
  const out: Record<string, number> = {};
  for (const k of Object.keys(acc)) {
    out[k] = Math.min(acc[k]! / maxZ, 1);
  }
  return out;
}

/**
 * Ориентир среднего тоннажа за тренировку (кг), согласованный с RADAR_VOLUME_REF_KG и целевой частотой.
 * Для шкалы 0–100% в блоке «Объём/тренировку», не медицинская норма.
 */
export function referenceVolumePerSessionKg(period: 'week' | 'month' | 'year'): number {
  const weeks = ANALYTICS_PERIOD_WEEKS[period];
  const sessions = Math.max(0.5, weeks * IDEAL_WORKOUTS_PER_WEEK);
  return RADAR_VOLUME_REF_KG[period] / sessions;
}

/**
 * Насколько равномерно распределена нагрузка между задействованными зонами (0–100%).
 * 100% — доли зон близки к равным; низкое значение — удар по одной-двум группам.
 */
export function computeMuscleBalancePercent(zones: Record<string, number>): number {
  const zoneValues = Object.values(zones).map((v) => Number(v) || 0);
  if (zoneValues.length <= 1) return zoneValues.length === 1 ? 100 : 0;
  const total = zoneValues.reduce((s, v) => s + v, 0);
  if (total <= 0) return 0;
  const proportions = zoneValues.map((v) => v / total);
  const ideal = 1 / proportions.length;
  const deviation = proportions.reduce((s, p) => s + Math.abs(p - ideal), 0);
  const maxDeviation = 2 * (1 - ideal);
  return Math.round(Math.max(0, 1 - deviation / maxDeviation) * DISPLAY.PERCENT_MULTIPLIER);
}

/* -------------------------------- ЗОНЫ И ТИПЫ -------------------------------- */

/**
 * Лейблы для типов тренировок — source of truth в workoutTypes.ts
 */
export { WORKOUT_TYPE_CONFIG } from '@/constants/workoutTypes';

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
    ? `${(value / DISPLAY.VOLUME_TO_TONS_DIVIDER).toFixed(1)} т`
    : `${value} кг`;
}

/**
 * Форматировать объем без пробелов (для компактного отображения)
 */
export function formatVolumeCompact(value: number): string {
  return value >= DISPLAY.VOLUME_TO_TONS_THRESHOLD
    ? `${(value / DISPLAY.VOLUME_TO_TONS_DIVIDER).toFixed(1)}т`
    : `${value}кг`;
}
