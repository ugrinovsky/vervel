import { ExerciseCatalog, type CatalogExercise } from '#services/ExerciseCatalog'
import Workout, { WorkoutExercise, WorkoutSet } from '#models/workout';
import UserMeasurement from '#models/user_measurement'
import { distributeZoneWeights } from '#utils/zone_weights';
import logger from '@adonisjs/core/services/logger'
import { epochDate, nowDate, wallClockDate } from '#utils/date'

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

export interface WorkoutCalculationResult {
  /**
   * Relative per-session muscle profile (0..1), used for UI charts.
   * This is derived from `zonesLoadAbs` by scaling to the max zone within the workout.
   */
  zonesLoad: Record<string, number>;
  /**
   * Absolute per-session muscle load (0..1-ish), used for recovery/analytics.
   * Not normalized to the max zone.
   */
  zonesLoadAbs: Record<string, number>;
  totalIntensity: number;
  totalVolume: number;
}

/* ------------------------------------------------------------------ */
/* Constants (NO magic numbers) */
/* ------------------------------------------------------------------ */

const BODYBUILDING = {
  WEIGHT_NORMALIZATION_DIVIDER: 100,
  MAX_NORMALIZED_VOLUME: 10,
  /**
   * If athlete didn't log the weight (often saved as 0), we still want a non-zero
   * muscle stimulus based on reps so zones don't become 0.
   * This value is only used for load calculation, not for volume.
   */
  MISSING_WEIGHT_FALLBACK_KG: 1,
};

const CROSSFIT = {
  MAX_ROUNDS_FOR_FULL_LOAD: 5,
};

const CARDIO = {
  MAX_TIME_FOR_FULL_LOAD: 3600, // 1 час в секундах
};

const NORMALIZATION = {
  MIN_DENOMINATOR: 0.01,
  MAX_ZONE_LOAD: 1,
};

/**
 * Avatar recovery: displayed intensity = 1 − exp(−k × decayedAbs), where decayedAbs is the per-zone
 * max over sessions of (zonesLoadAbs × time decay). Smooth saturation so abs loads > 1 still map into 0..1.
 */
export const RECOVERY_INTENSITY_SATURATION_K = 1.2;

function recoveryDisplayIntensity(decayedAbs: number): number {
  const x = Math.max(0, Number(decayedAbs) || 0);
  if (x <= 0) return 0;
  return 1 - Math.exp(-RECOVERY_INTENSITY_SATURATION_K * x);
}

/** Есть ли сохранённая карта зон с ненулевой нагрузкой (пустой объект — пересчитываем из упражнений). */
function hasMeaningfulZonesLoad(zonesLoad: Record<string, number> | null | undefined): boolean {
  if (!zonesLoad || typeof zonesLoad !== 'object') return false;
  return Object.values(zonesLoad).some((v) => Number(v) > 0);
}

/* ------------------------------------------------------------------ */
/* Calculator */
/* ------------------------------------------------------------------ */

export class WorkoutCalculator {
  /**
   * Converts a stored workout date into a JS Date treating the value as a wall-clock local datetime.
   * Important: the app intentionally stores/uses datetimes without timezone semantics in the UI.
   * If we use Luxon's absolute timestamps here, a workout saved as "19:00+00" would become "22:00"
   * in UTC+3 and could be incorrectly treated as a future workout and skipped.
   */
  private static toWallClockJsDate(value: any): Date {
    if (value instanceof Date) return value
    if (value && typeof value.toJSDate === 'function') {
      // Luxon DateTime (or compatible) – use its JS date.
      return value.toJSDate()
    }
    const iso = typeof value === 'string'
      ? value
      : (value && typeof value.toISO === 'function')
        ? value.toISO()
        : String(value ?? '')

    const local = iso.slice(0, 19) // "YYYY-MM-DDTHH:mm:ss"
    const [datePart, timePart] = local.split('T')
    const [y, mo, d] = (datePart ?? '').split('-').map(Number)
    const [h, min, s] = (timePart ?? '').split(':').map(Number)
    if (!y || !mo || !d) return epochDate()
    return wallClockDate(y, mo, d, h || 0, min || 0, s || 0)
  }
  /**
   * Главная точка входа
   */
  static async calculateZoneLoads(
    exercises: WorkoutExercise[],
    workoutType: Workout['workoutType'],
    rpe?: number | null,
    userId?: number
  ): Promise<WorkoutCalculationResult> {
    const zoneLoadsAbs: Record<string, number> = {};
    let totalVolume = 0;
    let totalExerciseLoad = 0;
    let countedExercises = 0;

    let userBodyWeight: number | null = null;
    if (userId && exercises.some(e => e.bodyweight)) {
      const m = await UserMeasurement.query()
        .where('userId', userId)
        .where('type', 'body_weight')
        .orderBy('loggedAt', 'desc')
        .first();
      userBodyWeight = m ? Number(m.value) : null;
    }

    const exerciseMap = await this.loadExercises(exercises);

    for (const input of exercises) {
      const catalogEntry = exerciseMap.get(input.exerciseId);

      // Prefer zones coming with the workout payload (AI-provided / custom),
      // because exerciseId matching can be wrong and would otherwise override correct zones.
      // Fallback to catalog zones when input has none.
      const zones = (input.zones && input.zones.length > 0) ? input.zones : catalogEntry?.zones;
      if (!zones || zones.length === 0) continue;

      const entry: CatalogExercise = catalogEntry ?? {
        id: input.exerciseId,
        title: input.name ?? input.exerciseId,
        category: 'strength',
        keywords: [],
        zones,
        intensity: 0.7,
        imageUrl: null,
      };

      const { load, volume } = this.calculateExerciseLoad(entry, input, workoutType, userBodyWeight);

      totalVolume += volume;
      if (load > 0) {
        totalExerciseLoad += load;
        countedExercises += 1;
      }

      // If exercise targets multiple zones, split load by zoneWeights (AI) or equally.
      const weightShares = distributeZoneWeights(zones, input.zoneWeights);
      for (let i = 0; i < zones.length; i++) {
        const zone = zones[i]!;
        const share = weightShares[i] ?? 1 / Math.max(zones.length, 1);
        zoneLoadsAbs[zone] = (zoneLoadsAbs[zone] ?? 0) + load * share;
      }
    }

    const baseTotalIntensity = Math.min(
      totalExerciseLoad / Math.max(countedExercises, 1),
      NORMALIZATION.MAX_ZONE_LOAD
    )

    // Apply RPE to the absolute load (this represents perceived stress).
    const { zonesLoadAbs: zonesLoadAbsScaled, totalIntensity: totalIntensityScaled } =
      this.applyRpe(zoneLoadsAbs, baseTotalIntensity, rpe)

    const zonesLoadRel = this.toRelativeZonesLoad(zonesLoadAbsScaled)

    return {
      zonesLoad: zonesLoadRel,
      zonesLoadAbs: zonesLoadAbsScaled,
      totalIntensity: totalIntensityScaled,
      totalVolume,
    }
  }

  /* ---------------------------------------------------------------- */
  /* Internal helpers */
  /* ---------------------------------------------------------------- */

  private static async loadExercises(
    inputs: WorkoutExercise[]
  ): Promise<Map<string, CatalogExercise>> {
    const ids = [...new Set(inputs.map((e) => e.exerciseId))];
    return ExerciseCatalog.findMany(ids);
  }

  private static calculateExerciseLoad(
    exercise: CatalogExercise,
    input: WorkoutExercise,
    workoutType: Workout['workoutType'],
    userBodyWeight?: number | null
  ): { load: number; volume: number } {
    const baseIntensity = exercise.intensity;

    switch (workoutType) {
      case 'bodybuilding':
        return this.calculateBodybuildingLoad(baseIntensity, input, userBodyWeight);

      case 'crossfit':
        return this.calculateCrossfitLoad(baseIntensity, input);

      case 'cardio':
        return this.calculateCardioLoad(baseIntensity, input);
    }
  }

  private static calculateBodybuildingLoad(
    baseIntensity: number,
    input: WorkoutExercise,
    userBodyWeight?: number | null
  ): { load: number; volume: number } {
    if (!input.sets || input.sets.length === 0) {
      return { load: 0, volume: 0 };
    }

    let totalVolume = 0;
    let totalNormalizedLoad = 0;

    // Считаем по каждому подходу
    input.sets.forEach((set: WorkoutSet) => {
      const reps = set.reps || 0;
      const loggedWeight =
        typeof set.weight === 'number' && Number.isFinite(set.weight) ? set.weight : null

      // If the athlete explicitly provided a weight, always prefer it (even if bodyweight=true).
      // Otherwise, when bodyweight=true we use the athlete's body weight (if available).
      // For non-bodyweight exercises without a logged weight, volume stays 0 but load uses a minimal fallback.
      const explicit = loggedWeight != null && loggedWeight > 0 ? loggedWeight : null

      const weightForVolume = explicit
        ? explicit
        : input.bodyweight
          ? (userBodyWeight ?? 0)
          : 0

      const weightForLoad = explicit
        ? explicit
        : input.bodyweight
          ? (userBodyWeight ?? 0)
          : BODYBUILDING.MISSING_WEIGHT_FALLBACK_KG

      totalVolume += reps * weightForVolume;

      const normalizedVolume = Math.min(
        (reps * (weightForLoad / BODYBUILDING.WEIGHT_NORMALIZATION_DIVIDER)) /
          BODYBUILDING.MAX_NORMALIZED_VOLUME,
        NORMALIZATION.MAX_ZONE_LOAD
      );

      totalNormalizedLoad += normalizedVolume;
    });

    // Суммируем нагрузку по подходам (капим до 1.0).
    // Это позволяет 2–3 тяжелым сета́м давать «полную» нагрузку,
    // а малый вес/объём — частичную.
    const normalizedLoad = Math.min(totalNormalizedLoad, NORMALIZATION.MAX_ZONE_LOAD);

    return {
      load: baseIntensity * normalizedLoad,
      volume: totalVolume,
    };
  }

  private static calculateCrossfitLoad(
    baseIntensity: number,
    input: WorkoutExercise
  ): { load: number; volume: number } {
    const rounds = input.rounds || 1;

    const roundsFactor = Math.min(
      rounds / CROSSFIT.MAX_ROUNDS_FOR_FULL_LOAD,
      NORMALIZATION.MAX_ZONE_LOAD
    );

    return {
      load: baseIntensity * roundsFactor,
      volume: 0,
    };
  }

  private static calculateCardioLoad(
    baseIntensity: number,
    input: WorkoutExercise
  ): { load: number; volume: number } {
    const time = input.duration || 1;

    const timeFactor = Math.min(time / CARDIO.MAX_TIME_FOR_FULL_LOAD, NORMALIZATION.MAX_ZONE_LOAD);

    return {
      load: baseIntensity * timeFactor,
      volume: 0,
    };
  }

  /**
   * Определяет уровень нагрузки тренировки для отображения в календаре.
   * hasExercises — true если у тренировки были упражнения, даже если они не нашлись в каталоге.
   */
  static getLoadLevel(
    volume: number,
    intensity: number,
    hasExercises: boolean
  ): 'none' | 'low' | 'medium' | 'high' {
    if (volume > 15000) return 'high';
    if (volume > 10000) return 'medium';
    if (volume > 0) return 'low';
    if (intensity > 0) return 'low';
    if (hasExercises) return 'low';
    return 'none';
  }

  private static toRelativeZonesLoad(zonesLoadAbs: Record<string, number>): Record<string, number> {
    const values = Object.values(zonesLoadAbs)
    if (values.length === 0) return {}
    const maxLoad = Math.max(...values, NORMALIZATION.MIN_DENOMINATOR)
    const rel: Record<string, number> = {}
    for (const [zone, load] of Object.entries(zonesLoadAbs)) {
      rel[zone] = Math.min((Number(load) || 0) / maxLoad, NORMALIZATION.MAX_ZONE_LOAD)
    }
    return rel
  }

  /**
   * RPE scaling.
   * - UI uses 1..5, DB constraint currently allows 1..10. Support both.
   */
  private static applyRpe(
    zonesLoadAbs: Record<string, number>,
    totalIntensity: number,
    rpe?: number | null
  ): { zonesLoadAbs: Record<string, number>; totalIntensity: number } {
    // No RPE provided = neutral (treat as "3/5"), don't change calculated load.
    if (rpe == null) return { zonesLoadAbs, totalIntensity }
    const n = Number(rpe)
    if (!Number.isFinite(n) || n <= 0) return { zonesLoadAbs, totalIntensity }

    // Convert to 1..5 scale (UI) while still supporting stored 1..10.
    const rpe5 = Math.max(1, Math.min(n <= 5 ? n : n / 2, 5))
    // Scale around "neutral" 3/5:
    // 1/5 -> 0.70, 3/5 -> 1.00, 5/5 -> 1.30 (linear).
    const slope = 0.15
    const rpeFactor = Math.max(0.5, Math.min(1 + (rpe5 - 3) * slope, 1.5))

    const scaled: Record<string, number> = {}
    for (const [zone, load] of Object.entries(zonesLoadAbs)) {
      scaled[zone] = Math.max(0, (Number(load) || 0) * rpeFactor)
    }
    return {
      zonesLoadAbs: scaled,
      totalIntensity: Math.max(0, totalIntensity * rpeFactor),
    }
  }

  /**
   * Рассчитать текущее состояние мышц с учётом затухания нагрузки.
   *
   * По каждой зоне берём **максимум** (нагрузка_сеанса × decay), а не сумму по всем тренировкам:
   * иначе 3–4 ноги за неделю бесконечно копят «100% усталости», хотя последняя сессия была давно.
   *
   * decay = e^(-λ × daysAgo), λ = 0.3
   * Для **одной** тренировки: сегодня = 100% вклада, 1д ≈ 74%, 2д ≈ 55%, …
   *
   * Для каждой зоны возвращает:
   *  - intensity: отображаемая усталость 0–1, 1 − exp(−k × decayedAbs), k = RECOVERY_INTENSITY_SATURATION_K
   *  - lastTrainedDaysAgo: дней с последнего раза, когда зона получила нагрузку
   *  - peakLoad: max нагрузка по зоне за один сеанс в окне, нормализованная к 0–1
   */
  static async calculateRecoveryState(
    workouts: Workout[],
    now: Date = nowDate()
  ): Promise<{
    zones: Record<string, { intensity: number; lastTrainedDaysAgo: number; peakLoad: number }>;
    missingWeights: {
      workoutsCount: number;
      setsCount: number;
      lastWorkoutId: number | null;
      lastWorkoutDate: string | null;
    };
    /** Прошедшие сессии с контентом, но без оценки субъективной нагрузки (RPE). */
    missingRpe: {
      workoutsCount: number;
      lastWorkoutId: number | null;
      lastWorkoutDate: string | null;
    };
    totalWorkouts: number;
    lastWorkoutDaysAgo: number | null;
  }> {
    const DECAY_LAMBDA = 0.3;
    const rawZones: Record<string, number> = {};
    const zoneLastTrained: Record<string, number> = {};
    const zonePeakLoad: Record<string, number> = {};

    if (workouts.length === 0) {
      return {
        zones: {},
        missingWeights: { workoutsCount: 0, setsCount: 0, lastWorkoutId: null, lastWorkoutDate: null },
        missingRpe: { workoutsCount: 0, lastWorkoutId: null, lastWorkoutDate: null },
        totalWorkouts: 0,
        lastWorkoutDaysAgo: null,
      };
    }

    let minDaysAgo = Infinity;
    let missingSetsCount = 0
    const workoutsWithMissingWeights = new Set<number>()
    let lastMissingWorkoutId: number | null = null
    let lastMissingWorkoutDate: string | null = null
    let lastMissingWorkoutDaysAgo: number | null = null

    const workoutsMissingRpe = new Set<number>()
    let lastMissingRpeWorkoutId: number | null = null
    let lastMissingRpeWorkoutDate: string | null = null
    let lastMissingRpeDaysAgo: number | null = null

    const debugWorkouts: Array<{
      id: number | string | null
      date: string
      workoutType: any
      daysAgo: number
      skippedFuture: boolean
      exercisesCount: number
      exercisesZonesCount: number
      zonesLoad: Record<string, number>
    }> = []

    for (const workout of workouts) {
      const workoutDate = WorkoutCalculator.toWallClockJsDate((workout as any).date)
      const rawDaysAgo = (now.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24);
      const isFuture = rawDaysAgo < 0
      // For the avatar "recovery" view we still want to reflect the most recent workload
      // even if the workout time is later today (wall-clock/timezone artefacts, edits, etc.).
      // So we clamp future workouts to daysAgo=0 instead of skipping them.
      const daysAgo = isFuture ? 0 : rawDaysAgo
      const decayFactor = Math.exp(-DECAY_LAMBDA * daysAgo);

      if (daysAgo < minDaysAgo) minDaysAgo = daysAgo;

      // Prefer stored zonesLoad when it already has meaningful data (fast + stable).
      // Otherwise recalculate from exercises (older DB rows may have zonesLoad={}).
      // This also avoids "zeroing" zones in tests/rows that intentionally provide zonesLoad.
      let zonesLoad: Record<string, number> = {};
      const storedAbs = (workout as any).zonesLoadAbs as Record<string, number> | null | undefined
      if (hasMeaningfulZonesLoad(storedAbs as any)) {
        zonesLoad = { ...(storedAbs as any) };
      } else if (Array.isArray(workout.exercises) && workout.exercises.length > 0) {
        const calc = await WorkoutCalculator.calculateZoneLoads(
          workout.exercises,
          workout.workoutType,
          workout.rpe,
          workout.userId
        );
        zonesLoad = calc.zonesLoadAbs;
      } else {
        zonesLoad = (storedAbs as any) || {};
      }

      debugWorkouts.push({
        id: (workout as any).id ?? null,
        date: String((workout as any).date),
        workoutType: (workout as any).workoutType,
        daysAgo,
        skippedFuture: isFuture,
        exercisesCount: Array.isArray((workout as any).exercises) ? (workout as any).exercises.length : 0,
        exercisesZonesCount: Array.isArray((workout as any).exercises)
          ? (workout as any).exercises.filter((e: any) => Array.isArray(e?.zones) && e.zones.length > 0).length
          : 0,
        zonesLoad,
      })

      // Missing weights diagnostics (for UI warning).
      // For strength-like workouts we consider a set "missing weight" when reps>0 and weight is null/undefined/0
      // and it's not explicitly marked as bodyweight.
      const exs = Array.isArray((workout as any).exercises) ? (workout as any).exercises : []
      for (const ex of exs) {
        if (ex?.bodyweight) continue
        const sets = Array.isArray(ex?.sets) ? ex.sets : []
        for (const s of sets) {
          const reps = Number(s?.reps) || 0
          const w = s?.weight
          const isMissing = reps > 0 && (w == null || Number(w) === 0)
          if (!isMissing) continue
          missingSetsCount += 1
          const wid = Number((workout as any).id)
          if (Number.isFinite(wid)) workoutsWithMissingWeights.add(wid)
          // Track the most recent workout (smallest daysAgo)
          if (lastMissingWorkoutDaysAgo == null || daysAgo < lastMissingWorkoutDaysAgo) {
            lastMissingWorkoutId = Number.isFinite(wid) ? wid : null
            lastMissingWorkoutDate = String((workout as any).date ?? null)
            lastMissingWorkoutDaysAgo = daysAgo
          }
        }
      }

      // Subjective load (RPE): nudge UI when the session clearly happened but no rating was saved.
      const exListForRpe = Array.isArray((workout as any).exercises) ? (workout as any).exercises : []
      const storedAbsForRpe = (workout as any).zonesLoadAbs as Record<string, number> | null | undefined
      const hasWorkoutContent =
        exListForRpe.length > 0 || hasMeaningfulZonesLoad(storedAbsForRpe)
      const rawRpe = (workout as any).rpe
      const nRpe = Number(rawRpe)
      const hasRpe =
        rawRpe != null && rawRpe !== '' && Number.isFinite(nRpe) && nRpe >= 1
      if (!isFuture && hasWorkoutContent && !hasRpe) {
        const wid = Number((workout as any).id)
        if (Number.isFinite(wid)) workoutsMissingRpe.add(wid)
        if (lastMissingRpeDaysAgo == null || daysAgo < lastMissingRpeDaysAgo) {
          lastMissingRpeWorkoutId = Number.isFinite(wid) ? wid : null
          lastMissingRpeWorkoutDate = String((workout as any).date ?? null)
          lastMissingRpeDaysAgo = daysAgo
        }
      }

      for (const [zone, load] of Object.entries(zonesLoad)) {
        const numLoad = Number(load) || 0;
        const decayed = numLoad * decayFactor;
        rawZones[zone] = Math.max(rawZones[zone] || 0, decayed);
        zonePeakLoad[zone] = Math.max(zonePeakLoad[zone] || 0, numLoad);

        if (zoneLastTrained[zone] === undefined || daysAgo < zoneLastTrained[zone]) {
          zoneLastTrained[zone] = daysAgo;
        }
      }
    }

    // peakLoad: пик за один сеанс по зоне, нормализованный по максимуму среди зон
    // intensity: сглаженная сатурация от decayedAbs (не жёсткий min(..., 1))
    const peakValues = Object.values(zonePeakLoad);
    const maxPeak = Math.max(...peakValues, NORMALIZATION.MIN_DENOMINATOR);

    const zones: Record<string, { intensity: number; lastTrainedDaysAgo: number; peakLoad: number }> = {};

    for (const zone of Object.keys(rawZones)) {
      zones[zone] = {
        intensity: recoveryDisplayIntensity(rawZones[zone]),
        lastTrainedDaysAgo: Math.round(zoneLastTrained[zone] ?? 0),
        peakLoad: Math.min(zonePeakLoad[zone] / maxPeak, NORMALIZATION.MAX_ZONE_LOAD),
      };
    }

    logger.info(
      {
        workoutCount: workouts.length,
        workouts: debugWorkouts,
        computedZones: zones,
      },
      'avatar:recovery calculator'
    )

    return {
      zones,
      missingWeights: {
        workoutsCount: workoutsWithMissingWeights.size,
        setsCount: missingSetsCount,
        lastWorkoutId: lastMissingWorkoutId,
        lastWorkoutDate: lastMissingWorkoutDate,
      },
      missingRpe: {
        workoutsCount: workoutsMissingRpe.size,
        lastWorkoutId: lastMissingRpeWorkoutId,
        lastWorkoutDate: lastMissingRpeWorkoutDate,
      },
      totalWorkouts: workouts.length,
      lastWorkoutDaysAgo: minDaysAgo === Infinity ? null : Math.round(minDaysAgo),
    };
  }

  static async calculatePeriodStats(
    workouts: Workout[],
    period: string = 'custom',
    /** Для тестов и детерминизма (например, hasMissingRpe vs «будущее»). */
    at: Date = nowDate()
  ): Promise<{
    workoutsCount: number;
    totalVolume: number;
    avgIntensity: number;
    byType: Record<string, number>;
    zones: Record<string, number>;
    timeline: Array<{
      id: number;
      date: string;
      intensity: number;
      volume: number;
      type: string;
      scheduledWorkoutId: number | null;
      loadLevel: 'none' | 'low' | 'medium' | 'high';
      zones: Record<string, number>;
      hasMissingWeights?: boolean;
      hasMissingRpe?: boolean;
    }>;
    period: string;
  }> {
    if (workouts.length === 0) {
      return {
        workoutsCount: 0,
        totalVolume: 0,
        avgIntensity: 0,
        byType: {},
        zones: {},
        timeline: [],
        period,
      };
    }

    /** По каждой тренировке: абсолютные зоны (новые) или пересчёт из exercises. */
    const perWorkoutZonesAbs: Record<string, number>[] = [];
    for (const workout of workouts) {
      const abs = (workout as any).zonesLoadAbs as Record<string, number> | null | undefined
      if (hasMeaningfulZonesLoad(abs as any)) {
        perWorkoutZonesAbs.push({ ...(abs as any) });
        continue;
      }
      if (Array.isArray(workout.exercises) && workout.exercises.length > 0) {
        const calc = await WorkoutCalculator.calculateZoneLoads(
          workout.exercises,
          workout.workoutType,
          workout.rpe,
          workout.userId
        );
        perWorkoutZonesAbs.push({ ...calc.zonesLoadAbs });
      } else {
        perWorkoutZonesAbs.push({});
      }
    }

    let totalVolume = 0;
    let totalIntensity = 0;
    const byType: Record<string, number> = {};
    const zones: Record<string, number> = {};

    workouts.forEach((workout, i) => {
      // ✅ Принудительно конвертируем в число
      const volume = Number(workout.totalVolume) || 0;
      totalVolume += volume;

      const intensity =
        typeof workout.totalIntensity === 'string'
          ? parseFloat(workout.totalIntensity)
          : workout.totalIntensity || 0;
      totalIntensity += intensity;

      const type = workout.workoutType || 'unknown';
      byType[type] = (byType[type] || 0) + 1;

      const zonesLoadAbs = perWorkoutZonesAbs[i] ?? {};
      Object.entries(zonesLoadAbs).forEach(([zone, load]) => {
        zones[zone] = (zones[zone] || 0) + (Number(load) || 0);
      });
    });

    const zoneValues = Object.values(zones);
    if (zoneValues.length > 0) {
      const maxZone = Math.max(...zoneValues, NORMALIZATION.MIN_DENOMINATOR);
      Object.keys(zones).forEach((zone) => {
        zones[zone] = Math.min(zones[zone] / maxZone, NORMALIZATION.MAX_ZONE_LOAD);
      });
    }

    const statsNow = at;
    const timeline = workouts.map((w, i) => {
      const volume = Number(w.totalVolume) || 0;
      const intensity =
        typeof w.totalIntensity === 'string' ? parseFloat(w.totalIntensity) : w.totalIntensity || 0;
      const hasExercises = Array.isArray(w.exercises) && w.exercises.length > 0;
      const hasMissingWeights = Array.isArray(w.exercises) && w.exercises.some((ex) =>
        !ex.bodyweight &&
        (ex.sets ?? []).some((s) => {
          const reps = Number(s.reps) || 0;
          const weight = s.weight;
          return reps > 0 && (weight == null || Number(weight) === 0);
        })
      );
      const zonesAbs = perWorkoutZonesAbs[i] ?? {};
      const storedAbsForRpe = (w as any).zonesLoadAbs as Record<string, number> | null | undefined;
      const hasWorkoutContent = hasExercises || hasMeaningfulZonesLoad(storedAbsForRpe);
      const workoutDate = WorkoutCalculator.toWallClockJsDate((w as any).date);
      const rawDaysAgo =
        (statsNow.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24);
      const isFuture = rawDaysAgo < 0;
      const rawRpe = (w as any).rpe;
      const nRpe = Number(rawRpe);
      const hasRpe = rawRpe != null && rawRpe !== '' && Number.isFinite(nRpe) && nRpe >= 1;
      const rpeTracked = w.workoutType !== 'crossfit';
      const hasMissingRpe = rpeTracked && !isFuture && hasWorkoutContent && !hasRpe;
      return {
        id: w.id,
        date: w.date.toString(),
        intensity,
        volume,
        type: w.workoutType || 'unknown',
        scheduledWorkoutId: w.scheduledWorkoutId ?? null,
        loadLevel: WorkoutCalculator.getLoadLevel(volume, intensity, hasExercises),
        // For timeline we keep a relative profile (good for charts) derived from absolute zones.
        zones: WorkoutCalculator.toRelativeZonesLoad(zonesAbs),
        hasMissingWeights,
        hasMissingRpe,
      };
    });

    return {
      workoutsCount: workouts.length,
      totalVolume,
      avgIntensity: totalIntensity / workouts.length,
      byType,
      zones,
      timeline,
      period,
    };
  }
}
