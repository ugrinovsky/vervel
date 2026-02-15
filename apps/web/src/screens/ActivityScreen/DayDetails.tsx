import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import StatItem from './StatItem';
import { formatVolume, getWorkoutTypeLabel, getWorkoutEffortLabel } from './utils';
import type { DayStats } from './useActivityData';

interface DayDetailsProps {
  date: Date;
  stats: DayStats;
}

const MAX_DAILY_VOLUME = 20000;

function VolumeBar({ volume }: { volume: number }) {
  const pct = Math.min((volume / MAX_DAILY_VOLUME) * 100, 100);

  return (
    <div className="mt-4 p-3 bg-(--color_bg_card) rounded-lg space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-(--color_text_muted)">{getWorkoutEffortLabel(volume)}</span>
        <span className="text-emerald-400 font-medium">{formatVolume(volume)}</span>
      </div>
      <div className="h-2 rounded-full bg-(--color_bg_card_hover) overflow-hidden">
        <div
          className="h-full rounded-full bg-linear-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function DayDetails({ date, stats }: DayDetailsProps) {
  const hasWorkout = stats.volume > 0;

  return (
    <div className="animate-fade-in">
      <div className="glass p-5 rounded-xl">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white">
            {format(date, 'd MMMM yyyy', { locale: ru })}
          </h2>
          {stats.type && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm px-2 py-1 bg-(--color_bg_card_hover) rounded-full text-(--color_text_secondary)">
                {getWorkoutTypeLabel(stats.type)}
              </span>
              {stats.intensity > 0 && (
                <span className="text-sm text-(--color_text_muted)">
                  Интенсивность: {Math.round(stats.intensity * 100)}%
                </span>
              )}
            </div>
          )}
        </div>

        {hasWorkout ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatItem
                value={stats.exercises.toString()}
                label="Упражнений"
                icon="🏋️‍♂️"
                detail={`Выполнено упражнений: ${stats.exercises}`}
              />
              <StatItem
                value={`${stats.duration} мин`}
                label="Длительность"
                icon="⏱️"
                detail={`${Math.floor(stats.duration / 60)}ч ${stats.duration % 60}мин`}
              />
              <StatItem
                value={formatVolume(stats.volume)}
                label="Объем"
                icon="📊"
                title={`${stats.volume.toLocaleString()} кг`}
                detail={`${(stats.volume / 1000).toFixed(2)} тонн`}
              />
              <StatItem
                value={stats.calories.toLocaleString()}
                label="Калорий"
                icon="🔥"
                detail={`~${Math.round(stats.calories / 100)}% от дневной нормы`}
              />
            </div>

            <VolumeBar volume={stats.volume} />
          </>
        ) : (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">😴</div>
            <p className="text-(--color_text_muted) text-sm">
              В этот день тренировок не было
            </p>
            <p className="text-(--color_text_muted)/50 text-xs mt-1">
              Выберите другой день на календаре
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
