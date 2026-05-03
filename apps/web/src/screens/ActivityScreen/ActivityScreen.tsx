import Calendar, { type DayData } from '@/components/ui/Calendar';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import MonthlyStats from './MonthlyStats';
import DayDetails from './DayDetails';
import { useActivityData } from './useActivityData';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router';
import ScreenLinks from '@/components/ScreenLinks/ScreenLinks';
import ScreenHint from '@/components/ScreenHint/ScreenHint';
import SectionGroup from '@/components/ui/SectionGroup';
import AccentButton from '@/components/ui/AccentButton';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useAthleteWorkoutDraftLocal } from '@/hooks/useAthleteWorkoutDraftLocal';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function ActivityScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [savedWorkoutBanner, setSavedWorkoutBanner] = useState(false);
  const { draft, draftDateKey } = useAthleteWorkoutDraftLocal(user?.id);
  const {
    permission: pushPermission,
    loading: pushLoading,
    enable: enablePush,
    supported: pushSupported,
  } = usePushNotifications();

  const {
    selectedDate,
    setSelectedDate,
    currentMonth,
    setCurrentMonth,
    stats,
    loading,
    days,
    dayWorkouts,
    monthlyStats,
    refetch,
  } = useActivityData(draftDateKey);

  useEffect(() => {
    const st = location.state;
    if (st === null || typeof st !== 'object' || Array.isArray(st) || st.savedWorkout !== true) return;
    setSavedWorkoutBanner(true);
    const dateKey = 'date' in st && typeof st.date === 'string' ? st.date : undefined;
    navigate(location.pathname, { replace: true, state: dateKey ? { date: dateKey } : null });
  }, [location.state, location.pathname, navigate]);

  const handleSelectDay = (day: DayData) => setSelectedDate(day.date);
  const handleMonthChange = (newMonth: Date) => setCurrentMonth(newMonth);
  const handleGoToToday = (today: Date) => setSelectedDate(today);

  const handleEnablePushNudge = async () => {
    await enablePush();
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      toast.success('Уведомления включены');
    }
  };

  if (loading) {
    return <Screen loading className="activity-screen" />;
  }

  if (!stats) {
    return (
      <Screen className="activity-screen">
        <div className="p-4">
          <SectionGroup showLabel={false} showBreakAfter={false} bodyClassName="space-y-4">
            <ScreenHeader
              icon="📅"
              title="Активность"
              description="Календарь тренировок — нажмите на день, чтобы посмотреть детали, добавить или изменить запись"
            />
            {draft && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-amber-300">Незаконченная тренировка</p>
                  <p className="text-xs text-amber-400/70 mt-0.5 truncate">
                    {draft.exercises.length} упр. ·{' '}
                    {draft.workoutType === 'bodybuilding'
                      ? 'Силовая'
                      : draft.workoutType === 'crossfit'
                        ? 'CrossFit'
                        : 'Кардио'}
                  </p>
                </div>
                <AccentButton size="sm" onClick={() => navigate('/workouts/new')} className="shrink-0">
                  Продолжить
                </AccentButton>
              </motion.div>
            )}
            {savedWorkoutBanner && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-3 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3.5"
              >
                <div>
                  <p className="text-sm font-semibold text-emerald-200">Тренировка сохранена</p>
                  <p className="text-xs text-white/70 mt-0.5">Когда появятся данные, день будет подсвечен в календаре.</p>
                </div>
                <AccentButton
                  size="sm"
                  className="w-full sm:w-auto self-start"
                  onClick={() => {
                    setSavedWorkoutBanner(false);
                    navigate('/workouts/new');
                  }}
                >
                  Залогировать ещё
                </AccentButton>
                {pushSupported && pushPermission === 'default' && (
                  <div className="pt-2 border-t border-emerald-500/25">
                    <p className="text-xs text-white/65 mb-2">
                      Можно включить напоминания в браузере — так проще не пропустить следующую тренировку.
                    </p>
                    <AccentButton
                      size="sm"
                      className="w-full sm:w-auto self-start"
                      disabled={pushLoading}
                      onClick={() => void handleEnablePushNudge()}
                    >
                      {pushLoading ? 'Запрос…' : 'Включить уведомления'}
                    </AccentButton>
                  </div>
                )}
              </motion.div>
            )}
          </SectionGroup>

          <SectionGroup title="С чего начать" showBreakAfter={false}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border) space-y-4"
            >
            <div className="text-center">
              <div className="text-4xl mb-2">📅</div>
              <h3 className="font-semibold text-white mb-1">Ещё нет тренировок</h3>
              <p className="text-sm text-(--color_text_muted)">
                Залогируйте первую тренировку — и здесь появится ваш персональный календарь нагрузок
              </p>
            </div>
            <div className="space-y-3">
              {[
                {
                  emoji: '1️⃣',
                  title: 'Добавьте тренировку',
                  desc: 'Вручную или через ИИ-распознавание по фото/описанию',
                  action: () => navigate('/workouts/new'),
                  label: 'Добавить',
                },
                {
                  emoji: '2️⃣',
                  title: 'Выберите день на календаре',
                  desc: 'Нажмите на любой день — откроются детали и список упражнений',
                },
                {
                  emoji: '3️⃣',
                  title: 'Следите за нагрузкой',
                  desc: 'Зелёный цвет = нагрузка в этот день. Чем насыщеннее — тем выше интенсивность',
                },
              ].map(({ emoji, title, desc, action, label }) => (
                <div key={title} className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{title}</div>
                    <div className="text-xs text-(--color_text_muted) mt-0.5">{desc}</div>
                  </div>
                  {action && (
                    <AccentButton size="sm" onClick={action} className="shrink-0 text-xs">
                      {label}
                    </AccentButton>
                  )}
                </div>
              ))}
            </div>
            </motion.div>
          </SectionGroup>
        </div>
      </Screen>
    );
  }

  return (
    <Screen className="activity-screen">
      <div className="relative p-4">
        <SectionGroup showLabel={false} showBreakAfter={false} bodyClassName="space-y-4">
          <ScreenHeader
            icon="📅"
            title="Активность"
            description="Календарь тренировок — нажмите на день, чтобы посмотреть детали, добавить или изменить запись"
          />

          {savedWorkoutBanner && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3 rounded-2xl border border-emerald-500/35 bg-emerald-500/10 px-4 py-3.5"
            >
              <div>
                <p className="text-sm font-semibold text-emerald-200">Тренировка сохранена</p>
                <p className="text-xs text-white/70 mt-0.5">
                  Выбран день в календаре ниже — там детали записи.
                </p>
              </div>
              <AccentButton
                size="sm"
                className="w-full sm:w-auto self-start"
                onClick={() => {
                  setSavedWorkoutBanner(false);
                  navigate('/workouts/new');
                }}
              >
                Залогировать ещё
              </AccentButton>
              {pushSupported && pushPermission === 'default' && (
                <div className="pt-2 border-t border-emerald-500/25">
                  <p className="text-xs text-white/65 mb-2">
                    Можно включить напоминания в браузере — так проще не пропустить следующую тренировку.
                  </p>
                  <AccentButton
                    size="sm"
                    className="w-full sm:w-auto self-start"
                    disabled={pushLoading}
                    onClick={() => void handleEnablePushNudge()}
                  >
                    {pushLoading ? 'Запрос…' : 'Включить уведомления'}
                  </AccentButton>
                </div>
              )}
            </motion.div>
          )}

          <ScreenHint>
            Нажмите на день — откроются детали тренировок.{' '}
            <span className="text-white font-medium">Насыщенность цвета</span> отражает интенсивность нагрузки.
            Нет цвета — день без тренировок. В ячейке перечёркнутые весы или звезда — в этот день не хватает весов в
            подходах или оценки нагрузки (см. легенду под календарём).
          </ScreenHint>

          {draft && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-amber-300">Незаконченная тренировка</p>
                <p className="text-xs text-amber-400/70 mt-0.5 truncate">
                  {draft.exercises.length} упр. · {draft.workoutType === 'bodybuilding' ? 'Силовая' : draft.workoutType === 'crossfit' ? 'CrossFit' : 'Кардио'}
                </p>
              </div>
              <AccentButton size="sm" onClick={() => navigate('/workouts/new')} className="shrink-0">
                Продолжить
              </AccentButton>
            </motion.div>
          )}
        </SectionGroup>

        <SectionGroup title="Календарь">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Calendar
              mode="load"
              selectedDate={selectedDate}
              onSelect={handleSelectDay}
              onMonthChange={handleMonthChange}
              onTodayClick={handleGoToToday}
              month={currentMonth}
              days={days}
            />
          </motion.div>
        </SectionGroup>

        <AnimatePresence mode="wait">
          {selectedDate && (
            <motion.div
              key={selectedDate.toISOString()}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <SectionGroup title="День">
                <DayDetails date={selectedDate} workouts={dayWorkouts} onDeleted={refetch} onRefresh={refetch} draft={draft} />
              </SectionGroup>
            </motion.div>
          )}
        </AnimatePresence>

        {monthlyStats && (
          <SectionGroup title="Итоги месяца">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <MonthlyStats stats={monthlyStats} />
            </motion.div>
          </SectionGroup>
        )}

        <SectionGroup title="Ещё" showBreakAfter={false}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ScreenLinks
              links={[
                {
                  emoji: '🏋️',
                  bg: 'bg-emerald-500/20',
                  label: 'Новая тренировка',
                  sub: 'вручную или ИИ',
                  to: '/workouts/new',
                },
                {
                  emoji: '📊',
                  bg: 'bg-blue-500/20',
                  label: 'Аналитика',
                  sub: 'графики и прогресс',
                  to: '/analytics',
                },
                {
                  emoji: '🔥',
                  bg: 'bg-orange-500/20',
                  label: 'Серия дней',
                  sub: 'ударный режим',
                  to: '/streak',
                },
              ]}
            />
          </motion.div>
        </SectionGroup>
      </div>
    </Screen>
  );
}
