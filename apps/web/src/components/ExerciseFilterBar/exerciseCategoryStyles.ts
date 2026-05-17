import type { ExerciseCategory } from '@/types/Exercise';
import {
  LEAD_CHIP_ALL_ACTIVE,
  LEAD_CHIP_ALL_INACTIVE,
} from '@/components/ui/leadChipStyles';

type ChipTone = { inactiveClass: string; activeClass: string };

/** Цвет подписи категории на карточке упражнения — единый источник */
export const EXERCISE_CATEGORY_TEXT_CLASS: Record<ExerciseCategory, string> = {
  strength: 'text-blue-400',
  olympic: 'text-yellow-400',
  gymnastics: 'text-purple-400',
  functional: 'text-orange-400',
  cardio: 'text-green-400',
};

/** Чипы фильтра категории — те же цвета, что на карточках */
export const EXERCISE_CATEGORY_CHIP_TONES: Record<'__all__' | ExerciseCategory, ChipTone> = {
  __all__: {
    inactiveClass: LEAD_CHIP_ALL_INACTIVE,
    activeClass: LEAD_CHIP_ALL_ACTIVE,
  },
  strength: {
    inactiveClass: 'border-blue-500/25 bg-blue-500/15 text-blue-300/90',
    activeClass: 'border-blue-400 bg-blue-500/30 text-blue-50',
  },
  olympic: {
    inactiveClass: 'border-yellow-500/25 bg-yellow-500/15 text-yellow-300/90',
    activeClass: 'border-yellow-400 bg-yellow-500/30 text-yellow-50',
  },
  gymnastics: {
    inactiveClass: 'border-purple-500/25 bg-purple-500/15 text-purple-300/90',
    activeClass: 'border-purple-400 bg-purple-500/30 text-purple-50',
  },
  functional: {
    inactiveClass: 'border-orange-500/25 bg-orange-500/15 text-orange-300/90',
    activeClass: 'border-orange-400 bg-orange-500/30 text-orange-50',
  },
  cardio: {
    inactiveClass: 'border-green-500/25 bg-green-500/15 text-green-300/90',
    activeClass: 'border-green-400 bg-green-500/30 text-green-50',
  },
};
