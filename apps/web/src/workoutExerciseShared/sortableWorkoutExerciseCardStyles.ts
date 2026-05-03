/**
 * Единый набор классов для оболочки карточки упражнения в sortable-списках
 * (редактор и редактирование тренировки в шите).
 */

/** Фон/бордер по умолчанию в редакторе упражнений */
export const SORTABLE_EXERCISE_IDLE_EDITOR_DEFAULT = 'bg-white/[0.07] border-white/10';

/** Общий для редактора и шита — блок суперсета */
export const SORTABLE_EXERCISE_IDLE_SUPERSET = 'bg-amber-500/10 border-amber-500/40';

/** Карточка в шите деталей тренировки (не редактор) */
export const SORTABLE_EXERCISE_IDLE_DETAIL_DEFAULT = 'bg-(--color_bg_card) border-(--color_border)';

type SortableShellOpts = {
  isDragging: boolean;
  /** Рука на хэндле до начала драга */
  handleActive?: boolean;
  /** Спокойное состояние: фон и цвет бордера (без relative/rounded/min-w) */
  idleSurfaceClass: string;
};

/**
 * Внешняя «рамка» карточки: базовая геометрия + состояния drag / handle / idle.
 */
export function sortableWorkoutExerciseCardShellClassName(o: SortableShellOpts): string {
  const base = 'relative rounded-xl min-w-0 border transition-all duration-150';
  if (o.isDragging) {
    return `${base} z-30 opacity-95 scale-[1.01] shadow-[0_0_20px_var(--color_primary_light)]/20 ring-2 ring-white/60 bg-(--color_bg_card_hover) border-white/20`;
  }
  if (o.handleActive) {
    return `${base} ring-2 ring-white/40 shadow-[0_0_16px_var(--color_primary_light)]/15 ${o.idleSurfaceClass}`;
  }
  return `${base} ${o.idleSurfaceClass}`;
}
