import Calendar, { type DayData } from '@/components/ui/Calendar';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import MonthlyStats from './MonthlyStats';
import DayDetails from './DayDetails';
import { useActivityData } from './useActivityData';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router';
import ScreenLinks from '@/components/ScreenLinks/ScreenLinks';
import ScreenHint from '@/components/ScreenHint/ScreenHint';
import AccentButton from '@/components/ui/AccentButton';

export default function ActivityScreen() {
  const navigate = useNavigate();
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
  } = useActivityData();

  const handleSelectDay = (day: DayData) => setSelectedDate(day.date);
  const handleMonthChange = (newMonth: Date) => setCurrentMonth(newMonth);
  const handleGoToToday = (today: Date) => setSelectedDate(today);

  if (loading) {
    return <Screen loading className="activity-screen" />;
  }

  if (!stats) {
    return (
      <Screen className="activity-screen">
        <div className="p-4">
          <ScreenHeader
            icon="📅"
            title="Активность"
            description="Календарь тренировок — нажмите на день, чтобы посмотреть детали, добавить или изменить запись"
          />
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
                  desc: 'Вручную или через AI-распознавание по фото/описанию',
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
        </div>
      </Screen>
    );
  }

  return (
    <Screen className="activity-screen">
      <div className="relative p-4">
        <ScreenHeader
          icon="📅"
          title="Активность"
          description="Календарь тренировок — нажмите на день, чтобы посмотреть детали, добавить или изменить запись"
        />

        <div className="border-t border-(--color_border) my-3" />

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
          <ScreenHint>
            Нажмите на день — откроются детали тренировок.{' '}
            <span className="text-white font-medium">Насыщенность цвета</span> отражает интенсивность нагрузки.
            Нет цвета — день без тренировок.
          </ScreenHint>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
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

        <AnimatePresence>
          {selectedDate && (
            <motion.div
              key={selectedDate.toISOString()}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mb-4"
            >
              <DayDetails date={selectedDate} workouts={dayWorkouts} onDeleted={refetch} />
            </motion.div>
          )}
        </AnimatePresence>

        {monthlyStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-4"
          >
            <MonthlyStats stats={monthlyStats} />
          </motion.div>
        )}

        {/* Tip: links to related screens */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-4 mt-4"
        >
          <ScreenLinks
            links={[
              {
                emoji: '🏋️',
                bg: 'bg-emerald-500/20',
                label: 'Новая тренировка',
                sub: 'вручную или AI',
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
      </div>
    </Screen>
  );
}
