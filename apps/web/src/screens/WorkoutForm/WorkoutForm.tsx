import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { motion } from 'framer-motion';
import ScreenHint from '@/components/ScreenHint/ScreenHint';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import WorkoutFormBase, {
  type WorkoutFormData,
} from '@/components/WorkoutFormBase/WorkoutFormBase';
import { parseLocalDate, toApiDateTime, toDateKey } from '@/utils/date';
import { workoutsApi } from '@/api/workouts';
import { checkForNewAchievements } from '@/hooks/useAchievementToast';
import { exerciseDataToWorkoutExercise } from '@/util/workoutExerciseConversions';
import { useAuth } from '@/contexts/AuthContext';
import { useFeatureUnlock } from '@/hooks/useFeatureUnlock';
import { workoutTypeForAthletePrimaryGoal } from '@/util/athletePrimaryGoalWorkoutType';
import { DEFAULT_WORKOUT_TYPE } from '@/constants/workoutTypes';

export default function WorkoutForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { unlock } = useFeatureUnlock();
  const locationState = location.state;
  const prefillDate =
    locationState !== null &&
    typeof locationState === 'object' &&
    !Array.isArray(locationState) &&
    'date' in locationState &&
    typeof locationState.date === 'string'
      ? locationState.date
      : undefined;

  const initialDate = prefillDate ? parseLocalDate(prefillDate) : undefined;
  const storageKey = user ? `workout_draft_${user.id}` : undefined;
  const athletePrimaryGoal = user?.clientPreferences?.athletePrimaryGoal;
  const initialWorkoutType =
    athletePrimaryGoal && athletePrimaryGoal !== 'general'
      ? workoutTypeForAthletePrimaryGoal(athletePrimaryGoal)
      : DEFAULT_WORKOUT_TYPE;

  // If we came from Calendar with a prefilled date, apply it once and clear the route state.
  // Otherwise the same history entry would keep forcing the old date on future visits.
  useEffect(() => {
    if (!prefillDate) return;
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (data: WorkoutFormData) => {
    try {
      await workoutsApi.create({
        date: toApiDateTime(data.date, data.time),
        workoutType: data.workoutType,
        exercises: data.exercises.map((ex) => exerciseDataToWorkoutExercise(ex, data.workoutType)),
        notes: data.notes || undefined,
      });
      toast.success('Тренировка сохранена 💪');
      checkForNewAchievements();
      void unlock('workout_saved');
      navigate('/calendar', { state: { date: toDateKey(data.date), savedWorkout: true } });
    } catch (err: unknown) {
      const msg =
        err !== null &&
        typeof err === 'object' &&
        'response' in err &&
        err.response !== null &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data !== null &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data &&
        typeof err.response.data.message === 'string'
          ? err.response.data.message
          : err instanceof Error
            ? err.message
            : 'Ошибка сохранения';
      toast.error(msg);
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
          description="Удобнее всего заполнить через ИИ: вставить текст программы, фото листа или кратко описать тренировку. Каталог — если нужно добрать упражнение вручную."
        />

        <ScreenHint className="mb-4">
          {athletePrimaryGoal && athletePrimaryGoal !== 'general' ? (
            <>
              Выберите дату — тип тренировки совпадает с вашей главной целью. Затем{' '}
              <span className="text-white font-medium">ИИ</span> подставит упражнения и подходы.
              Можно сохранить и без упражнений — как напоминание.
            </>
          ) : (
            <>
              Выберите дату и тип, затем <span className="text-white font-medium">ИИ</span>{' '}
              подставит упражнения и подходы. Можно сохранить и без упражнений — как напоминание.
            </>
          )}
        </ScreenHint>

        <WorkoutFormBase
          initialDate={initialDate}
          initialType={initialWorkoutType}
          storageKey={storageKey}
          lightOnboarding
          athletePrimaryGoal={athletePrimaryGoal}
          notesLabel="Заметки (опционально)"
          notesPlaceholder="Как прошла тренировка, самочувствие..."
          submitLabel="Сохранить"
          onSubmit={handleSubmit}
        />
      </motion.div>
    </Screen>
  );
}
