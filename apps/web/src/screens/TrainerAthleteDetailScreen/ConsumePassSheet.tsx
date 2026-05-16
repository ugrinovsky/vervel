import { useState, useEffect } from 'react';
import axios from 'axios';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import toast from 'react-hot-toast';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import { trainerApi, type AthletePass, type AthleteWorkoutEntry } from '@/api/trainer';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

const WORKOUT_TYPE_LABEL: Record<string, string> = {
  crossfit: 'Кроссфит',
  bodybuilding: 'Силовая',
  cardio: 'Кардио',
};

interface Props {
  athleteId: number;
  pass: AthletePass;
  open: boolean;
  onClose: () => void;
  onConsumed: (updated: AthletePass) => void;
}

export default function ConsumePassSheet({ athleteId, pass, open, onClose, onConsumed }: Props) {
  const [workouts, setWorkouts] = useState<AthleteWorkoutEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [consuming, setConsuming] = useState<number | 'manual' | null>(null);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      try {
        const to = new Date().toISOString().slice(0, 10);
        // Последние 90 дней
        const from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const res = await trainerApi.getAthleteWorkouts(athleteId, from, to);
        setWorkouts(res.data.data);
      } catch {
        toast.error('Не удалось загрузить тренировки');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, athleteId]);

  const handleConsume = async (workoutId?: number) => {
    setConsuming(workoutId ?? 'manual');
    try {
      const res = await trainerApi.consumePass(pass.id, workoutId);
      onConsumed(res.data.data);
      const left = res.data.data.sessionsLeft;
      toast.success(
        left > 0
          ? `Списано. Осталось ${left} ${pluralSessions(left)}`
          : 'Списано. Абонемент исчерпан'
      );
      onClose();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.message ?? 'Не удалось списать занятие') : 'Не удалось списать занятие';
      toast.error(msg);
    } finally {
      setConsuming(null);
    }
  };

  return (
    <BottomSheet id="consume-pass" open={open} onClose={onClose} title="Списать занятие" emoji="✅">
      <div className="space-y-3">
        {/* Остаток */}
        <div className="flex items-center justify-between text-sm px-1">
          <span className="text-(--color_text_muted)">Осталось в абонементе</span>
          <span className="font-semibold text-white">
            {pass.sessionsLeft} / {pass.sessionsTotal}
          </span>
        </div>

        {/* Manual deduction — always available */}
        <button
          type="button"
          disabled={consuming !== null}
          onClick={() => handleConsume()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-(--color_primary_light)/10 border border-(--color_primary_light)/30 hover:bg-(--color_primary_light)/20 transition-all disabled:opacity-50 text-left"
        >
          <div className="flex-1 text-sm font-medium text-white">Списать вручную</div>
          {consuming === 'manual' ? (
            <div className="w-5 h-5 border-2 border-(--color_primary_light) border-t-transparent rounded-full animate-spin shrink-0" />
          ) : (
            <CheckCircleIcon className="w-5 h-5 text-(--color_primary_light) shrink-0" />
          )}
        </button>

        <div className="text-xs text-(--color_text_muted) px-1">
          Или выберите конкретную тренировку
        </div>

        {loading ? (
          <div className="py-8 text-center text-(--color_text_muted) text-sm">Загрузка...</div>
        ) : workouts.length === 0 ? (
          <div className="py-4 text-center text-(--color_text_muted) text-sm">
            Нет тренировок за последние 90 дней
          </div>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {workouts.map((w) => {
              const isConsuming = consuming === w.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  disabled={consuming !== null}
                  onClick={() => handleConsume(w.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-(--color_bg_card) border border-(--color_border) hover:border-(--color_primary_light)/40 transition-all disabled:opacity-50 text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">
                        {WORKOUT_TYPE_LABEL[w.workoutType] ?? w.workoutType}
                      </span>
                    </div>
                    <div className="text-xs text-(--color_text_muted) mt-0.5">
                      {format(parseISO(w.date), 'd MMMM yyyy', { locale: ru })}
                    </div>
                  </div>

                  {isConsuming ? (
                    <div className="w-5 h-5 border-2 border-(--color_primary_light) border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : (
                    <CheckCircleIcon className="w-5 h-5 text-(--color_text_muted) group-hover:text-(--color_primary_light) transition-colors shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

function pluralSessions(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return 'занятие';
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'занятия';
  return 'занятий';
}
