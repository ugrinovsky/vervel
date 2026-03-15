import { useNavigate, useLocation } from 'react-router';
import ScreenHint from '@/components/ScreenHint/ScreenHint';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import WorkoutFormBase, { type WorkoutFormData } from '@/components/WorkoutFormBase/WorkoutFormBase';
import { parseLocalDate, toApiDateTime } from '@/utils/date';
import { workoutsApi, type WorkoutExercise } from '@/api/workouts';
import { checkForNewAchievements } from '@/hooks/useAchievementToast';
import type { ExerciseData } from '@/api/trainer';
import type { WorkoutType } from '@/components/WorkoutTypeTabs';

function toWorkoutExercise(ex: ExerciseData, workoutType: WorkoutType): WorkoutExercise {
  if (workoutType === 'cardio') {
    return { exerciseId: ex.exerciseId!, type: 'cardio', duration: ex.duration };
  }
  if (workoutType === 'crossfit') {
    return {
      exerciseId: ex.exerciseId!,
      type: 'wod',
      wodType: ex.wodType,
      timeCap: ex.timeCap,
      rounds: ex.rounds,
      sets: [{ id: crypto.randomUUID(), reps: ex.reps ?? 0, weight: ex.weight ?? 0 }],
    };
  }
  return {
    exerciseId: ex.exerciseId!,
    type: 'strength',
    sets: (ex.setsDetail ?? []).map((s) => ({
      id: crypto.randomUUID(),
      reps: s.reps ?? 0,
      weight: s.weight ?? 0,
    })),
    blockId: ex.blockId,
  };
}

export default function WorkoutForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillDate = (location.state as { date?: string } | null)?.date;

  const initialDate = prefillDate ? parseLocalDate(prefillDate) : undefined;

  const handleSubmit = async (data: WorkoutFormData) => {
    if (!data.exercises.length) {
      toast.error('Добавьте хотя бы одно упражнение');
      return;
    }
    try {
      await workoutsApi.create({
        date: toApiDateTime(data.date, data.time),
        workoutType: data.workoutType,
        exercises: data.exercises.map((ex) => toWorkoutExercise(ex, data.workoutType)),
        notes: data.notes || undefined,
      });
      toast.success('Тренировка сохранена 💪');
      checkForNewAchievements();
      navigate(-1);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Ошибка сохранения');
      throw err;
    }
  };

  return (
    <Screen className="workout-form-screen">
      <div className="p-4 w-full flex-1 text-white">
        <ScreenHeader
          icon="💪"
          title="Новая тренировка"
          description="Добавьте упражнения, подходы и веса вручную — или воспользуйтесь AI-распознаванием по фото или описанию"
        />

        <ScreenHint className="mb-4">
          Выберите тип тренировки, добавьте упражнения и подходы.{' '}
          <span className="text-white font-medium">AI-распознавание</span> — сфотографируйте
          страницу дневника или опишите тренировку текстом, и AI заполнит форму автоматически.
        </ScreenHint>

        <WorkoutFormBase
          initialDate={initialDate}
          notesLabel="Заметки (опционально)"
          notesPlaceholder="Как прошла тренировка, самочувствие..."
          submitLabel="Сохранить"
          onSubmit={handleSubmit}
        />
      </div>
    </Screen>
  );
}
