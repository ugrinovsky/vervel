import { WorkoutStats } from '@/types/Analytics';
import { DISPLAY, METRICS } from '@/constants/AnalyticsConstants';

interface MetricOverviewProps {
  stats: WorkoutStats;
}

export function MetricsOverview({ stats }: MetricOverviewProps) {
  const timeline = stats?.timeline ?? [];
  const zones: Record<string, number> = stats?.zones ?? {};
  const avgIntensityRaw = stats?.avgIntensity ?? 0;

  const avgIntensity = Math.round(avgIntensityRaw * DISPLAY.PERCENT_MULTIPLIER);
  const workoutsPerWeek = timeline.length > 0 ? timeline.length / METRICS.WEEKS_PER_PERIOD : 0;

  const zoneValues = Object.values(zones);
  let muscleBalance = 0;

  if (zoneValues.length > 1) {
    const max = Math.max(...zoneValues);
    const min = Math.min(...zoneValues);
    muscleBalance = Math.max(0, 1 - (max - min));
  }

  const muscleBalancePercent = Math.round(muscleBalance * DISPLAY.PERCENT_MULTIPLIER);

  let weightProgress = 0;
  const volumeWorkouts = timeline.filter((w) => (w.volume ?? 0) >= METRICS.MIN_VOLUME);

  if (volumeWorkouts.length >= METRICS.MIN_WORKOUTS_FOR_PROGRESS) {
    const mid = Math.floor(volumeWorkouts.length / 2);

    const firstHalf = volumeWorkouts.slice(0, mid);
    const secondHalf = volumeWorkouts.slice(mid);

    const avgFirst =
      firstHalf.reduce((sum, w) => sum + (w.volume ?? 0), 0) / firstHalf.length;
    const avgSecond =
      secondHalf.reduce((sum, w) => sum + (w.volume ?? 0), 0) / secondHalf.length;

    if (avgFirst > 0) {
      weightProgress = (avgSecond - avgFirst) / avgFirst;
    }
  }

  const weightProgressPercent = Math.round(weightProgress * DISPLAY.PERCENT_MULTIPLIER);

  // --- Изменения считаем по последним двум тренировкам ---
  let intensityChange = 0;
  let weightChange = 0;

  if (timeline.length > 1) {
    const prev = timeline[timeline.length - METRICS.MIN_WORKOUTS_FOR_CHANGES];
    const last = timeline[timeline.length - 1];

    if (prev?.intensity && last?.intensity) {
      intensityChange = Math.round((last.intensity - prev.intensity) * DISPLAY.PERCENT_MULTIPLIER);
    }

    if (volumeWorkouts.length >= METRICS.MIN_WORKOUTS_FOR_CHANGES) {
      const prevVolume = volumeWorkouts[volumeWorkouts.length - METRICS.MIN_WORKOUTS_FOR_CHANGES];
      const lastVolume = volumeWorkouts[volumeWorkouts.length - 1];

      if (prevVolume?.volume && lastVolume?.volume && prevVolume.volume > 0) {
        weightChange = Math.round(
          ((lastVolume.volume - prevVolume.volume) / prevVolume.volume) * DISPLAY.PERCENT_MULTIPLIER
        );
      }
    }
  }

  const metrics = [
    {
      title: 'Средняя интенсивность',
      value: `${avgIntensity}%`,
      change: intensityChange,
      color: 'green' as const,
    },
    {
      title: 'Частота тренировок',
      value: `${workoutsPerWeek.toFixed(1)}/нед`,
      change: null,
      color: 'blue' as const,
    },
    {
      title: 'Баланс мышц',
      value: `${muscleBalancePercent}%`,
      change: null,
      color: 'purple' as const,
    },
    {
      title: 'Динамика объема',
      value: volumeWorkouts.length >= METRICS.MIN_WORKOUTS_FOR_DYNAMICS ? `${weightProgressPercent}%` : '—',
      change: volumeWorkouts.length >= METRICS.MIN_WORKOUTS_FOR_DYNAMICS ? weightChange : null,
      color: 'yellow' as const,
    },
  ];

  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <MetricCard
          key={metric.title}
          title={metric.title}
          value={metric.value}
          change={metric.change}
          color={metric.color}
        />
      ))}
    </div>
  );
}

function MetricCard({
  title,
  value,
  change,
  color,
}: {
  title: string;
  value: string;
  change: number | null;
  color: 'green' | 'blue' | 'purple' | 'yellow';
}) {
  const colorClasses = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    yellow: 'text-yellow-400',
  };

  const isPositive = change !== null && change >= 0;

  return (
    <div className="glass p-3 rounded-xl">
      <div className="text-sm text-[var(--color_text_muted)] mb-1">{title}</div>
      <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
      {change !== null && Math.abs(change) > 0 && (
        <div className="text-xs text-[var(--color_text_muted)] mt-1">
          <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
            {isPositive ? '↑' : '↓'} {Math.abs(change)}
          </span>{' '}
          за период
        </div>
      )}
    </div>
  );
}
