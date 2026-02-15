import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
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
      <div className="p-4">
        <ScreenHeader
          icon="📊"
          title="Аналитика"
          description="Детальная статистика ваших тренировок"
        />

        {/* Фильтры периода */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {['Неделя', 'Месяц', 'Год'].map((period) => (
            <button
              key={period}
              onClick={() =>
                setTimeRange(period === 'Неделя' ? 'week' : period === 'Месяц' ? 'month' : 'year')
              }
              className={`py-3 rounded-xl text-sm font-medium transition-all ${
                (period === 'Неделя' && timeRange === 'week') ||
                (period === 'Месяц' && timeRange === 'month') ||
                (period === 'Год' && timeRange === 'year')
                  ? 'bg-[var(--color_primary_light)] text-white shadow-lg shadow-[var(--color_primary_light)]/30'
                  : 'bg-[var(--color_bg_card)] text-[var(--color_text_secondary)] hover:bg-[var(--color_bg_card_hover)] hover:text-white'
              }`}
            >
              {period}
            </button>
          ))}
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
          <CollapsibleBlock title="Показатели" defaultOpen={false}>
            <MetricsOverview stats={stats} />
          </CollapsibleBlock>
        </div>
      </div>
    </Screen>
  );
}
