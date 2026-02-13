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
import { MetricsOverview } from '@/components/analytics/MetricsOverview';

export default function AnalyticsScreen() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');
  const { data: stats } = useWorkoutStats(timeRange);

  if (!stats) {
    return null;
  }

  const weeklyOverviewTitle =
    '📅 ' + (timeRange === 'week' ? 'Неделя' : timeRange === 'month' ? 'Месяц' : 'Год');

  return (
    <Screen>
      <div className="p-4 pb-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">📊 Аналитика</h1>
          <p className="text-gray-400">Детальная статистика ваших тренировок</p>

          <div className="flex gap-2 mt-4">
            {['Неделя', 'Месяц', 'Год'].map((period) => (
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <WorkoutRadar period={timeRange} data={stats} />

          <CollapsibleBlock title="Топ мышц" defaultOpen={false}>
            <TopMuscles period={timeRange} data={stats} />
          </CollapsibleBlock>
          <CollapsibleBlock title={weeklyOverviewTitle} defaultOpen={false}>
            <WeeklyOverview period={timeRange} data={stats} />
          </CollapsibleBlock>
          <CollapsibleBlock title="Статистика нагрузки" defaultOpen={false}>
            <StatsOverview period={timeRange} data={stats} />
          </CollapsibleBlock>
          <CollapsibleBlock title="Баланс мышц" defaultOpen={false}>
            <MuscleBalance period={timeRange} data={stats} />
          </CollapsibleBlock>
          <CollapsibleBlock title="Рекомендации" defaultOpen={false}>
            <Recommendations stats={stats} />
          </CollapsibleBlock>
          <CollapsibleBlock title="Метрики" defaultOpen={false}>
            <MetricsOverview stats={stats} />
          </CollapsibleBlock>
        </div>
      </div>
    </Screen>
  );
}
