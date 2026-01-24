export interface WorkoutExercise {
  exerciseId: string; // ссылка на Exercise.id

  weight?: number; // кг
  sets?: number;
  reps?: number;

  /** Если пользователь задал вручную */
  overrideIntensity?: number;
}
