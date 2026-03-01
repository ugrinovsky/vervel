// WorkoutForm.tsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ru } from 'date-fns/locale';
import UiListbox from '@/components/ui/Listbox';
import ExercisePicker from '@/components/ExercisePicker/ExercisePicker';
import ExerciseList from './ExerciseList';
import ExerciseDrawer from './ExerciseDrawer';
import { getLocalDateISOString } from '@/util/exercise';
import { workoutsApi, WorkoutExercise } from '@/api/workouts';
import type { ExerciseWithSets } from '@/types/Exercise';
import { WorkoutTypeOption, workoutTypes } from '@/constants/workoutTypes';
import AiWorkoutRecognizer from '@/components/AiWorkoutRecognizer/AiWorkoutRecognizer';
import type { AiWorkoutResult } from '@/api/ai';
import 'react-datepicker/dist/react-datepicker.css';
import '@/styles/datepicker.css';

registerLocale('ru', ru);

export default function WorkoutForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillDate = (location.state as { date?: string } | null)?.date;

  const [workoutType, setWorkoutType] = useState<WorkoutTypeOption>(workoutTypes[0]);
  const [date, setDate] = useState(() => {
    if (prefillDate) {
      const [y, m, d] = prefillDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  });
  const [time, setTime] = useState<Date>(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
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

  const handleAiResult = (result: AiWorkoutResult) => {
    // Устанавливаем тип тренировки из AI
    const typeOption = workoutTypes.find((t) => t.value === result.workoutType) ?? workoutTypes[0];
    setWorkoutType(typeOption);

    // Конвертируем AiExercise[] → ExerciseWithSets[]
    // exerciseId: реальный из каталога (для расчёта зон мышц) или временный 'ai-N'
    const converted: ExerciseWithSets[] = result.exercises.map((ex, i) => ({
      exerciseId: ex.exerciseId ?? `ai-${i}`,
      title: ex.name,
      notes: ex.notes,
      sets: Array.from({ length: ex.sets }, () => ({
        id: crypto.randomUUID(),
        reps: ex.reps ?? 1,
        weight: ex.weight ?? 0,
      })),
    }));
    setExercises(converted);
    if (result.notes) setNotes(result.notes);
    toast.success(`AI распознал ${converted.length} упражнений`);
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
        date: `${getLocalDateISOString(date)}T${format(time, 'HH:mm')}:00`,
        workoutType: workoutType.value,
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
          description="Добавьте упражнения, подходы и веса вручную — или воспользуйтесь AI-распознаванием по фото или описанию"
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

          {/* Date + Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-2 text-sm text-white/70">Дата</label>
              <DatePicker
                selected={date}
                onChange={(d: Date | null) => d && setDate(d)}
                dateFormat="d MMM yyyy"
                locale="ru"
                wrapperClassName="w-full"
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50"
                calendarClassName="dark-datepicker"
                popperPlacement="bottom-start"
              />
            </div>
            <div>
              <label className="block mb-2 text-sm text-white/70">Время</label>
              <DatePicker
                selected={time}
                onChange={(t: Date | null) => t && setTime(t)}
                showTimeSelect
                showTimeSelectOnly
                timeIntervals={15}
                timeCaption="Время"
                dateFormat="HH:mm"
                timeFormat="HH:mm"
                locale="ru"
                wrapperClassName="w-full"
                className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50"
                calendarClassName="dark-datepicker"
              />
            </div>
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
          className="space-y-2"
        >
          <AiWorkoutRecognizer onResult={handleAiResult} />
          <ExercisePicker onSelect={handleAddExercise} workoutType={workoutType.value} />
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
