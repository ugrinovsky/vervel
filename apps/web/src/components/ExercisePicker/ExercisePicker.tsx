import { useState, useEffect } from 'react';
import { exercisesApi } from '@/api/exercises';
import UiTextInput from '../ui/TextInput';
import UiCombobox from '../ui/Combobox';

interface IProps {
  onSelect: (exercise: any) => void;
  workoutType: string;
}

export default function ExercisePicker({ onSelect, workoutType }: IProps) {
  const [exercises, setExercises] = useState<any[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);

  const [params, setParams] = useState<any>({
    sets: 3,
    reps: 10,
    weight: 0,
    rounds: 5,
    time: 10,
  });

  useEffect(() => {
    exercisesApi.list().then((res) => setExercises(res.exercises ?? []));
  }, []);

  const handleAdd = () => {
    onSelect({
      exerciseId: selectedExercise.value,
      params: { ...params },
      title: selectedExercise.label,
    });

    setSelectedExercise(null);
  };

  return (
    <div className="mt-6 space-y-4">
      <div>
        <label className="block mb-1 text-sm text-white/70">Упражнение</label>
        <UiCombobox
          value={selectedExercise}
          onChange={setSelectedExercise}
          options={exercises.map((ex) => ({
            value: ex.id,
            label: ex.title,
          }))}
          placeholder="Начните вводить упражнение"
        />
      </div>

      {selectedExercise && (
        <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
          {workoutType === 'bodybuilding' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <UiTextInput
                  type="number"
                  label="Подходы"
                  value={params.sets}
                  onChange={(e) => setParams({ ...params, sets: +e.target.value })}
                />
              </div>

              <div>
                <UiTextInput
                  type="number"
                  label="Повторы"
                  value={params.reps}
                  onChange={(e) => setParams({ ...params, reps: +e.target.value })}
                />
              </div>

              <div>
                <UiTextInput
                  type="number"
                  label="Вес (кг)"
                  value={params.weight}
                  onChange={(e) => setParams({ ...params, weight: +e.target.value })}
                />
              </div>
            </div>
          )}

          {workoutType === 'crossfit' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <UiTextInput
                  type="number"
                  label="Раунды"
                  value={params.rounds}
                  onChange={(e) => setParams({ ...params, rounds: +e.target.value })}
                />
              </div>

              <div>
                <UiTextInput
                  type="number"
                  label="Время (мин)"
                  value={params.time}
                  onChange={(e) => setParams({ ...params, time: +e.target.value })}
                />
              </div>
            </div>
          )}

          <button
            onClick={handleAdd}
            className="
    mt-4 w-full py-2 rounded-lg
    bg-white/10 text-white font-medium
    border border-white/20
    shadow-sm
    hover:bg-white/20
    active:scale-95 transition
  "
          >
            Добавить упражнение
          </button>
        </div>
      )}
    </div>
  );
}
