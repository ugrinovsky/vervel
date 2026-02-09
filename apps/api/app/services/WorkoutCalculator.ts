import Exercise from '#models/exercise';
import Workout from '#models/workout';

/* ------------------------------------------------------------------ */
/* Types */
/* ------------------------------------------------------------------ */

export type WorkoutType = 'crossfit' | 'bodybuilding';

export interface WorkoutExerciseInput {
  exerciseId: string;
  sets?: number;
  reps?: number;
  weight?: number;
  rounds?: number;
  time?: number;
}

export interface WorkoutCalculationResult {
  zonesLoad: Record<string, number>;
  totalIntensity: number;
  totalVolume: number;
}

/* ------------------------------------------------------------------ */
/* Constants (NO magic numbers) */
/* ------------------------------------------------------------------ */

const BODYBUILDING = {
  DEFAULT_SETS: 1,
  DEFAULT_REPS: 1,
  DEFAULT_WEIGHT: 0,
  WEIGHT_NORMALIZATION_DIVIDER: 100,
  MAX_NORMALIZED_VOLUME: 10,
};

const CROSSFIT = {
  DEFAULT_ROUNDS: 1,
  MAX_ROUNDS_FOR_FULL_LOAD: 5,
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
    exercises: WorkoutExerciseInput[],
    workoutType: WorkoutType
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
    inputs: WorkoutExerciseInput[]
  ): Promise<Map<string, Exercise>> {
    const ids = [...new Set(inputs.map((e) => e.exerciseId))];

    const exercises = await Exercise.query().whereIn('id', ids);
    return new Map(exercises.map((e) => [e.id, e]));
  }

  private static calculateExerciseLoad(
    exercise: Exercise,
    input: WorkoutExerciseInput,
    workoutType: WorkoutType
  ): { load: number; volume: number } {
    const baseIntensity = exercise.intensity;

    switch (workoutType) {
      case 'bodybuilding':
        return this.calculateBodybuildingLoad(baseIntensity, input);

      case 'crossfit':
        return this.calculateCrossfitLoad(baseIntensity, input);
    }
  }

  private static calculateBodybuildingLoad(
    baseIntensity: number,
    input: WorkoutExerciseInput
  ): { load: number; volume: number } {
    const sets = input.sets ?? BODYBUILDING.DEFAULT_SETS;
    const reps = input.reps ?? BODYBUILDING.DEFAULT_REPS;
    const weight = input.weight ?? BODYBUILDING.DEFAULT_WEIGHT;

    const totalVolume = sets * reps * weight;

    const normalizedVolume = Math.min(
      (sets * reps * (weight / BODYBUILDING.WEIGHT_NORMALIZATION_DIVIDER)) /
        BODYBUILDING.MAX_NORMALIZED_VOLUME,
      NORMALIZATION.MAX_ZONE_LOAD
    );

    return {
      load: baseIntensity * normalizedVolume,
      volume: totalVolume,
    };
  }

  private static calculateCrossfitLoad(
    baseIntensity: number,
    input: WorkoutExerciseInput
  ): { load: number; volume: number } {
    const rounds = input.rounds ?? CROSSFIT.DEFAULT_ROUNDS;

    const roundsFactor = Math.min(
      rounds / CROSSFIT.MAX_ROUNDS_FOR_FULL_LOAD,
      NORMALIZATION.MAX_ZONE_LOAD
    );

    return {
      load: baseIntensity * roundsFactor,
      volume: 0,
    };
  }

  private static normalizeResult(
    zoneLoads: Record<string, number>,
    totalVolume: number
  ): WorkoutCalculationResult {
    const values = Object.values(zoneLoads);

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
    avgIntensity: number; // ← исправить на число
    byType: Record<string, number>;
    zones: Record<string, number>; // ← нормализовать 0-1
    timeline: Array<{
      date: string;
      intensity: number; // ← исправить на число
      volume: number;
      type: string;
    }>;
    period: string;
  } {
    if (workouts.length === 0) {
      return {
        workoutsCount: 0,
        totalVolume: 0,
        avgIntensity: 0, // не null
        byType: {},
        zones: {},
        timeline: [],
        period,
      };
    }

    // Считаем totalVolume и avgIntensity
    let totalVolume = 0;
    let totalIntensity = 0;
    const byType: Record<string, number> = {};
    const zones: Record<string, number> = {};

    workouts.forEach((workout) => {
      // Volume
      totalVolume += workout.totalVolume || 0;

      // Intensity (преобразуем строку в число если нужно)
      const intensity =
        typeof workout.totalIntensity === 'string'
          ? parseFloat(workout.totalIntensity)
          : workout.totalIntensity || 0;
      totalIntensity += intensity;

      // By type
      const type = workout.workoutType || 'unknown';
      byType[type] = (byType[type] || 0) + 1;

      // Zones (суммируем)
      const zonesLoad = workout.zonesLoad || {};
      Object.entries(zonesLoad).forEach(([zone, intensity]) => {
        zones[zone] = (zones[zone] || 0) + intensity;
      });
    });

    // НОРМАЛИЗУЕМ zones 0-1 (как в WorkoutCalculator)
    const zoneValues = Object.values(zones);
    if (zoneValues.length > 0) {
      const maxZone = Math.max(...zoneValues, NORMALIZATION.MIN_DENOMINATOR);
      Object.keys(zones).forEach((zone) => {
        zones[zone] = Math.min(zones[zone] / maxZone, NORMALIZATION.MAX_ZONE_LOAD);
      });
    }

    // Timeline с числами
    const timeline = workouts.map((w) => ({
      date: w.date.toString(),
      intensity:
        typeof w.totalIntensity === 'string' ? parseFloat(w.totalIntensity) : w.totalIntensity || 0,
      volume: w.totalVolume || 0,
      type: w.workoutType || 'unknown',
    }));

    return {
      workoutsCount: workouts.length,
      totalVolume,
      avgIntensity: totalIntensity / workouts.length, // число!
      byType,
      zones, // нормализованные 0-1
      timeline,
      period,
    };
  }
}
