import { useState } from 'react';
import type { WorkoutStats } from '@/types/Analytics';
import type { PeriodizationData } from '@/api/trainer';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import WorkoutRadar from './WorkoutRadar';
import TopMuscles from './TopMuscles';
import StatsOverview from './StatsOverview';
import MuscleBalance from './MuscleBalance';
import { MetricsOverview } from './MetricsOverview';
import Recommendations from './Recommendations';
import WeeklyOverview from './WeeklyOverview';
import StreakBlock from './StreakBlock';
import TrendChart from './TrendChart';
import WeekdayChart from './WeekdayChart';
import PeriodizationChart from './PeriodizationChart';

interface Props {
  stats: WorkoutStats;
  /** Для StreakBlock нужны данные за месяц (28-дневный дот-календарь) */
  monthStats?: WorkoutStats | null;
  periodization?: PeriodizationData | null;
  timeRange: 'week' | 'month' | 'year';
}

interface CardDef {
  id: string;
  icon: string;
  title: string;
  /** Строка под заголовком на плитке; по умолчанию «Открыть →» */
  tileSubtitle?: string;
  /** Заголовок в BottomSheet; по умолчанию совпадает с title */
  sheetTitle?: string;
  content: React.ReactNode;
}

export default function AnalyticsCards({ stats, monthStats, periodization, timeRange }: Props) {
  const [activeCard, setActiveCard] = useState<string | null>(null);

  const periodLabel =
    timeRange === 'week' ? 'Неделя' : timeRange === 'month' ? 'Месяц' : 'Год';

  const cards: CardDef[] = [
    { id: 'muscles',         icon: '💪', title: 'Топ мышц',       content: <TopMuscles    period={timeRange} data={stats} /> },
    { id: 'stats',           icon: '📊', title: 'Нагрузка',       content: <StatsOverview  period={timeRange} data={stats} /> },
    { id: 'balance',         icon: '⚖️', title: 'Баланс мышц',    content: <MuscleBalance  period={timeRange} data={stats} /> },
    { id: 'metrics',         icon: '🎯', title: 'Показатели',     content: <MetricsOverview stats={stats} period={timeRange} /> },
    { id: 'recommendations', icon: '💡', title: 'Рекомендации',   content: <Recommendations stats={stats} /> },
    {
      id: 'weekly',
      icon: '📅',
      title: 'Календарь',
      tileSubtitle: `${periodLabel} · открыть →`,
      sheetTitle: `Календарь · ${periodLabel}`,
      content: <WeeklyOverview period={timeRange} data={stats} />,
    },
    { id: 'streak',          icon: '🔥', title: 'Регулярность',   content: <StreakBlock      data={monthStats ?? stats} period={timeRange} /> },
    { id: 'trend',           icon: '📉', title: 'Тренд нагрузки', content: <TrendChart       period={timeRange} data={stats} /> },
    ...(timeRange === 'week'
      ? []
      : [
          {
            id: 'weekday',
            icon: '🗓️',
            title: 'Привычка по дням',
            content: <WeekdayChart data={stats} />,
          } satisfies CardDef,
        ]),
    ...(periodization
      ? [{ id: 'periodization', icon: '📈', title: 'Периодизация', content: <PeriodizationChart data={periodization} /> } satisfies CardDef]
      : []),
  ];

  const openCard = cards.find((c) => c.id === activeCard) ?? null;

  return (
    <>
      <div className="mb-5">
        <WorkoutRadar period={timeRange} data={stats} />
      </div>

      <div className="grid grid-cols-2 gap-3 pb-4">
        {cards.map((card, idx) => {
          const isLastOdd = cards.length % 2 !== 0 && idx === cards.length - 1;
          return (
            <button
              key={card.id}
              onClick={() => setActiveCard(card.id)}
              className={`relative h-32.5 rounded-2xl overflow-hidden text-left flex flex-col justify-between p-4 border active:scale-95 transition-transform${isLastOdd ? ' col-span-2' : ''}`}
              style={{ backgroundColor: 'var(--color_bg_card)', borderColor: 'var(--color_border)' }}
            >
              <div
                className="absolute -top-6 -left-6 w-20 h-20 rounded-full blur-2xl pointer-events-none"
                style={{ backgroundColor: 'var(--color_primary_light)', opacity: 0.18 }}
              />
              <div
                className="relative w-11 h-11 rounded-xl flex items-center justify-center text-[22px] leading-none shrink-0 mb-2"
                style={{ backgroundColor: 'rgb(var(--color_primary_light_ch) / 0.15)' }}
              >
                {card.icon}
              </div>
              <div className="relative">
                <div className="text-sm font-semibold text-white leading-tight">{card.title}</div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--color_text_muted)' }}>
                  {card.tileSubtitle ?? 'Открыть →'}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <BottomSheet
        id="analytics-card"
        open={activeCard !== null}
        onClose={() => setActiveCard(null)}
        title={openCard?.sheetTitle ?? openCard?.title}
        emoji={openCard?.icon}
      >
        {openCard?.content}
      </BottomSheet>
    </>
  );
}
