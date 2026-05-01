import type { ExerciseCategory } from '@/types/Exercise';

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  strength: 'Силовые',
  olympic: 'Олимпийские',
  gymnastics: 'Гимнастика',
  functional: 'Функциональные',
  cardio: 'Кардио',
};

export const CATEGORY_LABELS_SHORT: Record<ExerciseCategory, string> = {
  strength: 'Силовые',
  olympic: 'Олимп.',
  gymnastics: 'Гимнастика',
  functional: 'Функц.',
  cardio: 'Кардио',
};
