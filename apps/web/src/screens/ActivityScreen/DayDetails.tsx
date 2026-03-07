import { useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate } from 'react-router';
import { PlusIcon } from '@heroicons/react/24/outline';
import { getWorkoutTypeLabel } from './utils';
import WorkoutDetailSheet from './WorkoutDetailSheet';
import type { WorkoutTimelineEntry } from '@/types/Analytics';

interface DayDetailsProps {
  date: Date;
  workouts: WorkoutTimelineEntry[];
}

function pluralWorkouts(n: number): string {
  if (n === 1) return '1 тренировка';
  if (n >= 2 && n <= 4) return `${n} тренировки`;
  return `${n} тренировок`;
}

function extractTime(dateStr: string): string | null {
  try {
    const d = new Date(dateStr);
    const h = d.getHours();
    const m = d.getMinutes();
    if (h === 0 && m === 0) return null;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  } catch {
    return null;
  }
}

function WorkoutTile({
  workout,
  onClick,
}: {
  workout: WorkoutTimelineEntry;
  onClick: () => void;
}) {
  const hasVolume = (workout.volume ?? 0) > 0;
  const volumeKg = workout.volume ?? 0;
  const volumeLabel = volumeKg >= 1000 ? `${(volumeKg / 1000).toFixed(1)} т` : `${volumeKg} кг`;
  const intensityPct = Math.round((workout.intensity ?? 0) * 100);
  const timeLabel = extractTime(workout.date);
  const fromTrainer = workout.scheduledWorkoutId != null;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border) active:scale-[0.98] transition-transform hover:border-(--color_primary_light)/40"
    >
      {/* Заголовок */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-white truncate">
            {getWorkoutTypeLabel(workout.type ?? 'unknown')}
          </span>
          {timeLabel && (
            <span className="text-xs text-(--color_text_muted) tabular-nums shrink-0">{timeLabel}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {fromTrainer && (
            <span className="text-xs px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30 font-medium">
              от тренера
            </span>
          )}
          <span className="text-xs text-(--color_text_muted)">→</span>
        </div>
      </div>

      {/* Интенсивность */}
      {intensityPct > 0 && (
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-(--color_text_muted)">Интенсивность</span>
            <span className="text-[11px] text-(--color_text_muted) tabular-nums">{intensityPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-(--color_bg_card_hover) overflow-hidden">
            <div
              className="h-full rounded-full bg-linear-to-r from-emerald-600 to-emerald-400"
              style={{ width: `${intensityPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Объём (только для силовых) */}
      {hasVolume && (
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-xs text-(--color_text_muted)">Объём:</span>
          <span className="text-sm font-semibold text-emerald-400">{volumeLabel}</span>
        </div>
      )}
    </button>
  );
}

export default function DayDetails({ date, workouts }: DayDetailsProps) {
  const [activeWorkout, setActiveWorkout] = useState<WorkoutTimelineEntry | null>(null);
  const navigate = useNavigate();
  const hasWorkouts = workouts.length > 0;

  const handleAddWorkout = () => {
    navigate('/workouts/new', { state: { date: format(date, 'yyyy-MM-dd') } });
  };

  return (
    <>
      <div className="animate-fade-in">
        <div className="glass p-5 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">
                {format(date, 'd MMMM yyyy', { locale: ru })}
              </h2>
              {hasWorkouts && (
                <p className="text-sm text-(--color_text_muted) mt-0.5">
                  {pluralWorkouts(workouts.length)}
                </p>
              )}
            </div>
            <button
              onClick={handleAddWorkout}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-(--color_primary_light) text-white text-sm font-medium hover:opacity-90 transition-opacity shrink-0"
            >
              <PlusIcon className="w-4 h-4" />
              Добавить
            </button>
          </div>

          {hasWorkouts ? (
            <div className="space-y-3">
              {workouts.map((w, i) => (
                <WorkoutTile key={i} workout={w} onClick={() => setActiveWorkout(w)} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">😴</div>
              <p className="text-(--color_text_muted) text-sm">В этот день тренировок не было</p>
              <p className="text-(--color_text_muted)/50 text-xs mt-1">
                Выберите другой день на календаре
              </p>
            </div>
          )}
        </div>
      </div>

      <WorkoutDetailSheet
        workout={activeWorkout}
        onClose={() => setActiveWorkout(null)}
      />
    </>
  );
}
