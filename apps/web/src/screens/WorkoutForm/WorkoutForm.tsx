import { useState } from 'react';
import { useNavigate } from 'react-router';
import { workoutsApi, WorkoutExercise } from '@/api/workouts';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Screen from '@/components/Screen';
import ExercisePicker from '@/components/ExercisePicker/ExercisePicker';
import UiListbox from '@/components/ui/Listbox';

export default function AddWorkoutScreen() {
  const navigate = useNavigate();

  const workoutTypes = [
    { id: 'bodybuilding', label: '💪 Качалка' },
    { id: 'crossfit', label: '🏋️ Кроссфит' },
    { id: 'mixed', label: '🔥 Смешанная' },
  ];

  const [workoutType, setWorkoutType] = useState(workoutTypes[0]);
  const [date, setDate] = useState(new Date());
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!exercises.length) {
      toast.error('Добавьте хотя бы одно упражнение');
      return;
    }

    setLoading(true);
    try {
      await workoutsApi.create({
        date: date.toISOString().split('T')[0],
        workoutType: workoutType.id as any,
        exercises: exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          ...ex.params,
        })),
      });

      toast.success('Тренировка добавлена! 💪');
      // Если хочешь очистить форму, а не редирект:
      setExercises([]);
      setDate(new Date());
      setWorkoutType(workoutTypes[0]);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Ошибка при добавлении тренировки');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExercise = (exercise: WorkoutExercise) => {
    setExercises((prev) => [...prev, exercise]);
  };

  return (
    <Screen>
      <div className="p-4 max-w-md text-white">
        <h1 className="text-2xl font-bold mb-6">Добавить тренировку</h1>

        <div className="mb-5">
          <label className="block mb-2 text-sm text-white/70">Тип тренировки</label>

          <UiListbox value={workoutType} options={workoutTypes} onChange={setWorkoutType} />
        </div>

        <div className="mb-5">
          <label className="block mb-2 text-sm text-white/70">Дата</label>

          <DatePicker
            selected={date}
            onChange={(d) => d && setDate(d)}
            dateFormat="yyyy-MM-dd"
            className="
              w-full px-3 py-2 rounded-lg
              bg-white/10 border border-white/20
              text-white
              focus:outline-none focus:ring-2 focus:ring-emerald-400
            "
          />
        </div>

        <div className="mb-6">
          <h2 className="mb-2 text-sm text-white/70">Упражнения</h2>

          {exercises.length === 0 && (
            <p className="text-sm text-white/40">Пока ничего не добавлено</p>
          )}

          {exercises.map((ex, i) => (
            <div
              key={i}
              className="
      relative flex items-center justify-between
      px-3 py-2 mb-2
      rounded-lg
      bg-white/5 border border-white/10
    "
            >
              <span className="font-medium mt-2">{ex.title}</span>

              <button
                onClick={() => setExercises((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-red-400 text-sm z-10 mt-4"
              >
                Удалить
              </button>

              <div className="absolute right-3 top-1 text-xs text-white/50">
                {(() => {
                  const parts: string[] = [];

                  if (ex.params.sets && ex.params.reps) {
                    parts.push(`${ex.params.sets}×${ex.params.reps}`);
                  } else if (ex.params.sets) {
                    parts.push(`${ex.params.sets}×`);
                  } else if (ex.params.reps) {
                    parts.push(`${ex.params.reps} повт.`);
                  }

                  if (ex.params.weight) parts.push(`${ex.params.weight} кг`);
                  if (ex.params.rounds) parts.push(`${ex.params.rounds} повт.`);
                  if (ex.params.time) parts.push(`${ex.params.time} мин.`);

                  return parts.join(' | ');
                })()}
              </div>
            </div>
          ))}
        </div>

        <ExercisePicker onSelect={handleAddExercise} workoutType={workoutType.id} />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="
            mt-5
            w-full py-3 rounded-xl
            bg-emerald-500 text-black font-medium
            shadow-lg
            active:scale-95 transition
            disabled:opacity-50
          "
        >
          {loading ? 'Сохраняем…' : 'Сохранить тренировку'}
        </button>
      </div>
    </Screen>
  );
}
