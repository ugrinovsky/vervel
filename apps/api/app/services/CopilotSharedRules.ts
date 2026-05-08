/**
 * CopilotSharedRules — единый источник констант для Trainer Copilot и Athlete Copilot.
 * Любое изменение порогов или таблиц применяется к обоим сразу.
 */

// ─── Периодизация / TSB ────────────────────────────────────────────────────

/** TSB ниже этого значения → фаза Перегрузка → снижаем объём, меньше сессий */
export const TSB_OVERLOAD_THRESHOLD = -20

/** TSB выше этого значения → фаза Отдых/Пик → можно добавить сессию */
export const TSB_DELOAD_THRESHOLD = 15

// ─── Зоны мышц ─────────────────────────────────────────────────────────────

/** Сумма zonesLoadAbs за последние N дней, при которой зона считается перегруженной */
export const ZONE_OVERLOAD_THRESHOLD = 0.7

/** Окно в днях для расчёта перегруженности зоны */
export const ZONE_OVERLOAD_WINDOW_DAYS = 3

// ─── Объём ─────────────────────────────────────────────────────────────────

/** Множитель для sets при перегрузке (TSB < TSB_OVERLOAD_THRESHOLD) */
export const VOLUME_REDUCTION_OVERLOAD = 0.7

// ─── Cold start ─────────────────────────────────────────────────────────────

/** Минимум тренировок в истории чтобы Copilot строил осмысленный план */
export const COLD_START_MIN_WORKOUTS = 3

// ─── Расписание ─────────────────────────────────────────────────────────────

/**
 * Смещения дней от начала недели (0=Пн) для N сессий в неделю.
 * Сессии распределяются равномерно с акцентом на первую половину недели.
 */
export const SESSIONS_DAY_OFFSETS: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 5],
}

/**
 * Вычисляет целевое количество сессий с поправкой на фазу.
 */
export function adjustedSessions(base: number, tsb: number): number {
  if (tsb < TSB_OVERLOAD_THRESHOLD) return Math.max(1, base - 1)
  if (tsb > TSB_DELOAD_THRESHOLD) return Math.min(5, base + 1)
  return base
}

/**
 * Возвращает 'overload' | 'normal' | 'fresh' по TSB для текстовых подсказок.
 */
export function tsbCategory(tsb: number): 'overload' | 'normal' | 'fresh' {
  if (tsb < TSB_OVERLOAD_THRESHOLD) return 'overload'
  if (tsb > TSB_DELOAD_THRESHOLD) return 'fresh'
  return 'normal'
}

// ─── Зоны мышц: группировка для плана ──────────────────────────────────────

/** Зоны «верхнего блока» (плечевой пояс, грудь, руки, спина) */
export const UPPER_ZONES = ['chests', 'back', 'shoulders', 'biceps', 'triceps', 'forearms']

/** Зоны «нижнего блока» (ноги, ягодицы, икры) */
export const LOWER_ZONES = ['legs', 'glutes', 'calves']

/** Зоны «кора» */
export const CORE_ZONES = ['core', 'obliques']

/**
 * По списку перегруженных зон определяет какой блок (upper/lower/core/cardio) рекомендовать.
 */
export function recommendedBlock(overloadedZones: string[]): 'upper' | 'lower' | 'core' | 'cardio' {
  const upperOverloaded = overloadedZones.filter((z) => UPPER_ZONES.includes(z)).length
  const lowerOverloaded = overloadedZones.filter((z) => LOWER_ZONES.includes(z)).length

  // Оба блока перегружены → кардио или кор
  if (upperOverloaded >= 2 && lowerOverloaded >= 2) return 'cardio'
  // Верх перегружен → низ
  if (upperOverloaded > lowerOverloaded) return 'lower'
  // Низ перегружен → верх
  if (lowerOverloaded > upperOverloaded) return 'upper'
  // Нет явного перегруза → чередуем (кор или верх)
  return 'upper'
}

/**
 * Вычисляет перегруженные зоны по массиву zonesLoadAbs за последние N дней.
 * workouts — массив объектов { zonesLoadAbs: Record<string, number> }
 */
export function computeOverloadedZones(
  workouts: Array<{ zonesLoadAbs: Record<string, number> | null | undefined }>
): string[] {
  const totals: Record<string, number> = {}

  for (const w of workouts) {
    const abs = w.zonesLoadAbs
    if (!abs || typeof abs !== 'object') continue
    for (const [zone, load] of Object.entries(abs)) {
      totals[zone] = (totals[zone] ?? 0) + (Number(load) || 0)
    }
  }

  return Object.entries(totals)
    .filter(([, total]) => total > ZONE_OVERLOAD_THRESHOLD)
    .map(([zone]) => zone)
}
