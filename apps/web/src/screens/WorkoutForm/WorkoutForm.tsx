// WorkoutForm.tsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import WorkoutTypeTabs, { type WorkoutType } from '@/components/WorkoutTypeTabs';
import WorkoutDateTimeRow from '@/components/WorkoutDateTimeRow';
import FormField from '@/components/FormField';
import ExercisePicker from '@/components/ExercisePicker/ExercisePicker';
import ExerciseList from './ExerciseList';
import ExerciseDrawer from './ExerciseDrawer';
import { getLocalDateISOString } from '@/util/exercise';
import { workoutsApi, WorkoutExercise } from '@/api/workouts';
import type { ExerciseWithSets } from '@/types/Exercise';
import AiWorkoutRecognizer from '@/components/AiWorkoutRecognizer/AiWorkoutRecognizer';
import type { AiWorkoutResult } from '@/api/ai';

export default function WorkoutForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillDate = (location.state as { date?: string } | null)?.date;

  const [workoutType, setWorkoutType] = useState<WorkoutType>('crossfit');
  const [date, setDate] = useState<Date>(() => {
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
    setWorkoutType(result.workoutType);
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
        type: workoutType === 'crossfit' ? 'wod' as const : workoutType === 'cardio' ? 'cardio' as const : 'strength' as const,
        sets: ex.sets,
      }));

      const payload = {
        date: `${getLocalDateISOString(date)}T${format(time, 'HH:mm')}:00`,
        workoutType,
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
    <Screen className="workout-form-screen">
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
          <FormField label="Когда">
            <WorkoutDateTimeRow
              date={date}
              time={time}
              onDateChange={setDate}
              onTimeChange={setTime}
            />
          </FormField>

          <FormField label="Тип тренировки">
            <WorkoutTypeTabs value={workoutType} onChange={setWorkoutType} />
          </FormField>

          <FormField label="Заметки (опционально)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Как прошла тренировка, самочувствие..."
              rows={3}
              className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors resize-none placeholder:text-(--color_text_muted) leading-relaxed"
            />
          </FormField>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <AiWorkoutRecognizer onResult={handleAiResult} />
          <ExercisePicker onSelect={handleAddExercise} workoutType={workoutType} />
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
            className="mt-6 w-full py-3 rounded-xl bg-(--color_primary_light) text-white font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {loading ? 'Сохраняем…' : 'Сохранить'}
          </button>
        </motion.div>

        {currentExercise && (
          <ExerciseDrawer
            open={showDrawer}
            exercise={currentExercise}
            workoutType={workoutType}
            onClose={() => setShowDrawer(false)}
            onSave={handleSaveExercise}
          />
        )}
      </div>
    </Screen>
  );
}
