import { PlusIcon } from '@heroicons/react/24/outline';
import { stopDragSensorBubble } from '@/lib/workoutListDnd';

export function InsertBetweenInline({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onPointerDown={stopDragSensorBubble}
      onTouchStart={stopDragSensorBubble}
      onClick={onClick}
      className="inline-flex items-center gap-0.5 shrink-0 text-[10px] font-medium text-white/35 hover:text-emerald-400 transition-colors px-1.5 py-0.5 rounded-md hover:bg-white/5 whitespace-nowrap"
    >
      <PlusIcon className="w-3 h-3" />
      между
    </button>
  );
}

export function InsertStartRow({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex justify-end mb-1.5">
      <button
        type="button"
        onPointerDown={stopDragSensorBubble}
        onTouchStart={stopDragSensorBubble}
        onClick={onClick}
        className="inline-flex items-center gap-0.5 text-[10px] font-medium text-white/35 hover:text-emerald-400 transition-colors px-1.5 py-0.5 rounded-md hover:bg-white/5"
      >
        <PlusIcon className="w-3 h-3" />
        в начало
      </button>
    </div>
  );
}
