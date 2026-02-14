import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, isSameDay, isToday, getDay } from 'date-fns';
import { ru } from 'date-fns/locale';

export type LoadType = 'none' | 'low' | 'medium' | 'high';

export interface DayData {
  date: Date;
  load: LoadType;
  workoutType?: 'strength' | 'cardio' | 'crossfit' | 'rest';
  intensity?: number; // 0-1 для градиента
}

interface ActivityCalendarProps {
  selectedDate: Date | null;
  onSelect: (day: DayData) => void;
  onMonthChange?: (month: Date) => void;
  month?: Date;
  days: DayData[];
}

const getColor = (load: LoadType, intensity?: number) => {
  switch (load) {
    case 'high':
      return intensity ? `bg-gradient-to-br from-red-500 to-red-700` : 'bg-red-600';
    case 'medium':
      return intensity ? `bg-gradient-to-br from-yellow-500 to-yellow-700` : 'bg-yellow-500';
    case 'low':
      return intensity ? `bg-gradient-to-br from-green-400 to-green-600` : 'bg-green-400';
    case 'none':
    default:
      return 'bg-gray-800';
  }
};

const getLoadLabel = (load: LoadType): string => {
  switch (load) {
    case 'high':
      return 'Высокая';
    case 'medium':
      return 'Средняя';
    case 'low':
      return 'Низкая';
    default:
      return 'Нет';
  }
};

export default function ActivityCalendar({
  selectedDate,
  onSelect,
  onMonthChange,
  month = new Date(),
  days,
}: ActivityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(month);

  // Синхронизация с пропом month
  useEffect(() => {
    setCurrentMonth(month);
  }, [month]);

  // Навигация по месяцам
  const goToPreviousMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(currentMonth.getMonth() - 1);
    setCurrentMonth(newDate);
    onMonthChange?.(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(currentMonth.getMonth() + 1);
    setCurrentMonth(newDate);
    onMonthChange?.(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onMonthChange?.(today);
  };

  // Дни недели (начинаем с понедельника)
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  // Получаем первый день месяца
  const firstDayOfMonth = startOfMonth(currentMonth);

  // Корректируем индекс для понедельника (в date-fns неделя начинается с воскресенья (0))
  let startDayIndex = getDay(firstDayOfMonth);
  // Преобразуем воскресенье (0) в 6, чтобы понедельник был 0
  startDayIndex = startDayIndex === 0 ? 6 : startDayIndex - 1;

  console.log('First day index:', startDayIndex); // Для отладки

  return (
    <div className="glass p-6 rounded-xl">
      {/* Шапка календаря */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 hover:bg-gray-800 rounded-full transition"
            aria-label="Предыдущий месяц"
          >
            ←
          </button>

          <h2 className="text-xl font-bold text-white">
            {format(currentMonth, 'LLLL yyyy', { locale: ru })}
          </h2>

          <button
            onClick={goToNextMonth}
            className="p-2 hover:bg-gray-800 rounded-full transition"
            aria-label="Следующий месяц"
          >
            →
          </button>
        </div>

        <button
          onClick={goToToday}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition"
        >
          Сегодня
        </button>
      </div>

      {/* Дни недели */}
      <div className="grid grid-cols-7 gap-2 mb-3">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-sm text-gray-400 font-medium">
            {day}
          </div>
        ))}
      </div>

      {/* Календарная сетка */}
      <div className="grid grid-cols-7 gap-2">
        {/* Пустые ячейки для начала месяца */}
        {Array.from({ length: startDayIndex }).map((_, i) => (
          <div key={`empty-start-${i}`} className="h-12" />
        ))}

        {/* Дни месяца */}
        {days.map((day, i) => {
          const isActive = selectedDate && isSameDay(day.date, selectedDate);
          const isCurrentDay = isToday(day.date);

          return (
            <button
              key={i}
              onClick={() => onSelect(day)}
              className={`
                relative h-12 rounded-lg transition-all duration-200
                ${getColor(day.load, day.intensity)}
                ${
                  isActive
                    ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-gray-900 transform scale-105'
                    : 'hover:opacity-90 hover:scale-105'
                }
                ${isCurrentDay && !isActive ? 'ring-1 ring-white' : ''}
                ${day.load === 'none' ? 'hover:bg-gray-700' : ''}
                flex flex-col items-center justify-center
              `}
              title={`${format(day.date, 'd MMMM yyyy')} - ${getLoadLabel(day.load)} нагрузка`}
            >
              {/* Число */}
              <span
                className={`
                text-sm font-bold
                ${day.load === 'none' ? 'text-gray-400' : 'text-white'}
                ${isCurrentDay ? 'text-yellow-300' : ''}
              `}
              >
                {format(day.date, 'd')}
              </span>
              {/* Индикатор сегодняшнего дня */}
              {isCurrentDay && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Легенда */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-400">Легенда нагрузки:</div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded"></div>
              <span className="text-xs text-gray-300">Низкая</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-xs text-gray-300">Средняя</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-600 rounded"></div>
              <span className="text-xs text-gray-300">Высокая</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
