export type MuscleZone =
  | 'chests'
  | 'triceps'
  | 'biceps'
  | 'shoulders'
  | 'back'
  | 'legs'
  | 'glutes'
  | 'core'
  | 'forearms';

export type ExerciseCategory = 'strength' | 'olympic' | 'gymnastics' | 'functional' | 'cardio';

export interface Exercise {
  /** Уникальный код (e.g. "Bench_Press") */
  id: string;

  /** Человекочитаемое имя */
  title: string;

  /** Категория упражнения */
  category: ExerciseCategory;

  /** Ключевые слова для матчинга */
  keywords: string[];

  /** Какие зоны нагружает */
  zones: MuscleZone[];

  /** Базовая интенсивность упражнения (0–1) */
  intensity: number;

  /** URL изображения из free-exercise-db (null если нет) */
  imageUrl: string | null;
}

/** Полные данные упражнения (GET /exercises/:id) */
export interface ExerciseFull extends Exercise {
  instructions: string[];
  allImages: string[];
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
  duration?: number; // минуты, для кардио
  bodyweight?: boolean;
}
