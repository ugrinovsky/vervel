import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import ChatBox from '@/components/ChatBox/ChatBox';
import WorkoutInlineForm from '@/components/WorkoutInlineForm/WorkoutInlineForm';
import WorkoutRadar from '@/components/analytics/WorkoutRadar';
import StatsOverview from '@/components/analytics/StatsOverview';
import TopMuscles from '@/components/analytics/TopMuscles';
import MuscleBalance from '@/components/analytics/MuscleBalance';
import CollapsibleBlock from '@/components/ui/CollapsibleBlock';
import Avatar from '@/components/Avatar/Avatar';
import { useAthleteStats, type StatsPeriod } from '@/hooks/useAthleteStats';
import { useAthleteAvatar } from '@/hooks/useAthleteAvatar';
import { trainerApi } from '@/api/trainer';
import { ArrowLeftIcon, ChatBubbleLeftIcon, ChartBarIcon, UserIcon, PlusIcon } from '@heroicons/react/24/outline';

type Tab = 'chat' | 'analytics' | 'avatar' | 'create';

export default function TrainerAthleteDetailScreen() {
  const { athleteId } = useParams<{ athleteId: string }>();
  const navigate = useNavigate();
  const id = Number(athleteId);

  const [tab, setTab] = useState<Tab>('chat');
  const [timeRange, setTimeRange] = useState<StatsPeriod>('week');
  const [chatId, setChatId] = useState<number | null>(null);
  const [athleteName, setAthleteName] = useState('Атлет');

  const { data: stats } = useAthleteStats(id, timeRange);
  const { data: avatarData, loading: avatarLoading } = useAthleteAvatar(id);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [chatRes, athletesRes] = await Promise.all([
          trainerApi.getOrCreateAthleteChat(id),
          trainerApi.listAthletes(),
        ]);
        setChatId(chatRes.data.data.chatId);
        const found = athletesRes.data.data.find((a) => a.id === id);
        if (found) setAthleteName(found.fullName || found.email);
      } catch {
        toast.error('Ошибка загрузки данных');
      }
    };
    loadData();
  }, [id]);

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
          onClick={() => navigate('/trainer/athletes')}
          className="flex items-center gap-2 text-[var(--color_text_muted)] hover:text-white transition-colors mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span className="text-sm">Назад</span>
        </button>

        <ScreenHeader icon="🏃" title={athleteName} description="Чат, аналитика и восстановление" />

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-4 gap-2 mb-6"
        >
          <button
            onClick={() => setTab('chat')}
            className={`flex items-center justify-center gap-1 py-3 rounded-xl text-sm font-medium transition-all ${
              tab === 'chat'
                ? 'bg-[var(--color_primary_light)] text-white shadow-lg'
                : 'bg-[var(--color_bg_card)] text-[var(--color_text_secondary)] hover:text-white'
            }`}
          >
            <ChatBubbleLeftIcon className="w-4 h-4" />
            Чат
          </button>
          <button
            onClick={() => setTab('analytics')}
            className={`flex items-center justify-center gap-1 py-3 rounded-xl text-sm font-medium transition-all ${
              tab === 'analytics'
                ? 'bg-[var(--color_primary_light)] text-white shadow-lg'
                : 'bg-[var(--color_bg_card)] text-[var(--color_text_secondary)] hover:text-white'
            }`}
          >
            <ChartBarIcon className="w-4 h-4" />
            Аналитика
          </button>
          <button
            onClick={() => setTab('avatar')}
            className={`flex items-center justify-center gap-1 py-3 rounded-xl text-sm font-medium transition-all ${
              tab === 'avatar'
                ? 'bg-[var(--color_primary_light)] text-white shadow-lg'
                : 'bg-[var(--color_bg_card)] text-[var(--color_text_secondary)] hover:text-white'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            Нагрузка
          </button>
          <button
            onClick={() => setTab('create')}
            className={`flex items-center justify-center gap-1 py-3 rounded-xl text-sm font-medium transition-all ${
              tab === 'create'
                ? 'bg-[var(--color_primary_light)] text-white shadow-lg'
                : 'bg-[var(--color_bg_card)] text-[var(--color_text_secondary)] hover:text-white'
            }`}
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Chat tab */}
        {tab === 'chat' && chatId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[var(--color_bg_card)] rounded-2xl border border-[var(--color_border)] overflow-hidden"
          >
            <ChatBox chatId={chatId} />
          </motion.div>
        )}

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

        {/* Create workout tab */}
        {tab === 'create' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <WorkoutInlineForm
              preselectedAssignee={{
                type: 'athlete',
                id: id,
                name: athleteName,
              }}
              onSuccess={() => {
                toast.success('Тренировка создана');
                setTab('chat');
              }}
              onCancel={() => setTab('chat')}
            />
          </motion.div>
        )}
      </div>
    </Screen>
  );
}
