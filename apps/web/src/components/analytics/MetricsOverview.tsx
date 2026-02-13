import { WorkoutStats } from '@/types/Analytics';

interface MetricOverviewProps {
  stats: WorkoutStats;
}

export function MetricsOverview({ stats }: MetricOverviewProps) {
  const timeline = stats?.timeline ?? [];
  const zones: Record<string, number> = stats?.zones ?? {};
  const avgIntensityRaw = stats?.avgIntensity ?? 0;

  // --- 1. Средняя интенсивность ---
  const avgIntensity = Math.round(avgIntensityRaw * 100);

  // --- 2. Частота тренировок (среднее за 4 недели, если нет периода) ---
  const workoutsPerWeek = timeline.length > 0 ? timeline.length / 4 : 0;

  // --- 3. Баланс мышц (1 - разница между макс и мин зоной) ---
  const zoneValues = Object.values(zones);
  let muscleBalance = 0;

  if (zoneValues.length > 1) {
    const max = Math.max(...zoneValues);
    const min = Math.min(...zoneValues);
    muscleBalance = Math.max(0, 1 - (max - min));
  }

  const muscleBalancePercent = Math.round(muscleBalance * 100);

  // --- 4. Прогресс в весах (по объёму: последняя vs первая тренировка) ---
  let weightProgress = 0;

  if (timeline.length > 1) {
    const first = timeline[0]?.volume ?? 0;
    const last = timeline[timeline.length - 1]?.volume ?? 0;

    if (first > 0) {
      weightProgress = (last - first) / first;
    }
  }

  const weightProgressPercent = Math.round(weightProgress * 100);

  // --- Изменения считаем по последним двум тренировкам ---
  let intensityChange = 0;
  let workoutsChange = 0;
  let balanceChange = 0;
  let weightChange = 0;

  if (timeline.length > 1) {
    const prev = timeline[timeline.length - 2];
    const last = timeline[timeline.length - 1];

    if (prev?.intensity && last?.intensity) {
      intensityChange = (last.intensity - prev.intensity) * 100;
    }

    if (prev?.volume && last?.volume && prev.volume > 0) {
      weightChange = ((last.volume - prev.volume) / prev.volume) * 100;
    }
  }

  const metrics = [
    {
      title: 'Средняя интенсивность',
      value: `${avgIntensity}%`,
      change: Math.round(intensityChange),
      color: 'green' as const,
    },
    {
      title: 'Частота тренировок',
      value: `${workoutsPerWeek.toFixed(1)}/нед`,
      change: Math.round(workoutsChange),
      color: 'blue' as const,
    },
    {
      title: 'Баланс мышц',
      value: `${muscleBalancePercent}%`,
      change: Math.round(balanceChange),
      color: 'purple' as const,
    },
    {
      title: 'Прогресс в весах',
      value: `${weightProgressPercent}%`,
      change: Math.round(weightChange),
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
  change: number;
  color: 'green' | 'blue' | 'purple' | 'yellow';
}) {
  const colorClasses = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    yellow: 'text-yellow-400',
  };

  const isPositive = change >= 0;

  return (
    <div className="glass p-4 rounded-xl">
      <div className="text-sm text-gray-400 mb-1">{title}</div>
      <div className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">
        <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
          {isPositive ? '↑' : '↓'} {Math.abs(change)}
        </span>{' '}
        за период
      </div>
    </div>
  );
}
