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
