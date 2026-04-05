import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import ScreenLinks from '@/components/ScreenLinks/ScreenLinks';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import AnalyticsCards from '@/components/analytics/AnalyticsCards';
import AnalyticsPeriodToggle from '@/components/analytics/AnalyticsPeriodToggle';
import { useWorkoutStats } from '@/hooks/useWorkoutsStats';
import { athleteApi } from '@/api/athlete';
import type { PeriodizationData } from '@/api/trainer';

type TimeRange = 'week' | 'month' | 'year';

export default function AnalyticsScreen() {
  const navigate = useNavigate();
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
          description="Обзор объёма, зон и регулярности за период. Рост весов и упражнений — в «Силе и прогрессе»."
        />

        <motion.button
          type="button"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          onClick={() => navigate('/progression')}
          className="w-full mb-4 rounded-2xl p-4 text-left border active:scale-[0.99] transition-transform flex items-center gap-3 group"
          style={{
            background:
              'linear-gradient(135deg, rgb(var(--color_primary_light_ch) / 0.28) 0%, rgb(var(--color_primary_ch) / 0.12) 100%)',
            borderColor: 'rgb(var(--color_primary_light_ch) / 0.45)',
            boxShadow: '0 8px 28px rgb(var(--color_primary_ch) / 0.18)',
          }}
        >
          <span className="text-3xl shrink-0" aria-hidden>
            🏋️
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-base font-bold text-white">Сила и прогресс</div>
            <p className="text-xs text-(--color_text_muted) mt-0.5 leading-relaxed">
              Журнал весов, динамика по упражнениям и силовые показатели — главный экран, если отслеживаете
              рост силы.
            </p>
          </div>
          <ChevronRightIcon className="w-6 h-6 shrink-0 text-(--color_primary_icon) group-hover:translate-x-0.5 transition-transform" />
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mb-4"
        >
          <AnalyticsPeriodToggle value={timeRange} onChange={setTimeRange} />
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
            ]}
          />
        </motion.div>
      </div>
    </Screen>
  );
}
