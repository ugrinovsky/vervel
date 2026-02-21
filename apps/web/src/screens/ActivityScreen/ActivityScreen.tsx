import ActivityCalendar, { DayData } from '@/components/ActivityGraph/ActivityGraph';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import MonthlyStats from './MonthlyStats';
import DayDetails from './DayDetails';
import ActivitySkeleton from './ActivitySkeleton';
import { useActivityData } from './useActivityData';
import { motion, AnimatePresence } from 'framer-motion';

export default function ActivityScreen() {
  const {
    selectedDate,
    setSelectedDate,
    currentMonth,
    setCurrentMonth,
    stats,
    loading,
    days,
    dayStats,
    monthlyStats,
  } = useActivityData();

  const handleSelectDay = (day: DayData) => setSelectedDate(day.date);
  const handleMonthChange = (newMonth: Date) => setCurrentMonth(newMonth);

  return (
    <Screen>
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <ActivitySkeleton />
          </motion.div>
        ) : !stats ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="text-center text-white mt-12"
          >
            Нет данных
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="relative p-4"
          >
            <ScreenHeader
              icon="📅"
              title="Активность"
              description="Отслеживайте ваши тренировки и прогресс"
            />

            {monthlyStats && <MonthlyStats stats={monthlyStats} />}

            <div className="mb-8">
              <ActivityCalendar
                selectedDate={selectedDate}
                onSelect={handleSelectDay}
                onMonthChange={handleMonthChange}
                month={currentMonth}
                days={days}
              />
            </div>

            <AnimatePresence>
              {selectedDate && dayStats && (
                <motion.div
                  key={selectedDate.toISOString()}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <DayDetails date={selectedDate} stats={dayStats} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </Screen>
  );
}
