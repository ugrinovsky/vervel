import { useNavigate, useLocation } from 'react-router';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import WorkoutFormBase, { type WorkoutFormData } from '@/components/WorkoutFormBase/WorkoutFormBase';
import { getLocalDateISOString } from '@/util/exercise';
import { workoutsApi, type WorkoutExercise } from '@/api/workouts';
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
  };
}

export default function WorkoutForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillDate = (location.state as { date?: string } | null)?.date;

  const initialDate = prefillDate
    ? (() => { const [y, m, d] = prefillDate.split('-').map(Number); return new Date(y, m - 1, d); })()
    : undefined;

  const handleSubmit = async (data: WorkoutFormData) => {
    if (!data.exercises.length) {
      toast.error('Добавьте хотя бы одно упражнение');
      return;
    }
    try {
      await workoutsApi.create({
        date: `${getLocalDateISOString(data.date)}T${format(data.time, 'HH:mm')}:00`,
        workoutType: data.workoutType,
        exercises: data.exercises.map((ex) => toWorkoutExercise(ex, data.workoutType)),
        notes: data.notes || undefined,
      });
      toast.success('Тренировка сохранена 💪');
      navigate(-1);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Ошибка сохранения');
      throw err;
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
