export type MuscleZone = 'chests' | 'triceps' | 'shoulders' | 'back' | 'legs' | 'glutes' | 'core';

export interface Exercise {
  /** Уникальный код */
  id: string;

  /** Человекочитаемое имя */
  title: string;

  /** Ключевые слова для парсинга */
  keywords: string[];

  /** Какие зоны нагружает */
  zones: MuscleZone[];

  /** Базовая интенсивность упражнения (0–1) */
  intensity: number;
}

export interface ExerciseSet {
  id: string;
  reps: number;
  weight: number;
}

export interface ExerciseWithSets {
  exerciseId: number | string; // может быть id из API или временный string
  title: string;
  sets: ExerciseSet[];
  notes?: string;
  workoutType?: 'strength' | 'cardio' | 'crossfit'; // опционально
}
