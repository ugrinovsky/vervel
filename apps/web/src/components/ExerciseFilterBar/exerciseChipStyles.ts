import type { MuscleZone } from '@/types/Exercise';
import {
  LEAD_CHIP_ALL_ACTIVE,
  LEAD_CHIP_ALL_INACTIVE,
} from '@/components/ui/leadChipStyles';

export { EXERCISE_CATEGORY_CHIP_TONES, EXERCISE_CATEGORY_TEXT_CLASS } from './exerciseCategoryStyles';

type ChipTone = { inactiveClass: string; activeClass: string };

/**
 * Зоны — цвета подобраны под порядок чипов в каталоге:
 * core → legs → glutes → shoulders → biceps → forearms → triceps → chests → back
 * (соседние зоны максимально контрастны)
 */
export const EXERCISE_ZONE_CHIP_TONES: Record<'__all__' | MuscleZone, ChipTone> = {
  __all__: {
    inactiveClass: LEAD_CHIP_ALL_INACTIVE,
    activeClass: LEAD_CHIP_ALL_ACTIVE,
  },
  core: {
    inactiveClass: 'border-cyan-500/25 bg-cyan-500/15 text-cyan-300/90',
    activeClass: 'border-cyan-400 bg-cyan-500/30 text-cyan-50',
  },
  legs: {
    inactiveClass: 'border-violet-500/25 bg-violet-500/15 text-violet-300/90',
    activeClass: 'border-violet-400 bg-violet-500/30 text-violet-50',
  },
  glutes: {
    inactiveClass: 'border-pink-500/25 bg-pink-500/15 text-pink-300/90',
    activeClass: 'border-pink-400 bg-pink-500/30 text-pink-50',
  },
  shoulders: {
    inactiveClass: 'border-sky-500/25 bg-sky-500/15 text-sky-300/90',
    activeClass: 'border-sky-400 bg-sky-500/30 text-sky-50',
  },
  biceps: {
    inactiveClass: 'border-emerald-500/25 bg-emerald-500/15 text-emerald-300/90',
    activeClass: 'border-emerald-400 bg-emerald-500/30 text-emerald-50',
  },
  forearms: {
    inactiveClass: 'border-slate-500/25 bg-slate-500/15 text-slate-300/90',
    activeClass: 'border-slate-400 bg-slate-500/30 text-slate-50',
  },
  triceps: {
    inactiveClass: 'border-amber-500/25 bg-amber-500/15 text-amber-300/90',
    activeClass: 'border-amber-400 bg-amber-500/30 text-amber-50',
  },
  chests: {
    inactiveClass: 'border-rose-500/25 bg-rose-500/15 text-rose-300/90',
    activeClass: 'border-rose-400 bg-rose-500/30 text-rose-50',
  },
  back: {
    inactiveClass: 'border-indigo-500/25 bg-indigo-500/15 text-indigo-300/90',
    activeClass: 'border-indigo-400 bg-indigo-500/30 text-indigo-50',
  },
};
