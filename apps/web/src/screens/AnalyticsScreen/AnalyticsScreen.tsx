import { useState, useEffect } from 'react';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import AnalyticsCards from '@/components/analytics/AnalyticsCards';
import { useWorkoutStats } from '@/hooks/useWorkoutsStats';
import { athleteApi } from '@/api/athlete';
import type { PeriodizationData } from '@/api/trainer';

type TimeRange = 'week' | 'month' | 'year';

export default function AnalyticsScreen() {
  const [timeRange, setTimeRange]     = useState<TimeRange>('week');
  const { data: stats }               = useWorkoutStats(timeRange);
  const { data: monthStats }          = useWorkoutStats('month');
  const [periodization, setPeriodization] = useState<PeriodizationData | null>(null);

  useEffect(() => {
    athleteApi
      .getMyPeriodization()
      .then((res) => { if (res.data.success) setPeriodization(res.data.data); })
      .catch(() => {});
  }, []);

  if (!stats) return null;

  return (
    <Screen>
      <div className="p-4">
        <ScreenHeader
          icon="📊"
          title="Аналитика"
          description="Статистика нагрузок, топ мышц и баланс тела — выберите период, чтобы увидеть динамику"
        />

        <div className="grid grid-cols-3 gap-3 mb-6">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setTimeRange(p)}
              className={`py-3 rounded-xl text-sm font-medium transition-all ${
                timeRange === p
                  ? 'bg-(--color_primary_light) text-white shadow-lg shadow-(--color_primary_light)/30'
                  : 'bg-(--color_bg_card) text-(--color_text_secondary) hover:bg-(--color_bg_card_hover) hover:text-white'
              }`}
            >
              {p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : 'Год'}
            </button>
          ))}
        </div>

        <AnalyticsCards
          stats={stats}
          monthStats={monthStats}
          periodization={periodization}
          timeRange={timeRange}
        />
      </div>
    </Screen>
  );
}
