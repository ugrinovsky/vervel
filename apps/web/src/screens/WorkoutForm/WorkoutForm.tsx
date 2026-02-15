// WorkoutForm.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import DatePicker, { registerLocale } from 'react-datepicker';
import ru from 'date-fns/locale/ru';
import UiListbox from '@/components/ui/Listbox';
import ExercisePicker from '@/components/ExercisePicker/ExercisePicker';
import ExerciseList from './ExerciseList';
import ExerciseDrawer from './ExerciseDrawer';
import { getLocalDateISOString } from '@/util/exercise';
import { workoutsApi, WorkoutExercise } from '@/api/workouts';
import type { ExerciseWithSets } from '@/types/Exercise';
import { WorkoutTypeOption, workoutTypes } from '@/constants/workoutTypes';
import 'react-datepicker/dist/react-datepicker.css';
import '@/styles/datepicker.css';

// Регистрируем русскую локаль
registerLocale('ru', ru);

export default function WorkoutForm() {
  const navigate = useNavigate();

  const [workoutType, setWorkoutType] = useState<WorkoutTypeOption>(workoutTypes[0]);
  const [date, setDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<ExerciseWithSets[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<ExerciseWithSets | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);

  const handleAddExercise = (exercise: ExerciseWithSets) => {
    setCurrentExercise(exercise);
    setShowDrawer(true);
  };

  const handleSaveExercise = (exercise: ExerciseWithSets) => {
    setExercises([...exercises, exercise]);
    setCurrentExercise(null);
    setShowDrawer(false);
  };

  const handleSubmit = async () => {
    if (!exercises.length) return toast.error('Добавьте хотя бы одно упражнение');

    setLoading(true);
    try {
      const exercisesPayload: WorkoutExercise[] = exercises.map((ex) => ({
        exerciseId: String(ex.exerciseId),
        type: 'strength' as const,
        sets: ex.sets,
      }));

      const payload = {
        date: getLocalDateISOString(date),
        workoutType: workoutType.value as 'crossfit' | 'bodybuilding' | 'cardio',
        exercises: exercisesPayload,
        notes: notes || undefined,
      };

      await workoutsApi.create(payload);
      toast.success('Тренировка сохранена 💪');
      navigate(-1);
    } catch (err: any) {
      console.error('❌ Ошибка:', err);
      toast.error(err?.response?.data?.message || err?.message || 'Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <div className="p-4 max-w-md text-white">
        <ScreenHeader
          icon="💪"
          title="Новая тренировка"
          description="Создайте запись о вашей тренировке"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div>
            <label className="block mb-2 text-sm text-white/70">Тип тренировки</label>
            <UiListbox value={workoutType} options={workoutTypes} onChange={setWorkoutType} />
          </div>

          <div>
            <label className="block mb-2 text-sm text-white/70">Дата</label>
            <DatePicker
              selected={date}
              onChange={(d) => d && setDate(d)}
              dateFormat="d MMMM yyyy"
              locale="ru"
              wrapperClassName="w-full"
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50"
              calendarClassName="dark-datepicker"
            />
          </div>

          <div>
            <label className="block mb-2 text-sm text-white/70">Заметки (опционально)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Как прошла тренировка, самочувствие..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 resize-none"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <ExercisePicker onSelect={handleAddExercise} workoutType={workoutType.id} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ExerciseList exercises={exercises} setExercises={setExercises} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="mt-6 w-full py-3 rounded-xl bg-emerald-500 text-black font-medium disabled:opacity-50"
          >
            {loading ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </motion.div>

        {currentExercise && (
          <ExerciseDrawer
            open={showDrawer}
            exercise={currentExercise}
            onClose={() => setShowDrawer(false)}
            onSave={handleSaveExercise}
          />
        )}
      </div>
    </Screen>
  );
}
