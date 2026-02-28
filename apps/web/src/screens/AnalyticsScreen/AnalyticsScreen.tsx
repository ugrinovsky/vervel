import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import StatsOverview from '@/components/analytics/StatsOverview';
import TopMuscles from '@/components/analytics/TopMuscles';
import MuscleBalance from '@/components/analytics/MuscleBalance';
import WeeklyOverview from '@/components/analytics/WeeklyOverview';
import Recommendations from '@/components/analytics/Recommendations';
import WorkoutRadar from '@/components/analytics/WorkoutRadar';
import PeriodizationChart from '@/components/analytics/PeriodizationChart';
import { MetricsOverview } from '@/components/analytics/MetricsOverview';
import StreakBlock from '@/components/analytics/StreakBlock';
import TrendChart from '@/components/analytics/TrendChart';
import WeekdayChart from '@/components/analytics/WeekdayChart';
import { useState, useEffect } from 'react';
import { useWorkoutStats } from '@/hooks/useWorkoutsStats';
import { athleteApi } from '@/api/athlete';
import type { PeriodizationData } from '@/api/trainer';
import BottomSheet from '@/components/BottomSheet/BottomSheet';

type TimeRange = 'week' | 'month' | 'year';

interface CardDef {
  id: string;
  icon: string;
  title: string;
  content: React.ReactNode;
}

export default function AnalyticsScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const { data: stats } = useWorkoutStats(timeRange);
  // StreakBlock's dot calendar always shows last 28 days — needs at least 'month' data
  const { data: monthStats } = useWorkoutStats('month');
  const [periodization, setPeriodization] = useState<PeriodizationData | null>(null);
  const [activeCard, setActiveCard] = useState<string | null>(null);

  useEffect(() => {
    athleteApi
      .getMyPeriodization()
      .then((res) => {
        if (res.data.success) setPeriodization(res.data.data);
      })
      .catch(() => {});
  }, []);

  if (!stats) return null;

  const periodLabel =
    timeRange === 'week' ? 'Неделя' : timeRange === 'month' ? 'Месяц' : 'Год';

  const cards: CardDef[] = [
    { id: 'muscles', icon: '💪', title: 'Топ мышц', content: <TopMuscles period={timeRange} data={stats} /> },
    { id: 'stats', icon: '📊', title: 'Нагрузка', content: <StatsOverview period={timeRange} data={stats} /> },
    { id: 'balance', icon: '⚖️', title: 'Баланс мышц', content: <MuscleBalance period={timeRange} data={stats} /> },
    { id: 'metrics', icon: '🎯', title: 'Показатели', content: <MetricsOverview stats={stats} /> },
    { id: 'recommendations', icon: '💡', title: 'Рекомендации', content: <Recommendations stats={stats} /> },
    { id: 'weekly', icon: '📅', title: periodLabel, content: <WeeklyOverview period={timeRange} data={stats} /> },
    { id: 'streak', icon: '🔥', title: 'Регулярность', content: <StreakBlock data={monthStats ?? stats} period={timeRange} /> },
    { id: 'trend', icon: '📉', title: 'Тренд нагрузки', content: <TrendChart period={timeRange} data={stats} /> },
    { id: 'weekday', icon: '📆', title: 'По дням недели', content: <WeekdayChart data={stats} /> },
    ...(periodization
      ? [{ id: 'periodization', icon: '📈', title: 'Периодизация', content: <PeriodizationChart data={periodization} /> } satisfies CardDef]
      : []),
  ];

  const openCard = cards.find((c) => c.id === activeCard) ?? null;

  return (
    <Screen>
      <div className="p-4">
        <ScreenHeader
          icon="📊"
          title="Аналитика"
          description="Детальная статистика ваших тренировок"
        />

        {/* Period filter */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {['Неделя', 'Месяц', 'Год'].map((period) => (
            <button
              key={period}
              onClick={() =>
                setTimeRange(
                  period === 'Неделя' ? 'week' : period === 'Месяц' ? 'month' : 'year'
                )
              }
              className={`py-3 rounded-xl text-sm font-medium transition-all ${
                (period === 'Неделя' && timeRange === 'week') ||
                (period === 'Месяц' && timeRange === 'month') ||
                (period === 'Год' && timeRange === 'year')
                  ? 'bg-(--color_primary_light) text-white shadow-lg shadow-(--color_primary_light)/30'
                  : 'bg-(--color_bg_card) text-(--color_text_secondary) hover:bg-(--color_bg_card_hover) hover:text-white'
              }`}
            >
              {period}
            </button>
          ))}
        </div>

        {/* Radar — full width */}
        <div className="mb-5">
          <WorkoutRadar period={timeRange} data={stats} />
        </div>

        {/* 2-column card grid */}
        <div className="grid grid-cols-2 gap-3 pb-4">
          {cards.map((card, idx) => {
            const isLastOdd = cards.length % 2 !== 0 && idx === cards.length - 1;
            return (
              <button
                key={card.id}
                onClick={() => setActiveCard(card.id)}
                className={`relative h-[130px] rounded-2xl overflow-hidden text-left flex flex-col justify-between p-4 border active:scale-95 transition-transform${isLastOdd ? ' col-span-2' : ''}`}
                style={{
                  backgroundColor: 'var(--color_bg_card)',
                  borderColor: 'var(--color_border)',
                }}
              >
                <div
                  className="absolute -top-6 -left-6 w-20 h-20 rounded-full blur-2xl pointer-events-none"
                  style={{ backgroundColor: 'var(--color_primary_light)', opacity: 0.18 }}
                />
                <div
                  className="relative w-11 h-11 rounded-xl flex items-center justify-center text-[22px] leading-none shrink-0"
                  style={{ backgroundColor: 'rgb(var(--color_primary_light_ch) / 0.15)' }}
                >
                  {card.icon}
                </div>
                <div className="relative">
                  <div className="text-sm font-semibold text-white leading-tight">{card.title}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--color_text_muted)' }}>
                    Открыть →
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <BottomSheet
        open={activeCard !== null}
        onClose={() => setActiveCard(null)}
        title={openCard?.title}
        emoji={openCard?.icon}
      >
        {openCard?.content}
      </BottomSheet>
    </Screen>
  );
}
