// app/screens/AnalyticsScreen.tsx
import Screen from '@/components/Screen/Screen';
import StatsOverview from '@/components/analytics/StatsOverview';
import TopMuscles from '@/components/analytics/TopMuscles';
import MuscleBalance from '@/components/analytics/MuscleBalance';
import WeeklyOverview from '@/components/analytics/WeeklyOverview';
import Recommendations from '@/components/analytics/Recommendations';
import WorkoutRadar from '@/components/analytics/WorkoutRadar';
import { useState } from 'react';
import { useWorkoutStats } from '@/hooks/useWorkoutsStats';
import CollapsibleBlock from '@/components/ui/CollapsibleBlock';

export default function AnalyticsScreen() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const { data: stats = {}, loading, error } = useWorkoutStats(timeRange);

  return (
    <Screen>
      <div className="p-4 pb-20">
        {/* Шапка */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">📊 Аналитика</h1>
          <p className="text-gray-400">Детальная статистика ваших тренировок</p>

          {/* Фильтры времени */}
          <div className="flex gap-2 mt-4">
            {['Неделя', 'Месяц', '3 месяца', 'Год'].map((period) => (
              <button
                key={period}
                onClick={() =>
                  setTimeRange(period === 'Неделя' ? 'week' : period === 'Месяц' ? 'month' : 'year')
                }
                className={`px-4 py-2 rounded-full text-sm transition ${
                  (period === 'Неделя' && timeRange === 'week') ||
                  (period === 'Месяц' && timeRange === 'month') ||
                  (period === 'Год' && timeRange === 'year')
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        {/* Основная сетка */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Левая колонка */}
          {/* Радарная диаграмма - большая */}
          <div className="glass p-6 rounded-xl">
            <h2 className="text-xl font-bold mb-4 text-white">Профиль нагрузки</h2>
            <WorkoutRadar period={timeRange} />
          </div>
          <CollapsibleBlock title="Топ мышц" defaultOpen={true}>
            <TopMuscles period={timeRange} />
          </CollapsibleBlock>
          <CollapsibleBlock title="Топ мышц" defaultOpen={true}>
            <WeeklyOverview />
          </CollapsibleBlock>
          <CollapsibleBlock title="Статистика нагрузки" defaultOpen={true}>
            <StatsOverview period={timeRange} data={stats} />
          </CollapsibleBlock>
          <CollapsibleBlock title="Баланс мышц" defaultOpen={true}>
            <MuscleBalance period={timeRange} data={stats} />
          </CollapsibleBlock>
          Рекомендации
          <Recommendations period={timeRange} />
        </div>

        {/* Дополнительные метрики внизу */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Средняя интенсивность" value="87%" change="+5%" color="green" />
          <MetricCard title="Частота тренировок" value="4.2/нед" change="+0.3" color="blue" />
          <MetricCard title="Баланс мышц" value="92%" change="+2%" color="purple" />
          <MetricCard title="Прогресс в весах" value="+8%" change="+3%" color="yellow" />
        </div>
      </div>
    </Screen>
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
  change: string;
  color: string;
}) {
  const colorClasses = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    yellow: 'text-yellow-400',
  };

  return (
    <div className="glass p-4 rounded-xl">
      <div className="text-sm text-gray-400 mb-1">{title}</div>
      <div className={`text-2xl font-bold ${colorClasses[color as keyof typeof colorClasses]}`}>
        {value}
      </div>
      <div className="text-xs text-gray-400 mt-1">
        <span className="text-green-400">↑ {change}</span> за период
      </div>
    </div>
  );
}
