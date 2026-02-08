import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';
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
  month?: Date; // Опционально: какой месяц показывать
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
  month = new Date(),
}: ActivityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(month);
  const [days, setDays] = useState<DayData[]>([]);

  // Генерация дней месяца
  useEffect(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const monthDays = eachDayOfInterval({ start, end });

    // TODO: Заменить на реальные данные из API
    const generatedDays: DayData[] = monthDays.map((date) => {
      const hasWorkout = Math.random() > 0.4;

      if (!hasWorkout) {
        return { date, load: 'none' };
      }

      const loadTypes: LoadType[] = ['low', 'medium', 'high'];
      const workoutTypes: Array<'strength' | 'cardio' | 'crossfit'> = [
        'strength',
        'cardio',
        'crossfit',
      ];

      return {
        date,
        load: loadTypes[Math.floor(Math.random() * 3)],
        workoutType: workoutTypes[Math.floor(Math.random() * 3)],
        intensity: Math.random() * 0.5 + 0.5, // 0.5-1.0
      };
    });

    setDays(generatedDays);
  }, [currentMonth]);

  // Навигация по месяцам
  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // Дни недели
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

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
        {Array.from({ length: startOfMonth(currentMonth).getDay() || 7 }).map((_, i) => (
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

              {/* Индикатор типа тренировки */}
              {day.workoutType && (
                <span className="text-xs mt-1 opacity-80">
                  {day.workoutType === 'strength'
                    ? '🏋️‍♂️'
                    : day.workoutType === 'cardio'
                      ? '🏃'
                      : '⚡'}
                </span>
              )}

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

      {/* Информация о выбранном дне */}
      {selectedDate && (
        <div className="mt-6 p-4 bg-gray-800/50 rounded-lg animate-fade-in">
          <h3 className="font-bold text-white mb-2">
            {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
            {isToday(selectedDate) && (
              <span className="ml-2 px-2 py-1 bg-blue-600 text-xs rounded-full">Сегодня</span>
            )}
          </h3>

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div
                className={`
                w-4 h-4 rounded
                ${getColor(days.find((d) => isSameDay(d.date, selectedDate))?.load || 'none')}
              `}
              ></div>
              <span className="text-gray-300">
                Нагрузка:{' '}
                <strong>
                  {getLoadLabel(days.find((d) => isSameDay(d.date, selectedDate))?.load || 'none')}
                </strong>
              </span>
            </div>

            {days.find((d) => isSameDay(d.date, selectedDate))?.workoutType && (
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {days.find((d) => isSameDay(d.date, selectedDate))?.workoutType === 'strength'
                    ? '🏋️‍♂️'
                    : days.find((d) => isSameDay(d.date, selectedDate))?.workoutType === 'cardio'
                      ? '🏃'
                      : '⚡'}
                </span>
                <span className="text-gray-300">
                  Тип:{' '}
                  <strong>
                    {days.find((d) => isSameDay(d.date, selectedDate))?.workoutType === 'strength'
                      ? 'Силовая'
                      : days.find((d) => isSameDay(d.date, selectedDate))?.workoutType === 'cardio'
                        ? 'Кардио'
                        : 'Кроссфит'}
                  </strong>
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              // TODO: Переход к тренировке этого дня
              console.log('Переход к тренировке', selectedDate);
            }}
            className="mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition"
          >
            Посмотреть тренировки за этот день
          </button>
        </div>
      )}
    </div>
  );
}
