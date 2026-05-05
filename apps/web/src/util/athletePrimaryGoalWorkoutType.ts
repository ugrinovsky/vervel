import type { WorkoutType } from '@/components/WorkoutTypeTabs';
import { DEFAULT_WORKOUT_TYPE } from '@/constants/workoutTypes';
import type { ClientPreferences } from '@/types/clientPreferences';

/** Тип тренировки по умолчанию для цели онбординга (кроме «Общая форма» — там выбор вручную). */
export function workoutTypeForAthletePrimaryGoal(
  goal: NonNullable<ClientPreferences['athletePrimaryGoal']>
): WorkoutType {
  switch (goal) {
    case 'strength':
      return 'bodybuilding';
    case 'cardio':
      return 'cardio';
    case 'flexibility':
      return 'bodybuilding';
    case 'general':
      return DEFAULT_WORKOUT_TYPE;
  }
}
