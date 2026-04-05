import { ExerciseCatalog, type CatalogExercise } from '#services/ExerciseCatalog'
import Workout, { WorkoutExercise, WorkoutSet } from '#models/workout';
import UserMeasurement from '#models/user_measurement';

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

export interface WorkoutCalculationResult {
  zonesLoad: Record<string, number>;
  totalIntensity: number;
  totalVolume: number;
}

/* ------------------------------------------------------------------ */
/* Constants (NO magic numbers) */
/* ------------------------------------------------------------------ */

const BODYBUILDING = {
  WEIGHT_NORMALIZATION_DIVIDER: 100,
  MAX_NORMALIZED_VOLUME: 10,
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
   * Главная точка входа
   */
  static async calculateZoneLoads(
    exercises: WorkoutExercise[],
    workoutType: Workout['workoutType'],
    rpe?: number | null,
    userId?: number
  ): Promise<WorkoutCalculationResult> {
    const zoneLoads: Record<string, number> = {};
    let totalVolume = 0;

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

      // Use catalog entry if found; otherwise fall back to AI-provided zones
      const zones = catalogEntry?.zones ?? input.zones;
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

      for (const zone of zones) {
        zoneLoads[zone] = (zoneLoads[zone] ?? 0) + load;
      }
    }

    const result = this.normalizeResult(zoneLoads, totalVolume);

    // RPE scales the stored load on a 1–5 UI scale: RPE 5 (Максимум) = 100%, RPE 3 (Норм) = 60%, RPE 1 = 20%.
    // This reflects the athlete's actual perceived effort — if it felt easy, it stresses muscles less.
    if (rpe != null) {
      const rpeFactor = rpe / 5;
      for (const zone of Object.keys(result.zonesLoad)) {
        result.zonesLoad[zone] = Math.min(result.zonesLoad[zone] * rpeFactor, NORMALIZATION.MAX_ZONE_LOAD);
      }
      result.totalIntensity = Math.min(result.totalIntensity * rpeFactor, NORMALIZATION.MAX_ZONE_LOAD);
    }

    return result;
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
      const weight = (set.weight && set.weight > 0) ? set.weight : (input.bodyweight ? (userBodyWeight ?? 0) : 0);

      totalVolume += reps * weight;

      const normalizedVolume = Math.min(
        (reps * (weight / BODYBUILDING.WEIGHT_NORMALIZATION_DIVIDER)) /
          BODYBUILDING.MAX_NORMALIZED_VOLUME,
        NORMALIZATION.MAX_ZONE_LOAD
      );

      totalNormalizedLoad += normalizedVolume;
    });

    // Усредняем нагрузку по подходам
    const avgNormalizedLoad = totalNormalizedLoad / input.sets.length;

    return {
      load: baseIntensity * avgNormalizedLoad,
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

  private static normalizeResult(
    zoneLoads: Record<string, number>,
    totalVolume: number
  ): WorkoutCalculationResult {
    const values = Object.values(zoneLoads);

    if (values.length === 0) {
      return {
        zonesLoad: {},
        totalIntensity: 0,
        totalVolume: 0,
      };
    }

    const maxLoad = Math.max(...values, NORMALIZATION.MIN_DENOMINATOR);

    Object.keys(zoneLoads).forEach((zone) => {
      zoneLoads[zone] = Math.min(zoneLoads[zone] / maxLoad, NORMALIZATION.MAX_ZONE_LOAD);
    });

    const totalIntensity = values.reduce((a, b) => a + b, 0) / Math.max(values.length, 1);

    return {
      zonesLoad: zoneLoads,
      totalIntensity: Math.min(totalIntensity, NORMALIZATION.MAX_ZONE_LOAD),
      totalVolume,
    };
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
   *  - intensity: затухший вклад от «самого тяжёлого» сеанса в окне (0–1)
   *  - lastTrainedDaysAgo: дней с последнего раза, когда зона получила нагрузку
   *  - peakLoad: max нагрузка по зоне за один сеанс в окне, нормализованная к 0–1
   */
  static calculateRecoveryState(
    workouts: Workout[],
    now: Date = new Date()
  ): {
    zones: Record<string, { intensity: number; lastTrainedDaysAgo: number; peakLoad: number }>;
    totalWorkouts: number;
    lastWorkoutDaysAgo: number | null;
  } {
    const DECAY_LAMBDA = 0.3;
    const rawZones: Record<string, number> = {};
    const zoneLastTrained: Record<string, number> = {};
    const zonePeakLoad: Record<string, number> = {};

    if (workouts.length === 0) {
      return { zones: {}, totalWorkouts: 0, lastWorkoutDaysAgo: null };
    }

    let minDaysAgo = Infinity;

    for (const workout of workouts) {
      const workoutDate = workout.date.toJSDate
        ? workout.date.toJSDate()
        : new Date(workout.date.toString());
      const daysAgo = (now.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24);
      // Skip future workouts — they haven't happened yet
      if (daysAgo < 0) continue;
      const decayFactor = Math.exp(-DECAY_LAMBDA * daysAgo);

      if (daysAgo < minDaysAgo) minDaysAgo = daysAgo;

      const zonesLoad = workout.zonesLoad || {};
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
    // intensity: абсолютный cap 1.0 (уже не раздувается суммой сеансов)
    const peakValues = Object.values(zonePeakLoad);
    const maxPeak = Math.max(...peakValues, NORMALIZATION.MIN_DENOMINATOR);

    const zones: Record<string, { intensity: number; lastTrainedDaysAgo: number; peakLoad: number }> = {};

    for (const zone of Object.keys(rawZones)) {
      zones[zone] = {
        intensity: Math.min(rawZones[zone], NORMALIZATION.MAX_ZONE_LOAD),
        lastTrainedDaysAgo: Math.round(zoneLastTrained[zone] ?? 0),
        peakLoad: Math.min(zonePeakLoad[zone] / maxPeak, NORMALIZATION.MAX_ZONE_LOAD),
      };
    }

    return {
      zones,
      totalWorkouts: workouts.length,
      lastWorkoutDaysAgo: minDaysAgo === Infinity ? null : Math.round(minDaysAgo),
    };
  }

  static async calculatePeriodStats(
    workouts: Workout[],
    period: string = 'custom'
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

    /** По каждой тренировке: сохранённые зоны или пересчёт из exercises (старые записи в БД часто с пустым zonesLoad). */
    const perWorkoutZones: Record<string, number>[] = [];
    for (const workout of workouts) {
      if (hasMeaningfulZonesLoad(workout.zonesLoad)) {
        perWorkoutZones.push({ ...workout.zonesLoad! });
        continue;
      }
      if (Array.isArray(workout.exercises) && workout.exercises.length > 0) {
        const calc = await WorkoutCalculator.calculateZoneLoads(
          workout.exercises,
          workout.workoutType,
          workout.rpe,
          workout.userId
        );
        perWorkoutZones.push({ ...calc.zonesLoad });
      } else {
        perWorkoutZones.push({});
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

      const zonesLoad = perWorkoutZones[i] ?? {};
      Object.entries(zonesLoad).forEach(([zone, load]) => {
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

    const timeline = workouts.map((w, i) => {
      const volume = Number(w.totalVolume) || 0;
      const intensity =
        typeof w.totalIntensity === 'string' ? parseFloat(w.totalIntensity) : w.totalIntensity || 0;
      const hasExercises = Array.isArray(w.exercises) && w.exercises.length > 0;
      const hasMissingWeights = Array.isArray(w.exercises) && w.exercises.some((ex) =>
        !ex.bodyweight && (ex.sets ?? []).some((s) => (s.reps ?? 0) > 0 && !s.weight)
      );
      return {
        id: w.id,
        date: w.date.toString(),
        intensity,
        volume,
        type: w.workoutType || 'unknown',
        scheduledWorkoutId: w.scheduledWorkoutId ?? null,
        loadLevel: WorkoutCalculator.getLoadLevel(volume, intensity, hasExercises),
        zones: { ...(perWorkoutZones[i] ?? {}) },
        hasMissingWeights,
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
