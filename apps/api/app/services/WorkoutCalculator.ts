import Exercise from '#models/exercise';
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
    workoutType: Workout['workoutType']
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

    return this.normalizeResult(zoneLoads, totalVolume);
  }

  /* ---------------------------------------------------------------- */
  /* Internal helpers */
  /* ---------------------------------------------------------------- */

  private static async loadExercises(
    inputs: WorkoutExercise[]
  ): Promise<Map<string, Exercise>> {
    const ids = [...new Set(inputs.map((e) => e.exerciseId))];

    const exercises = await Exercise.query().whereIn('id', ids);
    return new Map(exercises.map((e) => [e.id, e]));
  }

  private static calculateExerciseLoad(
    exercise: Exercise,
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

    const timeline = workouts.map((w) => ({
      date: w.date.toString(),
      intensity:
        typeof w.totalIntensity === 'string' ? parseFloat(w.totalIntensity) : w.totalIntensity || 0,
      volume: Number(w.totalVolume) || 0, // ✅ Принудительно конвертируем в число
      type: w.workoutType || 'unknown',
    }));

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
