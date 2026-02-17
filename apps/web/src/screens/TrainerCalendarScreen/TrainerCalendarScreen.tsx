import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import WorkoutInlineForm from '@/components/WorkoutInlineForm/WorkoutInlineForm';
import { trainerApi, type ScheduledWorkout } from '@/api/trainer';
import { CalendarIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function TrainerCalendarScreen() {
  const [workouts, setWorkouts] = useState<ScheduledWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');

  const loadWorkouts = async () => {
    try {
      setLoading(true);
      const today = new Date();
      const from = new Date(today);
      const to = new Date(today);

      if (selectedPeriod === 'week') {
        from.setDate(today.getDate() - 7);
        to.setDate(today.getDate() + 7);
      } else {
        from.setMonth(today.getMonth() - 1);
        to.setMonth(today.getMonth() + 1);
      }

      const res = await trainerApi.getScheduledWorkouts(
        from.toISOString().split('T')[0],
        to.toISOString().split('T')[0]
      );
      setWorkouts(res.data.data);
    } catch {
      toast.error('Ошибка загрузки тренировок');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkouts();
  }, [selectedPeriod]);

  const handleDelete = async (id: number) => {
    try {
      await trainerApi.deleteScheduledWorkout(id);
      toast.success('Тренировка удалена');
      loadWorkouts();
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      weekday: 'short'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <Screen>
        <div className="p-4 flex items-center justify-center min-h-[60vh]">
          <div className="text-[var(--color_text_muted)]">Загрузка...</div>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="p-4 w-full max-w-2xl mx-auto">
        <ScreenHeader icon="📅" title="Календарь" description="Запланированные тренировки" />

        {/* Period selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3 mb-6"
        >
          <button
            onClick={() => setSelectedPeriod('week')}
            className={`py-3 rounded-xl text-sm font-medium transition-all ${
              selectedPeriod === 'week'
                ? 'bg-[var(--color_primary_light)] text-white'
                : 'bg-[var(--color_bg_card)] text-[var(--color_text_muted)] hover:text-white'
            }`}
          >
            Неделя
          </button>
          <button
            onClick={() => setSelectedPeriod('month')}
            className={`py-3 rounded-xl text-sm font-medium transition-all ${
              selectedPeriod === 'month'
                ? 'bg-[var(--color_primary_light)] text-white'
                : 'bg-[var(--color_bg_card)] text-[var(--color_text_muted)] hover:text-white'
            }`}
          >
            Месяц
          </button>
        </motion.div>

        {/* Create button */}
        {!showCreateForm && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setShowCreateForm(true)}
            className="w-full mb-6 py-3 rounded-xl bg-[var(--color_primary_light)] text-white font-medium hover:opacity-90 transition-opacity"
          >
            + Создать тренировку
          </motion.button>
        )}

        {/* Create form */}
        {showCreateForm && (
          <div className="mb-6">
            <WorkoutInlineForm
              onSuccess={() => {
                setShowCreateForm(false);
                loadWorkouts();
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        )}

        {/* Workouts list */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          {workouts.length === 0 ? (
            <div className="text-center py-12 bg-[var(--color_bg_card)] rounded-2xl border border-[var(--color_border)]">
              <CalendarIcon className="w-12 h-12 text-[var(--color_text_muted)] mx-auto mb-3" />
              <p className="text-sm text-[var(--color_text_muted)]">
                Нет запланированных тренировок
              </p>
            </div>
          ) : (
            workouts.map((workout) => (
              <div
                key={workout.id}
                className="bg-[var(--color_bg_card)] rounded-2xl p-4 border border-[var(--color_border)]"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <div className="text-xs text-[var(--color_text_muted)]">
                        {formatDate(workout.scheduledDate)}
                      </div>
                      <div className="text-sm font-medium text-white">
                        {formatTime(workout.scheduledDate)}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs px-2 py-1 rounded-full bg-[var(--color_primary_light)] text-white">
                        {workout.workoutData.type}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(workout.id)}
                    className="text-[var(--color_text_muted)] hover:text-red-400 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>

                {workout.assignedTo.length > 0 && (
                  <div className="mb-2">
                    <div className="text-xs text-[var(--color_text_muted)] mb-1">Назначено:</div>
                    <div className="flex flex-wrap gap-1">
                      {workout.assignedTo.map((assigned, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 rounded-lg bg-[var(--color_bg_card_hover)] text-white"
                        >
                          {assigned.type === 'group' ? '👥' : '🏃'} {assigned.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {workout.notes && (
                  <div className="text-xs text-[var(--color_text_muted)] mt-2">
                    {workout.notes}
                  </div>
                )}
              </div>
            ))
          )}
        </motion.div>
      </div>
    </Screen>
  );
}
