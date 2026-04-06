import { stopDragSensorBubble } from '@/lib/workoutListDnd';
import { InsertBetweenInline } from './WorkoutExerciseInsertControls';

/** Ряд под карточкой: линии + суперсет (опционально) + «между». Общий для WorkoutExercisesEditor и WorkoutDetailSheet. */
export function WorkoutExerciseBetweenRow({
  showSuperset,
  hideSupersetWhileDragging,
  isLinkedToNext,
  onToggleSuperset,
  onInsertBetween,
}: {
  showSuperset: boolean;
  /** Пока тянется карточка — скрываем UI суперсета, остаётся линия и «между». */
  hideSupersetWhileDragging?: boolean;
  isLinkedToNext: boolean;
  onToggleSuperset: () => void;
  onInsertBetween: () => void;
}) {
  if (showSuperset && !hideSupersetWhileDragging) {
    return (
      <div className="relative flex items-center gap-2 min-h-6 mt-1.5 pl-1">
        {isLinkedToNext && (
          <div className="absolute left-1 top-0 bottom-0 w-0.5 bg-amber-500/60 rounded-full" />
        )}
        <div className={`flex-1 min-w-0 ${!isLinkedToNext ? 'border-t border-(--color_border)' : ''}`} />
        <button
          type="button"
          onPointerDown={stopDragSensorBubble}
          onTouchStart={stopDragSensorBubble}
          onClick={onToggleSuperset}
          className={`relative flex items-center gap-1.5 text-xs font-medium transition-colors px-2 py-0.5 rounded-md shrink-0 ${
            isLinkedToNext
              ? 'text-amber-400 bg-amber-500/10'
              : 'text-white/25 hover:text-amber-400 hover:bg-amber-500/10'
          }`}
          title={isLinkedToNext ? 'Разъединить суперсет' : 'Связать в суперсет'}
        >
          <span>⚡</span>
          <span>{isLinkedToNext ? 'суперсет' : 'суперсет?'}</span>
        </button>
        <div className={`flex-1 min-w-0 ${!isLinkedToNext ? 'border-t border-(--color_border)' : ''}`} />
        <InsertBetweenInline onClick={onInsertBetween} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-2 mb-0.5">
      <div className="flex-1 border-t border-(--color_border)" />
      <InsertBetweenInline onClick={onInsertBetween} />
    </div>
  );
}
