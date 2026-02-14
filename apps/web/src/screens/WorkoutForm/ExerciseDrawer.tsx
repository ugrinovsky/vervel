// ExerciseDrawer.tsx
import Drawer from '@/components/Drawer';
import type { ExerciseWithSets } from '@/types/Exercise';
import ExerciseSetRow from './ExerciseSetRaw';
import { useEffect, useState } from 'react';

interface Props {
  open: boolean;
  exercise: ExerciseWithSets;
  onClose: () => void;
  onSave: (exercise: ExerciseWithSets) => void;
}

export default function ExerciseDrawer({ open, exercise, onClose, onSave }: Props) {
  const [sets, setSets] = useState<ExerciseWithSets['sets']>([]);

  useEffect(() => {
    if (open) {
      const initialSets = exercise.sets?.length 
        ? exercise.sets.map(set => ({ ...set, id: set.id || crypto.randomUUID() }))
        : [{ id: crypto.randomUUID(), reps: 10, weight: 0 }];

      setSets(initialSets);
    }
  }, [open, exercise]);

  const handleUpdateSet = (
    index: number,
    field: keyof ExerciseWithSets['sets'][0],
    value: number
  ) => {
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], [field]: value };
    setSets(newSets);
  };

  const handleAddSet = () => {
    const last = sets[sets.length - 1];
    const newSet = { 
      id: crypto.randomUUID(), 
      reps: last?.reps ?? 10, 
      weight: last?.weight ?? 0 
    };
    setSets([...sets, newSet]);
  };

  const handleRemoveSet = (index: number) => {
    if (sets.length <= 1) return;
    setSets(sets.filter((_, i) => i !== index));
  };

  const handleDuplicateSet = (index: number) => {
    const setToDuplicate = sets[index];
    const newSets = [...sets];
    newSets.splice(index + 1, 0, { ...setToDuplicate, id: crypto.randomUUID() });
    setSets(newSets);
  };

  const handleGeneratePyramid = (direction: 'up' | 'down') => {
    if (!sets.length) return;
    const baseReps = sets[0].reps;
    const baseWeight = sets[0].weight;
    let pyramid: typeof sets = [];

    if (direction === 'up') {
      pyramid = [
        { id: crypto.randomUUID(), reps: baseReps, weight: baseWeight },
        { id: crypto.randomUUID(), reps: Math.max(baseReps - 2, 1), weight: baseWeight + 5 },
        { id: crypto.randomUUID(), reps: Math.max(baseReps - 4, 1), weight: baseWeight + 10 },
        { id: crypto.randomUUID(), reps: Math.max(baseReps - 6, 1), weight: baseWeight + 15 },
        { id: crypto.randomUUID(), reps: Math.max(baseReps - 8, 1), weight: baseWeight + 20 },
      ];
    } else {
      pyramid = [
        { id: crypto.randomUUID(), reps: Math.max(baseReps - 8, 1), weight: baseWeight + 20 },
        { id: crypto.randomUUID(), reps: Math.max(baseReps - 6, 1), weight: baseWeight + 15 },
        { id: crypto.randomUUID(), reps: Math.max(baseReps - 4, 1), weight: baseWeight + 10 },
        { id: crypto.randomUUID(), reps: Math.max(baseReps - 2, 1), weight: baseWeight + 5 },
        { id: crypto.randomUUID(), reps: baseReps, weight: baseWeight },
      ];
    }
    setSets(pyramid);
  };

  const handleSave = () => {
    onSave({ ...exercise, sets });
  };

  return (
    <Drawer open={open} onClose={onClose} header={<span>{exercise.title}</span>}>
      <div className="space-y-4 p-4">
        {/* Пирамида */}
        <div className="flex gap-2">
          <button
            onClick={() => handleGeneratePyramid('up')}
            className="flex-1 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-sm hover:bg-blue-500/30 transition"
          >
            ⬆️ Вверх
          </button>
          <button
            onClick={() => handleGeneratePyramid('down')}
            className="flex-1 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg text-sm hover:bg-purple-500/30 transition"
          >
            ⬇️ Вниз
          </button>
        </div>

        {/* Заголовок таблицы */}
        <div className="flex items-center gap-2 px-3 text-xs text-white/50 font-medium">
          <div className="w-6">#</div>
          <div className="flex-1 text-center">Повторы</div>
          <div className="flex-1 text-center">Вес (кг)</div>
          <div className="w-[88px] text-right">Действия</div>
        </div>

        {/* Строки подходов */}
        <div className="space-y-2">
          {sets.length === 0 ? (
            <div className="text-center py-8 text-white/50 border border-dashed border-white/20 rounded-lg">
              Нет подходов
              <button
                onClick={handleAddSet}
                className="block mx-auto mt-3 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition"
              >
                + Добавить первый подход
              </button>
            </div>
          ) : (
            sets.map((set, i) => (
              <ExerciseSetRow
                key={set.id}
                index={i}
                set={set}
                last={i === sets.length - 1}
                onUpdate={handleUpdateSet}
                onAdd={handleAddSet}
                onRemove={handleRemoveSet}
                onDuplicate={handleDuplicateSet}
              />
            ))
          )}
        </div>

        {/* Кнопка добавить внизу */}
        {sets.length > 0 && (
          <button
            onClick={handleAddSet}
            className="w-full py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition flex items-center justify-center gap-2"
          >
            <span className="text-emerald-400 text-lg">+</span> Добавить подход
          </button>
        )}

        {/* Нижние кнопки */}
        <div className="flex gap-2 pt-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-white/20 rounded-lg hover:bg-white/5 transition text-sm"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-emerald-500 text-black rounded-lg font-medium hover:bg-emerald-400 transition disabled:opacity-50 text-sm whitespace-nowrap"
            disabled={sets.length === 0}
          >
            {sets.length > 0 ? `Добавить (${sets.length})` : 'Добавить'}
          </button>
        </div>
      </div>
    </Drawer>
  );
}
