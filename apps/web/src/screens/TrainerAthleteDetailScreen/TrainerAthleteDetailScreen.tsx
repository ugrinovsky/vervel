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
import { ZONE_NORMALIZE } from '@/components/AvatarView/AvatarView';
import { ChatBubbleLeftIcon, PlusIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
  const [nickname, setNickname] = useState<string | null>(null);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [savingNickname, setSavingNickname] = useState(false);
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
          setNickname(found.nickname ?? null);
          setNicknameInput(found.nickname ?? '');
        }
        if (periodizationRes.data.success) setPeriodization(periodizationRes.data.data);
      } catch {
        toast.error('Ошибка загрузки данных');
      }
    };
    load();
  }, [id]);

  const handleSaveNickname = async () => {
    setSavingNickname(true);
    try {
      const value = nicknameInput.trim() || null;
      await trainerApi.updateAthleteNickname(id, value);
      setNickname(value);
      setEditingNickname(false);
    } catch {
      toast.error('Ошибка сохранения никнейма');
    } finally {
      setSavingNickname(false);
    }
  };

  const zoneIntensities = useMemo(() => {
    if (!avatarData?.zones) return {};
    const result: Record<string, number> = {};
    for (const [name, state] of Object.entries(avatarData.zones)) {
      const canonical = ZONE_NORMALIZE[name] ?? name;
      if (result[canonical] === undefined || state.intensity > result[canonical]) {
        result[canonical] = state.intensity;
      }
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

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center mb-5 pt-2 pb-5 px-4 rounded-2xl bg-(--color_bg_card) border border-(--color_border)"
        >
          {/* Никнейм */}
          <div className="flex items-center justify-center gap-1.5 mt-3 min-h-7 w-full">
            {editingNickname ? (
              <>
                <input
                  autoFocus
                  value={nicknameInput}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNickname(); if (e.key === 'Escape') { setEditingNickname(false); setNicknameInput(nickname ?? ''); } }}
                  maxLength={100}
                  placeholder="Никнейм…"
                  className="w-48 text-center bg-transparent border-b border-(--color_primary_light)/60 text-lg font-bold text-white focus:outline-none leading-tight"
                />
                <button onClick={handleSaveNickname} disabled={savingNickname} className="p-0.5 text-emerald-400 hover:text-emerald-300 transition-colors shrink-0">
                  <CheckIcon className="w-4 h-4" />
                </button>
                <button onClick={() => { setEditingNickname(false); setNicknameInput(nickname ?? ''); }} className="p-0.5 text-(--color_text_muted) hover:text-white transition-colors shrink-0">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => { setNicknameInput(nickname ?? ''); setEditingNickname(true); }}
                className="flex items-center gap-1.5 group"
              >
                <span className={`text-lg font-bold leading-tight ${nickname ? 'text-white' : 'text-(--color_text_muted) font-normal italic'}`}>
                  {nickname || 'Никнейм…'}
                </span>
                <PencilIcon className="w-3.5 h-3.5 text-(--color_text_muted) opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            )}
          </div>

          {/* Имя */}
          <h1 className="text-base font-semibold text-white/70 leading-tight mt-0.5 truncate max-w-full">{athleteName}</h1>

          {/* Email */}
          {athleteEmail && (
            <p className="text-xs text-(--color_text_muted) mt-0.5 truncate max-w-full">{athleteEmail}</p>
          )}
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
                  <DayDetails date={selectedDate} workouts={dayWorkouts} onDeleted={() => {}} />
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
