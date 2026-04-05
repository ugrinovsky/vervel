import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ScreenLinks from '@/components/ScreenLinks/ScreenLinks';
import ScreenHint from '@/components/ScreenHint/ScreenHint';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import AnalyticsCards from '@/components/analytics/AnalyticsCards';
import { useWorkoutStats } from '@/hooks/useWorkoutsStats';
import { athleteApi } from '@/api/athlete';
import type { PeriodizationData } from '@/api/trainer';

type TimeRange = 'week' | 'month' | 'year';

export default function AnalyticsScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const { data: stats } = useWorkoutStats(timeRange);
  const { data: monthStats } = useWorkoutStats('month');
  const [periodization, setPeriodization] = useState<PeriodizationData | null>(null);

  useEffect(() => {
    athleteApi
      .getMyPeriodization()
      .then((res) => {
        if (res.data.success) setPeriodization(res.data.data);
      })
      .catch(() => {});
  }, []);

  if (!stats) return null;

  return (
    <Screen className="analytics-screen">
      <div className="p-4">
        <ScreenHeader
          icon="📊"
          title="Аналитика"
          description="Статистика нагрузок, топ мышц и баланс тела — выберите период, чтобы увидеть динамику"
        />

        <ScreenHint className="mb-4">
          <span className="text-white font-medium">Неделя</span> — оперативный контроль нагрузки.{' '}
          <br />
          <span className="text-white font-medium">Месяц</span> — видите тренды и объём работы.{' '}
          <br />
          <span className="text-white font-medium">Год</span> — оцениваете долгосрочный прогресс и
          периодизацию.
        </ScreenHint>

        {/* Period selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="grid grid-cols-3 gap-3 mb-4"
        >
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
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <AnalyticsCards
            stats={stats}
            monthStats={monthStats}
            periodization={periodization}
            timeRange={timeRange}
          />
        </motion.div>

        {/* Quick links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6"
        >
          <ScreenLinks
            links={[
              {
                emoji: '📅',
                bg: 'bg-blue-500/20',
                label: 'Календарь',
                sub: 'История по дням',
                to: '/calendar',
              },
              {
                emoji: '🔥',
                bg: 'bg-orange-500/20',
                label: 'Серия дней',
                sub: 'Достижения и рекорды',
                to: '/streak',
              },
              {
                emoji: '📒',
                bg: 'bg-purple-500/20',
                label: 'Силовой журнал',
                sub: 'Прогресс по весам',
                to: '/strength-log',
              },
            ]}
          />
        </motion.div>
      </div>
    </Screen>
  );
}
