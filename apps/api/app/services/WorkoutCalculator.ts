import { ExerciseCatalog, type CatalogExercise } from '#services/ExerciseCatalog'
import Workout, { WorkoutExercise, WorkoutSet } from '#models/workout';

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
    rpe?: number | null
  ): Promise<WorkoutCalculationResult> {
    const zoneLoads: Record<string, number> = {};
    let totalVolume = 0;

    const exerciseMap = await this.loadExercises(exercises);

    for (const input of exercises) {
      const exercise = exerciseMap.get(input.exerciseId);
      if (!exercise) continue;

      const { load, volume } = this.calculateExerciseLoad(exercise, input, workoutType);

      totalVolume += volume;

      for (const zone of exercise.zones) {
        zoneLoads[zone] = (zoneLoads[zone] ?? 0) + load;
      }
    }

    const result = this.normalizeResult(zoneLoads, totalVolume);

    // RPE scales the stored load: RPE 10 = 100% of calculated, RPE 5 = 50%, RPE 1 = 10%.
    // This reflects the athlete's actual perceived effort — if it felt easy, it stresses muscles less.
    if (rpe != null) {
      const rpeFactor = rpe / 10;
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
    workoutType: Workout['workoutType']
  ): { load: number; volume: number } {
    const baseIntensity = exercise.intensity;

    switch (workoutType) {
      case 'bodybuilding':
        return this.calculateBodybuildingLoad(baseIntensity, input);

      case 'crossfit':
        return this.calculateCrossfitLoad(baseIntensity, input);

      case 'cardio':
        return this.calculateCardioLoad(baseIntensity, input);
    }
  }

  private static calculateBodybuildingLoad(
    baseIntensity: number,
    input: WorkoutExercise
  ): { load: number; volume: number } {
    if (!input.sets || input.sets.length === 0) {
      return { load: 0, volume: 0 };
    }

    let totalVolume = 0;
    let totalNormalizedLoad = 0;

    // Считаем по каждому подходу
    input.sets.forEach((set: WorkoutSet) => {
      const reps = set.reps || 0;
      const weight = set.weight || 0;

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
   * Недавние тренировки весят больше, старые — меньше.
   * decay = e^(-λ × daysAgo), λ = 0.3
   * → сегодня = 100%, 1д = 74%, 2д = 55%, 3д = 41%, 5д = 22%, 7д = 12%
   *
   * Для каждой зоны возвращает:
   *  - intensity: текущая нагрузка с decay (0-1)
   *  - lastTrainedDaysAgo: сколько дней назад тренировали
   *  - peakLoad: пиковая нагрузка до decay (нормализованная)
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
        rawZones[zone] = (rawZones[zone] || 0) + load * decayFactor;
        zonePeakLoad[zone] = (zonePeakLoad[zone] || 0) + load;

        if (zoneLastTrained[zone] === undefined || daysAgo < zoneLastTrained[zone]) {
          zoneLastTrained[zone] = daysAgo;
        }
      }
    }

    // peakLoad нормализуется относительно максимума (показывает, какая зона нагружалась больше всего)
    // intensity НЕ нормализуется относительно maxRaw — иначе самая нагруженная зона всегда будет 100%
    // независимо от того, сколько прошло дней. Используем абсолютный cap в 1.0.
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

  static calculatePeriodStats(
    workouts: Workout[],
    period: string = 'custom'
  ): {
    workoutsCount: number;
    totalVolume: number;
    avgIntensity: number;
    byType: Record<string, number>;
    zones: Record<string, number>;
    timeline: Array<{
      date: string;
      intensity: number;
      volume: number;
      type: string;
      scheduledWorkoutId: number | null;
      loadLevel: 'none' | 'low' | 'medium' | 'high';
    }>;
    period: string;
  } {
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

    let totalVolume = 0;
    let totalIntensity = 0;
    const byType: Record<string, number> = {};
    const zones: Record<string, number> = {};

    workouts.forEach((workout) => {
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

      const zonesLoad = workout.zonesLoad || {};
      Object.entries(zonesLoad).forEach(([zone, intensity]) => {
        zones[zone] = (zones[zone] || 0) + intensity;
      });
    });

    const zoneValues = Object.values(zones);
    if (zoneValues.length > 0) {
      const maxZone = Math.max(...zoneValues, NORMALIZATION.MIN_DENOMINATOR);
      Object.keys(zones).forEach((zone) => {
        zones[zone] = Math.min(zones[zone] / maxZone, NORMALIZATION.MAX_ZONE_LOAD);
      });
    }

    const timeline = workouts.map((w) => {
      const volume = Number(w.totalVolume) || 0;
      const intensity =
        typeof w.totalIntensity === 'string' ? parseFloat(w.totalIntensity) : w.totalIntensity || 0;
      const hasExercises = Array.isArray(w.exercises) && w.exercises.length > 0;
      return {
        id: w.id,
        date: w.date.toString(),
        intensity,
        volume,
        type: w.workoutType || 'unknown',
        scheduledWorkoutId: w.scheduledWorkoutId ?? null,
        loadLevel: WorkoutCalculator.getLoadLevel(volume, intensity, hasExercises),
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
