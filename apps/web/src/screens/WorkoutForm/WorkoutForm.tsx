import { useNavigate, useLocation } from 'react-router';
import { motion } from 'framer-motion';
import ScreenHint from '@/components/ScreenHint/ScreenHint';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import WorkoutFormBase, { type WorkoutFormData } from '@/components/WorkoutFormBase/WorkoutFormBase';
import { parseLocalDate, toApiDateTime, toDateKey } from '@/utils/date';
import { workoutsApi } from '@/api/workouts';
import { checkForNewAchievements } from '@/hooks/useAchievementToast';
import { exerciseDataToWorkoutExercise } from '@/util/workoutExerciseConversions';
import { useAuth } from '@/contexts/AuthContext';

export default function WorkoutForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const prefillDate = (location.state as { date?: string } | null)?.date;

  const initialDate = prefillDate ? parseLocalDate(prefillDate) : undefined;
  const storageKey = user ? `workout_draft_${user.id}` : undefined;

  const handleSubmit = async (data: WorkoutFormData) => {
    if (!data.exercises.length) {
      toast.error('Добавьте хотя бы одно упражнение');
      return;
    }
    try {
      await workoutsApi.create({
        date: toApiDateTime(data.date, data.time),
        workoutType: data.workoutType,
        exercises: data.exercises.map((ex) => exerciseDataToWorkoutExercise(ex, data.workoutType)),
        notes: data.notes || undefined,
      });
      toast.success('Тренировка сохранена 💪');
      checkForNewAchievements();
      navigate('/calendar', { state: { date: toDateKey(data.date) } });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Ошибка сохранения');
      throw err;
    }
  };

  return (
    <Screen className="workout-form-screen">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="p-4 w-full flex-1 text-white"
      >
        <ScreenHeader
          icon="💪"
          title="Новая тренировка"
          description="Добавьте упражнения, подходы и веса вручную — или воспользуйтесь ИИ-распознаванием по фото или описанию"
        />

        <ScreenHint className="mb-4">
          Выберите тип тренировки, добавьте упражнения и подходы.{' '}
          <span className="text-white font-medium">ИИ-распознавание</span> — по фото или текстовому
          описанию ИИ заполнит форму автоматически.
        </ScreenHint>

        <WorkoutFormBase
          initialDate={initialDate}
          storageKey={storageKey}
          notesLabel="Заметки (опционально)"
          notesPlaceholder="Как прошла тренировка, самочувствие..."
          submitLabel="Сохранить"
          onSubmit={handleSubmit}
        />
      </motion.div>
    </Screen>
  );
}
