export interface WorkoutTypeOption {
  value: 'bodybuilding' | 'crossfit' | 'cardio';
  label: string;
}

export const workoutTypes: WorkoutTypeOption[] = [
  { value: 'bodybuilding', label: '💪 Бодибилдинг' },
  { value: 'crossfit', label: '🏋️ Кроссфит' },
  { value: 'cardio', label: '🏃 Кардио' },
];
