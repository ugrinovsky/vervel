import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import WorkoutRadar from '@/components/analytics/WorkoutRadar';
import StatsOverview from '@/components/analytics/StatsOverview';
import TopMuscles from '@/components/analytics/TopMuscles';
import MuscleBalance from '@/components/analytics/MuscleBalance';
import CollapsibleBlock from '@/components/ui/CollapsibleBlock';
import Avatar from '@/components/Avatar/Avatar';
import { useAthleteStats, type StatsPeriod } from '@/hooks/useAthleteStats';
import { useAthleteAvatar } from '@/hooks/useAthleteAvatar';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

type Tab = 'analytics' | 'avatar';

export default function TrainerAthleteDetailScreen() {
  const { athleteId } = useParams<{ athleteId: string }>();
  const navigate = useNavigate();
  const id = Number(athleteId);

  const [tab, setTab] = useState<Tab>('analytics');
  const [timeRange, setTimeRange] = useState<StatsPeriod>('week');

  const { data: stats } = useAthleteStats(id, timeRange);
  const { data: avatarData, loading: avatarLoading } = useAthleteAvatar(id);

  const zoneIntensities = useMemo(() => {
    if (!avatarData?.zones) return {};
    const result: Record<string, number> = {};
    for (const [name, state] of Object.entries(avatarData.zones)) {
      result[name] = state.intensity;
    }
    return result;
  }, [avatarData]);

  return (
    <Screen>
      <div className="p-4 w-full max-w-2xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => navigate('/trainer')}
          className="flex items-center gap-2 text-[var(--color_text_muted)] hover:text-white transition-colors mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span className="text-sm">Назад</span>
        </button>

        <ScreenHeader icon="📊" title="Данные атлета" description="Аналитика и восстановление" />

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3 mb-6"
        >
          <button
            onClick={() => setTab('analytics')}
            className={`py-3 rounded-xl text-sm font-medium transition-all ${
              tab === 'analytics'
                ? 'bg-[var(--color_primary_light)] text-white shadow-lg'
                : 'bg-[var(--color_bg_card)] text-[var(--color_text_secondary)] hover:text-white'
            }`}
          >
            Аналитика
          </button>
          <button
            onClick={() => setTab('avatar')}
            className={`py-3 rounded-xl text-sm font-medium transition-all ${
              tab === 'avatar'
                ? 'bg-[var(--color_primary_light)] text-white shadow-lg'
                : 'bg-[var(--color_bg_card)] text-[var(--color_text_secondary)] hover:text-white'
            }`}
          >
            Карта нагрузки
          </button>
        </motion.div>

        {/* Analytics tab */}
        {tab === 'analytics' && (
          <>
            {/* Period filter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-3 gap-3 mb-6"
            >
              {(['week', 'month', 'year'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setTimeRange(period)}
                  className={`py-3 rounded-xl text-sm font-medium transition-all ${
                    timeRange === period
                      ? 'bg-[var(--color_primary_light)] text-white shadow-lg shadow-[var(--color_primary_light)]/30'
                      : 'bg-[var(--color_bg_card)] text-[var(--color_text_secondary)] hover:text-white'
                  }`}
                >
                  {period === 'week' ? 'Неделя' : period === 'month' ? 'Месяц' : 'Год'}
                </button>
              ))}
            </motion.div>

            {stats && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 gap-6"
              >
                <WorkoutRadar period={timeRange} data={stats} />
                <CollapsibleBlock title="Топ мышц" defaultOpen={false}>
                  <TopMuscles period={timeRange} data={stats} />
                </CollapsibleBlock>
                <CollapsibleBlock title="Статистика нагрузки" defaultOpen={false}>
                  <StatsOverview period={timeRange} data={stats} />
                </CollapsibleBlock>
                <CollapsibleBlock title="Баланс мышц" defaultOpen={false}>
                  <MuscleBalance period={timeRange} data={stats} />
                </CollapsibleBlock>
              </motion.div>
            )}

            {!stats && (
              <div className="text-center text-[var(--color_text_muted)] py-12">
                Нет данных за выбранный период
              </div>
            )}
          </>
        )}

        {/* Avatar tab */}
        {tab === 'avatar' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {avatarLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}

            {!avatarLoading && avatarData && (
              <div className="space-y-4">
                {/* Stats summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[var(--color_bg_card)] rounded-xl p-4 border border-[var(--color_border)] text-center">
                    <div className="text-2xl font-bold text-white">
                      {avatarData.totalWorkouts}
                    </div>
                    <div className="text-xs text-[var(--color_text_muted)] mt-1">
                      Тренировок за 14 дней
                    </div>
                  </div>
                  <div className="bg-[var(--color_bg_card)] rounded-xl p-4 border border-[var(--color_border)] text-center">
                    <div className="text-2xl font-bold text-white">
                      {avatarData.lastWorkoutDaysAgo === null
                        ? '—'
                        : avatarData.lastWorkoutDaysAgo === 0
                          ? 'Сегодня'
                          : `${avatarData.lastWorkoutDaysAgo} дн.`}
                    </div>
                    <div className="text-xs text-[var(--color_text_muted)] mt-1">
                      Последняя тренировка
                    </div>
                  </div>
                </div>

                {/* Avatar */}
                <Avatar
                  zoneIntensities={zoneIntensities}
                  selectedZone={null}
                  onZoneClick={() => {}}
                />
              </div>
            )}

            {!avatarLoading && !avatarData && (
              <div className="text-center text-[var(--color_text_muted)] py-12">
                Нет данных
              </div>
            )}
          </motion.div>
        )}
      </div>
    </Screen>
  );
}
