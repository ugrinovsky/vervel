import { useState, useEffect } from 'react';
import { format, startOfMonth, isSameDay, isToday, getDay } from 'date-fns';
import { ru } from 'date-fns/locale';

export type LoadType = 'none' | 'low' | 'medium' | 'high';

export interface DayData {
  date: Date;
  load: LoadType;
  workoutType?: 'strength' | 'cardio' | 'crossfit' | 'rest';
  intensity?: number;
}

interface ActivityCalendarProps {
  selectedDate: Date | null;
  onSelect: (day: DayData) => void;
  onMonthChange?: (month: Date) => void;
  month?: Date;
  days: DayData[];
}

const loadColors: Record<LoadType, string> = {
  none: 'bg-(--color_bg_card)',
  low: 'bg-emerald-800',
  medium: 'bg-emerald-600',
  high: 'bg-emerald-400',
};

const loadLabels: Record<LoadType, string> = {
  none: 'Нет',
  low: 'Низкая',
  medium: 'Средняя',
  high: 'Высокая',
};

const legendItems: { load: LoadType; label: string }[] = [
  { load: 'low', label: 'Низкая' },
  { load: 'medium', label: 'Средняя' },
  { load: 'high', label: 'Высокая' },
];

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function getMondayIndex(date: Date): number {
  const day = getDay(date);
  return day === 0 ? 6 : day - 1;
}

export default function ActivityCalendar({
  selectedDate,
  onSelect,
  onMonthChange,
  month = new Date(),
  days,
}: ActivityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(month);

  useEffect(() => {
    setCurrentMonth(month);
  }, [month]);

  const navigate = (delta: number) => {
    const next = new Date(currentMonth);
    next.setMonth(currentMonth.getMonth() + delta);
    setCurrentMonth(next);
    onMonthChange?.(next);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    onMonthChange?.(today);
  };

  const startDayIndex = getMondayIndex(startOfMonth(currentMonth));

  return (
    <div className="glass p-6 rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-(--color_bg_card_hover) rounded-full transition"
            aria-label="Предыдущий месяц"
          >
            ←
          </button>
          <h2 className="text-xl font-bold text-white capitalize">
            {format(currentMonth, 'LLLL yyyy', { locale: ru })}
          </h2>
          <button
            onClick={() => navigate(1)}
            className="p-2 hover:bg-(--color_bg_card_hover) rounded-full transition"
            aria-label="Следующий месяц"
          >
            →
          </button>
        </div>

        <button
          onClick={goToToday}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium transition text-white"
        >
          Сегодня
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-3">
        {WEEK_DAYS.map((day) => (
          <div key={day} className="text-center text-sm text-(--color_text_muted) font-medium">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: startDayIndex }, (_, i) => (
          <div key={`empty-${i}`} className="h-12" />
        ))}

        {days.map((day, i) => {
          const isActive = selectedDate && isSameDay(day.date, selectedDate);
          const isCurrentDay = isToday(day.date);
          const hasLoad = day.load !== 'none';

          return (
            <button
              key={i}
              onClick={() => onSelect(day)}
              className={`
                relative h-12 rounded-lg transition-all duration-200
                flex items-center justify-center
                ${loadColors[day.load]}
                ${isActive
                  ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-gray-900 scale-105'
                  : 'hover:opacity-90 hover:scale-105'
                }
                ${isCurrentDay && !isActive ? 'ring-1 ring-white/40' : ''}
                ${!hasLoad ? 'hover:bg-(--color_bg_card_hover)' : ''}
              `}
              title={`${format(day.date, 'd MMMM yyyy', { locale: ru })} — ${loadLabels[day.load]} нагрузка`}
            >
              <span
                className={`
                  text-sm font-bold
                  ${hasLoad ? 'text-white' : 'text-(--color_text_muted)'}
                  ${isCurrentDay ? 'text-emerald-300' : ''}
                `}
              >
                {format(day.date, 'd')}
              </span>
              {isCurrentDay && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-(--color_border)">
        <div className="flex justify-between items-center">
          <span className="text-sm text-(--color_text_muted)">Нагрузка:</span>
          <div className="flex gap-4">
            {legendItems.map(({ load, label }) => (
              <div key={load} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${loadColors[load]}`} />
                <span className="text-xs text-(--color_text_secondary)">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
