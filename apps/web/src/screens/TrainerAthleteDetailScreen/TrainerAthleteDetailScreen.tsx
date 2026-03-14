import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import FullScreenChat from '@/components/FullScreenChat/FullScreenChat';
import WorkoutInlineForm from '@/components/WorkoutInlineForm/WorkoutInlineForm';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import AnalyticsCards from '@/components/analytics/AnalyticsCards';
import AvatarView from '@/components/AvatarView/AvatarView';
import MiniAvatar from '@/components/MiniAvatar/MiniAvatar';
import ActivityCalendar, { type DayData } from '@/components/ActivityGraph/ActivityGraph';
import MonthlyStats from '@/screens/ActivityScreen/MonthlyStats';
import DayDetails from '@/screens/ActivityScreen/DayDetails';
import { useAthleteStats, type StatsPeriod } from '@/hooks/useAthleteStats';
import { useAthleteAvatar } from '@/hooks/useAthleteAvatar';
import { trainerApi, type PeriodizationData } from '@/api/trainer';
import { ChatBubbleLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import BackButton from '@/components/BackButton/BackButton';
import type { MonthlyStatsData } from '@/screens/ActivityScreen/useActivityData';

type Tab = 'analytics' | 'activity' | 'avatar';

const VOLUME_HIGH = 15000;
const VOLUME_MEDIUM = 10000;

function getLoadLevel(volume?: number, intensity?: number): DayData['load'] {
  if (volume && volume > 0) {
    if (volume > VOLUME_HIGH) return 'high';
    if (volume > VOLUME_MEDIUM) return 'medium';
    return 'low';
  }
  if (intensity && intensity > 0) return 'low';
  return 'none';
}

export default function TrainerAthleteDetailScreen() {
  const { athleteId } = useParams<{ athleteId: string }>();
  const navigate = useNavigate();
  const id = Number(athleteId);

  const [tab, setTab] = useState<Tab>('analytics');
  const [timeRange, setTimeRange] = useState<StatsPeriod>('week');
  const [showChat, setShowChat] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [chatId, setChatId] = useState<number | null>(null);
  const [athleteName, setAthleteName] = useState('Атлет');
  const [athleteEmail, setAthleteEmail] = useState('');
  const [periodization, setPeriodization] = useState<PeriodizationData | null>(null);

  // Activity calendar state
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const { data: stats } = useAthleteStats(id, timeRange);
  const { data: monthStats } = useAthleteStats(id, 'month');
  const { data: avatarData, loading: avatarLoading } = useAthleteAvatar(id);

  // Load athlete meta + chatId + periodization
  useEffect(() => {
    const load = async () => {
      try {
        const [chatRes, athletesRes, periodizationRes] = await Promise.all([
          trainerApi.getOrCreateAthleteChat(id),
          trainerApi.listAthletes(),
          trainerApi.getAthletePeriodization(id),
        ]);
        setChatId(chatRes.data.data.chatId);
        const found = athletesRes.data.data.find((a) => a.id === id);
        if (found) {
          setAthleteName(found.fullName || found.email);
          setAthleteEmail(found.fullName ? found.email : '');
        }
        if (periodizationRes.data.success) setPeriodization(periodizationRes.data.data);
      } catch {
        toast.error('Ошибка загрузки данных');
      }
    };
    load();
  }, [id]);

  const zoneIntensities = useMemo(() => {
    if (!avatarData?.zones) return {};
    const result: Record<string, number> = {};
    for (const [name, state] of Object.entries(avatarData.zones)) {
      result[name] = state.intensity;
    }
    return result;
  }, [avatarData]);

  // Calendar days derived from monthStats
  const days: DayData[] = useMemo(() => {
    if (!monthStats?.timeline) return [];
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month, i + 1);
      const dateStr = format(date, 'yyyy-MM-dd');
      const w = monthStats.timeline.find((e) => format(new Date(e.date), 'yyyy-MM-dd') === dateStr);
      return {
        date,
        load: getLoadLevel(w?.volume, w?.intensity),
        workoutType: w?.type as any,
        intensity: w?.intensity,
        fromTrainer: w?.scheduledWorkoutId != null,
      };
    });
  }, [monthStats, currentMonth]);

  const dayWorkouts = useMemo(() => {
    if (!selectedDate || !monthStats?.timeline) return [];
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return monthStats.timeline.filter((e) => format(new Date(e.date), 'yyyy-MM-dd') === dateStr);
  }, [selectedDate, monthStats]);

  const monthlyStatsData = useMemo<MonthlyStatsData | null>(() => {
    if (!monthStats?.timeline?.length) return null;
    const tl = monthStats.timeline;
    const totalVolume = monthStats.totalVolume || tl.reduce((s, w) => s + (w.volume || 0), 0);
    const count = tl.length;
    return {
      workouts: count,
      activeDays: new Set(tl.map((w) => format(new Date(w.date), 'yyyy-MM-dd'))).size,
      totalVolume,
      avgVolume: Math.round(totalVolume / count),
      avgDuration: 60,
      totalCalories: tl.reduce((s, w) => s + Math.round((w.volume || 0) * 0.05), 0),
      streak: (monthStats as any).streak || 0,
    };
  }, [monthStats]);

  return (
    <Screen className="trainer-athlete-detail-screen">
      {/* ── Chat overlay ─────────────────────────────────────────────────── */}
      <FullScreenChat
        open={showChat}
        chatId={chatId}
        title={athleteName}
        onClose={() => setShowChat(false)}
      />

      {/* ── Create workout overlay ────────────────────────────────────────── */}
      <BottomSheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        emoji="🏋️"
        title="Создать тренировку"
      >
        <WorkoutInlineForm
          noCard
          preselectedAssignee={{ type: 'athlete', id, name: athleteName }}
          onSuccess={() => setShowCreate(false)}
          onCancel={() => setShowCreate(false)}
        />
      </BottomSheet>

      <div className="p-4 w-full mx-auto">
        <BackButton onClick={() => navigate('/trainer/athletes')} />

        {/* ── Hero: FIO + MiniAvatar ────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-5"
        >
          <MiniAvatar zoneIntensities={zoneIntensities} size="lg" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white leading-tight truncate">{athleteName}</h1>
            {athleteEmail && (
              <p className="text-sm text-(--color_text_muted) mt-0.5 truncate">{athleteEmail}</p>
            )}
          </div>
        </motion.div>

        {/* ── Action buttons ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 gap-3 mb-5"
        >
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-(--color_primary_light) text-white font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <PlusIcon className="w-4 h-4" />
            Тренировка
          </button>
          <button
            onClick={() => setShowChat(true)}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-(--color_bg_card) border border-(--color_border) text-white font-medium text-sm hover:border-(--color_primary_light)/50 transition-colors"
          >
            <ChatBubbleLeftIcon className="w-4 h-4" />
            Написать
          </button>
        </motion.div>

        {/* ── Tab bar ───────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-1 mb-6 bg-(--color_bg_card) rounded-xl p-1"
        >
          {(
            [
              ['analytics', 'Аналитика'],
              ['activity', 'Активность'],
              ['avatar', 'Зоны мышц'],
            ] as [Tab, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                tab === t
                  ? 'bg-(--color_primary_light) text-white shadow'
                  : 'text-(--color_text_secondary) hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </motion.div>

        {/* ── Analytics tab ─────────────────────────────────────────────── */}
        {tab === 'analytics' && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-3 gap-2 mb-5"
            >
              {(['week', 'month', 'year'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setTimeRange(period)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                    timeRange === period
                      ? 'bg-(--color_primary_light) text-white shadow-lg'
                      : 'bg-(--color_bg_card) text-(--color_text_secondary) hover:text-white'
                  }`}
                >
                  {period === 'week' ? 'Неделя' : period === 'month' ? 'Месяц' : 'Год'}
                </button>
              ))}
            </motion.div>

            {stats ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <AnalyticsCards
                  stats={stats}
                  monthStats={monthStats}
                  periodization={periodization}
                  timeRange={timeRange}
                />
              </motion.div>
            ) : (
              <div className="text-center text-(--color_text_muted) py-12 text-sm">
                Нет данных за выбранный период
              </div>
            )}
          </>
        )}

        {/* ── Activity tab ──────────────────────────────────────────────── */}
        {tab === 'activity' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            {monthlyStatsData && <MonthlyStats stats={monthlyStatsData} />}

            <div className="mb-6">
              <ActivityCalendar
                selectedDate={selectedDate}
                onSelect={(day) => setSelectedDate(day.date)}
                onMonthChange={setCurrentMonth}
                month={currentMonth}
                days={days}
              />
            </div>

            <AnimatePresence>
              {selectedDate && (
                <motion.div
                  key={selectedDate.toISOString()}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <DayDetails date={selectedDate} workouts={dayWorkouts} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Avatar tab ────────────────────────────────────────────────── */}
        {tab === 'avatar' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            {!avatarLoading && !avatarData ? (
              <div className="text-center text-(--color_text_muted) py-12 text-sm">Нет данных</div>
            ) : (
              <AvatarView
                zones={avatarData?.zones ?? {}}
                totalWorkouts={avatarData?.totalWorkouts ?? 0}
                lastWorkoutDaysAgo={avatarData?.lastWorkoutDaysAgo ?? null}
                loading={avatarLoading}
              />
            )}
          </motion.div>
        )}
      </div>
    </Screen>
  );
}
