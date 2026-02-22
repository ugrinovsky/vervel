// ExerciseSetRow.tsx
import type { ExerciseSet } from '@/types/Exercise';
import UiTextInput from '@/components/ui/TextInput';

interface Props {
  index: number;
  set: ExerciseSet;
  last: boolean;
  onUpdate: (index: number, field: keyof ExerciseSet, value: number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
}

export default function ExerciseSetRow({
  index,
  set,
  last,
  onUpdate,
  onAdd,
  onRemove,
  onDuplicate,
}: Props) {
  return (
    <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 hover:bg-white/10 transition">
      {/* Номер */}
      <div className="w-6 text-sm font-medium text-white/70 shrink-0">{index + 1}</div>

      {/* Повторения */}
      <div className="flex-1 min-w-0">
        <UiTextInput
          type="number"
          value={set.reps}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            if (!isNaN(val)) onUpdate(index, 'reps', val);
          }}
          min={1}
          placeholder="10"
          className="text-center"
        />
      </div>

      {/* Вес */}
      <div className="flex-1 min-w-0">
        <UiTextInput
          type="number"
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            onUpdate(index, 'weight', isNaN(val) ? 0 : val);
          }}
          min={0}
          step={2.5}
          placeholder="0"
          className="text-center"
        />
      </div>

      {/* Кнопки */}
      <div className="flex gap-1 shrink-0">
        {/* Дублировать */}
        <button
          onClick={() => onDuplicate(index)}
          className="w-8 h-8 flex items-center justify-center bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition"
          title="Дублировать"
        >
          📋
        </button>

        {/* Добавить только у последнего */}
        {last && (
          <button
            onClick={onAdd}
            className="w-8 h-8 flex items-center justify-center bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition text-lg"
            title="Добавить"
          >
            +
          </button>
        )}

        {/* Удалить все кроме первого */}
        {index > 0 && (
          <button
            onClick={() => onRemove(index)}
            className="w-8 h-8 flex items-center justify-center bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition"
            title="Удалить"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
