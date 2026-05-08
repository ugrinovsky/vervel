import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { athleteCopilotApi, type CopilotWeekResponse } from '@/api/workouts';
import { workoutsApi } from '@/api/workouts';
import ExplainWhy from './ExplainWhy';
import WeeklyPlanSheet from './WeeklyPlanSheet';
import AccentButton from '@/components/ui/AccentButton';
import { SparklesIcon } from '@heroicons/react/24/outline';

const WORKOUT_TYPE_LABEL: Record<string, string> = {
  bodybuilding: 'Силовая',
  cardio: 'Кардио',
  crossfit: 'CrossFit',
};

function ColdStartCard({ message }: { message: string }) {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl p-4 bg-(--color_bg_card) border border-(--color_border)">
      <div className="flex items-start gap-3">
        <SparklesIcon className="w-5 h-5 text-(--color_primary_icon) shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white mb-1">Ассистент</div>
          <p className="text-xs text-(--color_text_muted)">{message}</p>
        </div>
      </div>
      <button
        onClick={() => navigate('/workouts/new')}
        className="mt-3 w-full py-2 rounded-xl text-sm font-medium text-(--color_primary) bg-(--color_primary_light)/15 hover:bg-(--color_primary_light)/25 transition-colors"
      >
        Добавить тренировку
      </button>
    </div>
  );
}

function RestDayCard() {
  return (
    <div className="rounded-2xl p-4 bg-(--color_bg_card) border border-(--color_border)">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🛋️</span>
        <div>
          <div className="text-sm font-semibold text-white">Сегодня отдых</div>
          <div className="text-xs text-(--color_text_muted)">
            Запланировано — тело восстанавливается
          </div>
        </div>
      </div>
    </div>
  );
}

interface Props {
  onDraftCreated?: () => void;
}

export default function AthleteCopilotCard({ onDraftCreated }: Props) {
  const navigate = useNavigate();
  const [data, setData] = useState<CopilotWeekResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [showWeek, setShowWeek] = useState(false);
  const [sendingToCoach, setSendingToCoach] = useState(false);
  const [coachSent, setCoachSent] = useState(false);

  useEffect(() => {
    athleteCopilotApi
      .getWeek()
      .then((res) => setData(res.data.data))
      .catch(() => {
        /* тихо */
      })
      .finally(() => setLoading(false));
  }, []);

  const handleStart = async () => {
    if (!data?.todaySuggestion) return;
    setStarting(true);
    try {
      const suggestion = data.todaySuggestion;
      await athleteCopilotApi.start({
        scheduledWorkoutId: suggestion.scheduledWorkoutId ?? null,
      });
      // Копируем draft в localStorage (WorkoutForm читает его)
      if (suggestion.draftWorkoutData) {
        await workoutsApi.saveDraft(suggestion.draftWorkoutData);
      }
      onDraftCreated?.();
      navigate('/workouts/new');
    } catch {
      toast.error('Не удалось подготовить тренировку');
    } finally {
      setStarting(false);
    }
  };

  const handleSendToCoach = async () => {
    if (!data) return;
    setSendingToCoach(true);
    try {
      await athleteCopilotApi.sendToCoach({
        items: data.weekItems
          .filter((i) => i.kind === 'train' && i.source === 'copilot')
          .map((i) => ({ date: i.date, title: i.title })),
      });
      setCoachSent(true);
      toast.success('Черновик отправлен тренеру');
    } catch {
      toast.error('Не удалось отправить');
    } finally {
      setSendingToCoach(false);
    }
  };

  if (loading) {
    return <div className="h-24 rounded-2xl bg-white/5 animate-pulse" />;
  }

  if (!data) return null;

  const { todaySuggestion, weekItems, explain, meta } = data;

  // Cold start
  if (meta.coldStart) {
    return <ColdStartCard message={meta.message ?? 'Добавьте первые тренировки'} />;
  }

  // Rest day
  if (!todaySuggestion || todaySuggestion.source === 'rest') {
    return (
      <div className="space-y-3">
        <RestDayCard />
        {weekItems.length > 0 && <WeeklyPlanSheet items={weekItems} />}
      </div>
    );
  }

  const isFromTrainer = todaySuggestion.source === 'trainer'
  const hasTrainerWorkouts = weekItems.some((i) => i.source === 'trainer');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        {/* Главная карточка */}
        <div className="rounded-2xl p-4 bg-(--color_bg_card) border border-(--color_border) space-y-3">
          {/* Заголовок + источник */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-4 h-4 text-(--color_primary_icon) shrink-0" />
              <span className="text-xs font-semibold text-(--color_text_muted) uppercase tracking-wider">
                Сегодня
              </span>
            </div>
            {isFromTrainer && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-(--color_primary_light)/20 text-(--color_primary_light)">
                🏋️ от тренера
              </span>
            )}
          </div>

          {/* Тренировка */}
          <div>
            <div className="text-lg font-bold text-white leading-tight">
              {WORKOUT_TYPE_LABEL[todaySuggestion.workoutType] ?? todaySuggestion.workoutType}
            </div>
            <div className="text-sm text-(--color_text_secondary) mt-0.5">
              {todaySuggestion.title}
            </div>
          </div>

          {/* ExplainWhy — только для собственных предложений ассистента, не от тренера */}
          {!isFromTrainer && explain.length > 0 && <ExplainWhy items={explain} />}

          {/* CTA */}
          <AccentButton onClick={handleStart} disabled={starting} className="w-full">
            {starting ? 'Подготавливаю...' : 'Начать тренировку'}
          </AccentButton>
        </div>

        {/* Неделя */}
        {weekItems.length > 0 && (
          <div className="rounded-2xl p-4 bg-(--color_bg_card) border border-(--color_border) space-y-3">
            <button
              onClick={() => setShowWeek((v) => !v)}
              className="flex items-center justify-between w-full"
            >
              <span className="text-xs font-semibold text-(--color_text_muted) uppercase tracking-wider">
                Неделя
              </span>
              <span className="text-xs text-(--color_text_muted)">
                {showWeek ? 'Свернуть ▲' : 'Показать ▼'}
              </span>
            </button>
            <AnimatePresence>
              {showWeek && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <WeeklyPlanSheet items={weekItems} />

                  {meta.canSendToCoach && !coachSent && !hasTrainerWorkouts && (
                    <button
                      onClick={handleSendToCoach}
                      disabled={sendingToCoach}
                      className="mt-3 w-full py-2 rounded-xl text-xs text-(--color_text_muted) border border-white/10 hover:bg-white/5 transition-colors disabled:opacity-40"
                    >
                      {sendingToCoach ? 'Отправляю...' : '📤 Предложить план тренеру'}
                    </button>
                  )}
                  {coachSent && (
                    <p className="mt-2 text-xs text-green-400 text-center">
                      ✓ Черновик отправлен тренеру
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
