import ActivityCalendar, { DayData } from '@/components/ActivityGraph/ActivityGraph';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import MonthlyStats from './MonthlyStats';
import DayDetails from './DayDetails';
import ActivitySkeleton from './ActivitySkeleton';
import { useActivityData } from './useActivityData';
import { motion } from 'framer-motion';

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

  if (loading) {
    return (
      <Screen>
        <ActivitySkeleton />
      </Screen>
    );
  }

  if (!stats) {
    return (
      <Screen>
        <div className="text-center text-white mt-12">Нет данных</div>
      </Screen>
    );
  }

  const handleSelectDay = (day: DayData) => setSelectedDate(day.date);
  const handleMonthChange = (newMonth: Date) => setCurrentMonth(newMonth);

  return (
    <Screen>
      <div className="relative p-4">
        <ScreenHeader
          icon="📅"
          title="Активность"
          description="Отслеживайте ваши тренировки и прогресс"
        />

        {monthlyStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <MonthlyStats stats={monthlyStats} />
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <ActivityCalendar
            selectedDate={selectedDate}
            onSelect={handleSelectDay}
            onMonthChange={handleMonthChange}
            month={currentMonth}
            days={days}
          />
        </motion.div>

        {selectedDate && dayStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <DayDetails date={selectedDate} stats={dayStats} />
          </motion.div>
        )}
      </div>
    </Screen>
  );
}
