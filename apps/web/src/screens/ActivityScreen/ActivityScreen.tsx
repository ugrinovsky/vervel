import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import ActivityCalendar, { DayData } from '@/components/ActivityGraph/ActivityGraph';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import { CalendarIcon, ChartBarIcon, ChartPieIcon, FireIcon } from '@heroicons/react/24/outline';
import { useWorkoutStats } from '@/hooks/useWorkoutsStats';

// Форматирование объема в тоннах с одним знаком после запятой
const formatVolume = (volume: number): string => {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)} т`;
  }
  return `${volume} кг`;
};

// Компактное форматирование для карточек
const formatVolumeCompact = (volume: number): string => {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}т`;
  }
  return `${volume}кг`;
};

export default function ActivityScreen() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const { data: stats, loading } = useWorkoutStats('month');

  // Генерируем дни для текущего месяца
  const days: DayData[] = useMemo(() => {
    if (!stats?.timeline) return [];

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month, i + 1);
      const dateStr = format(date, 'yyyy-MM-dd');

      const workout = stats.timeline.find((w) => {
        const workoutDate = format(new Date(w.date), 'yyyy-MM-dd');
        return workoutDate === dateStr;
      });

      // Определяем нагрузку на основе объема
      let load: 'none' | 'low' | 'medium' | 'high' = 'none';
      if (workout) {
        if (workout.volume > 15000) load = 'high';
        else if (workout.volume > 10000) load = 'medium';
        else if (workout.volume > 0) load = 'low';
      }

      return {
        date,
        workoutsCount: workout ? 1 : 0,
        load,
        workoutType: workout?.type,
        intensity: workout?.intensity,
      };
    });
  }, [stats, currentMonth]);

  // Метрики выбранного дня - ВЕРНУЛ ВСЕ 4 МЕТРИКИ
  const dayStats = useMemo(() => {
    if (!selectedDate || !stats?.timeline) return null;

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dayWorkouts = stats.timeline.filter((w) => {
      const workoutDate = format(new Date(w.date), 'yyyy-MM-dd');
      return workoutDate === dateStr;
    });

    if (!dayWorkouts.length) {
      return {
        exercises: 0,
        duration: 0,
        volume: 0,
        calories: 0,
        type: null,
        intensity: 0,
      };
    }

    // Рассчитываем все метрики для дня
    const result = dayWorkouts.reduce(
      (acc, w) => {
        // Количество упражнений (если есть данные по упражнениям)
        const exercisesCount = w.exercises?.length || 1;

        // Длительность (если нет данных, ставим 60 мин по умолчанию)
        const duration = w.duration || 60;

        // Калории (примерный расчет: 5 ккал на 1 кг поднятого веса)
        const calories = Math.round((w.volume || 0) * 0.05);

        return {
          exercises: acc.exercises + exercisesCount,
          duration: acc.duration + duration,
          volume: acc.volume + (w.volume || 0),
          calories: acc.calories + calories,
          type: w.type || acc.type,
          intensity: w.intensity || acc.intensity,
        };
      },
      {
        exercises: 0,
        duration: 0,
        volume: 0,
        calories: 0,
        type: null,
        intensity: 0,
      }
    );

    return result;
  }, [selectedDate, stats]);

  // Метрики месяца
  const monthlyStats = useMemo(() => {
    if (!stats) return null;

    const totalVolume =
      stats.totalVolume || stats.timeline.reduce((acc, w) => acc + (w.volume || 0), 0);

    // Рассчитываем среднюю длительность (если нет данных, используем 60 мин)
    const totalDuration = stats.timeline.reduce((acc, w) => acc + (w.duration || 60), 0);
    const avgDuration = Math.round(totalDuration / stats.timeline.length);

    // Рассчитываем средние калории
    const totalCalories = stats.timeline.reduce(
      (acc, w) => acc + Math.round((w.volume || 0) * 0.05),
      0
    );

    return {
      workouts: stats.timeline.length,
      activeDays: new Set(stats.timeline.map((w) => format(new Date(w.date), 'yyyy-MM-dd'))).size,
      totalVolume: totalVolume,
      avgVolume: Math.round(totalVolume / stats.timeline.length),
      avgDuration: avgDuration,
      totalCalories: totalCalories,
      streak: stats.streak || 0,
    };
  }, [stats]);

  const handleSelectDay = (day: DayData) => {
    setSelectedDate(day.date);
  };

  const handleMonthChange = (newMonth: Date) => {
    setCurrentMonth(newMonth);
  };

  if (loading) {
    return (
      <Screen>
        <div className="text-center text-white mt-12">Загрузка...</div>
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

  return (
    <Screen>
      <div className="relative px-4 pt-6 pb-8">
        <ScreenHeader
          icon="📅"
          title="Активность"
          description="Отслеживайте ваши тренировки и прогресс"
        />

        {/* Статистика месяца */}
        <div className="glass p-5 rounded-xl mb-6">
          <h2 className="text-lg font-bold text-white mb-4">Статистика месяца</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              value={monthlyStats?.workouts ?? 0}
              label="Тренировок"
              color="blue"
              icon={<CalendarIcon className="w-6 h-6" />}
              detail={`Активных дней: ${monthlyStats?.activeDays}`}
            />
            <StatCard
              value={monthlyStats?.activeDays ?? 0}
              label="Активных дней"
              color="green"
              icon={<ChartBarIcon className="w-6 h-6" />}
              detail={`${Math.round((monthlyStats?.activeDays / 30) * 100)}% месяца`}
            />
            <StatCard
              value={formatVolumeCompact(monthlyStats?.totalVolume ?? 0)}
              label="Общий объем"
              color="yellow"
              icon={<ChartPieIcon className="w-6 h-6" />}
              title={`${monthlyStats?.totalVolume?.toLocaleString()} кг`}
              detail={`Средний объем: ${formatVolume(monthlyStats?.avgVolume ?? 0)}`}
            />
            <StatCard
              value={monthlyStats?.streak ?? 0}
              label="Текущая серия"
              color="red"
              icon={<FireIcon className="w-6 h-6" />}
              unit="дн"
              detail={`Лучшая серия: ${monthlyStats?.streak ?? 0} дн`}
            />
          </div>

          {/* Дополнительные метрики месяца (опционально) */}
          <div className="mt-4 pt-4 border-t border-[var(--color_border)] grid grid-cols-2 gap-4 text-sm text-[var(--color_text_muted)]">
            <div>🔥 Всего сожжено: ~{monthlyStats?.totalCalories.toLocaleString()} ккал</div>
            <div>⏱️ Средняя тренировка: {monthlyStats?.avgDuration} мин</div>
          </div>
        </div>

        {/* Календарь */}
        <div className="mb-8">
          <ActivityCalendar
            selectedDate={selectedDate}
            onSelect={handleSelectDay}
            onMonthChange={handleMonthChange}
            month={currentMonth}
            days={days}
          />
        </div>

        {/* Детали выбранного дня - ВЕРНУЛ 4 МЕТРИКИ */}
        {selectedDate && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass p-5 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
                  </h2>
                  {dayStats && dayStats.type && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm px-2 py-1 bg-[var(--color_bg_card_hover)] rounded-full text-[var(--color_text_secondary)]">
                        {dayStats.type === 'crossfit'
                          ? '🔥 Кроссфит'
                          : dayStats.type === 'mixed'
                            ? '💪 Смешанная'
                            : '🏋️ Бодибилдинг'}
                      </span>
                      {dayStats.intensity > 0 && (
                        <span className="text-sm text-[var(--color_text_muted)]">
                          Интенсивность: {Math.round(dayStats.intensity * 100)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {dayStats && dayStats.volume > 0 ? (
                <>
                  {/* 4 метрики как и было */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatItem
                      value={dayStats.exercises.toString()}
                      label="Упражнений"
                      icon="🏋️‍♂️"
                      detail={`Выполнено упражнений: ${dayStats.exercises}`}
                    />
                    <StatItem
                      value={`${dayStats.duration} мин`}
                      label="Длительность"
                      icon="⏱️"
                      detail={`${Math.floor(dayStats.duration / 60)}ч ${dayStats.duration % 60}мин`}
                    />
                    <StatItem
                      value={formatVolume(dayStats.volume)}
                      label="Объем"
                      icon="📊"
                      title={`${dayStats.volume.toLocaleString()} кг`}
                      detail={`${(dayStats.volume / 1000).toFixed(2)} тонн`}
                    />
                    <StatItem
                      value={dayStats.calories.toLocaleString()}
                      label="Калорий"
                      icon="🔥"
                      detail={`≈ ${Math.round(dayStats.calories / 100)}% от дневной нормы`}
                    />
                  </div>

                  {/* Дополнительная информация о тренировке */}
                  <div className="mt-4 p-3 bg-[var(--color_bg_card)]/30 rounded-lg text-sm text-[var(--color_text_muted)]">
                    {dayStats.volume > 10000
                      ? '⚡ Сегодня была тяжелая тренировка!'
                      : dayStats.volume > 5000
                        ? '💪 Хорошая нагрузка'
                        : '🏋️ Поддерживающая тренировка'}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-[var(--color_text_muted)]">
                  😴 В этот день тренировок не было
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Screen>
  );
}

// Обновленный StatCard
function StatCard({
  value,
  label,
  color,
  icon,
  title,
  unit = '',
  detail,
}: {
  value: string | number;
  label: string;
  color: string;
  icon: React.ReactNode;
  title?: string;
  unit?: string;
  detail?: string;
}) {
  const colorClasses = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
  };
  const iconColorClasses = {
    blue: 'text-blue-400/80',
    green: 'text-green-400/80',
    yellow: 'text-yellow-400/80',
    red: 'text-red-400/80',
  };

  const displayValue = unit ? `${value} ${unit}` : value;

  return (
    <div
      className="text-center p-4 bg-[var(--color_bg_card)]/30 rounded-lg group hover:bg-[var(--color_bg_card_hover)] transition cursor-help"
      title={detail || title}
    >
      <div
        className={`mb-1 flex justify-center ${iconColorClasses[color as keyof typeof iconColorClasses]}`}
      >
        {icon}
      </div>
      <div
        className={`text-2xl font-bold ${colorClasses[color as keyof typeof colorClasses]} group-hover:scale-105 transition-transform`}
      >
        {displayValue}
      </div>
      <div className="text-xs text-[var(--color_text_muted)] mt-1 group-hover:text-[var(--color_text_secondary)] transition">{label}</div>
    </div>
  );
}

// Обновленный StatItem
function StatItem({
  value,
  label,
  icon,
  title,
  detail,
}: {
  value: string;
  label: string;
  icon: string;
  title?: string;
  detail?: string;
}) {
  return (
    <div
      className="text-center p-4 bg-[var(--color_bg_card)]/30 rounded-lg hover:bg-[var(--color_bg_card_hover)] transition cursor-help"
      title={detail || title}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-[var(--color_text_muted)] mt-1">{label}</div>
    </div>
  );
}
