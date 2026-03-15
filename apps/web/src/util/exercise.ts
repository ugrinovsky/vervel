import type { ExerciseWithSets, ExerciseSet } from '@/types/Exercise';
export { toDateKey as getLocalDateISOString } from '@/utils/date';

/**
 * Вычисляет суммарные метрики тренировки
 */
export const calculateMetrics = (exercises: ExerciseWithSets[]) => {
  let totalVolume = 0;
  let totalReps = 0;
  let totalWeight = 0;

  const zonesLoad: Record<string, number> = {
    light: 0,
    medium: 0,
    heavy: 0,
  };

  exercises.forEach((ex) => {
    ex.sets.forEach((set: ExerciseSet) => {
      const volume = set.reps * set.weight;

      totalVolume += volume;
      totalReps += set.reps;
      totalWeight += set.weight;

      if (set.weight < 40) zonesLoad.light += volume;
      else if (set.weight < 80) zonesLoad.medium += volume;
      else zonesLoad.heavy += volume;
    });
  });

  const avgWeight = totalReps ? totalWeight / totalReps : 0;
  const totalIntensity = Math.round(avgWeight);

  return {
    totalVolume: Number(totalVolume) || 0,
    totalIntensity: Number(totalIntensity) || 0,
    zonesLoad,
  };
};
