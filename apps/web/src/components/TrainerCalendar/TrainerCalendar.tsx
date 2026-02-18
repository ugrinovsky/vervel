import { useState, useEffect } from 'react';
import { format, startOfMonth, isSameDay, isToday, getDay } from 'date-fns';
import { ru } from 'date-fns/locale';

export interface TrainerDayData {
  date: Date;
  count: number; // number of scheduled workouts
}

interface TrainerCalendarProps {
  selectedDate: Date | null;
  onSelect: (day: TrainerDayData) => void;
  onMonthChange?: (month: Date) => void;
  onTodayClick?: (today: Date) => void;
  month?: Date;
  days: TrainerDayData[];
}

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function getMondayIndex(date: Date): number {
  const day = getDay(date);
  return day === 0 ? 6 : day - 1;
}

function countToLoad(count: number): 'none' | 'low' | 'medium' | 'high' {
  if (count === 0) return 'none';
  if (count === 1) return 'low';
  if (count === 2) return 'medium';
  return 'high';
}

const loadColors = {
  none: 'bg-[var(--color_bg_card)]',
  low: 'bg-emerald-800',
  medium: 'bg-emerald-600',
  high: 'bg-emerald-400',
};

export default function TrainerCalendar({
  selectedDate,
  onSelect,
  onMonthChange,
  onTodayClick,
  month = new Date(),
  days,
}: TrainerCalendarProps) {
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
    onTodayClick?.(today);
  };

  const startDayIndex = getMondayIndex(startOfMonth(currentMonth));

  return (
    <div className="glass p-2 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-[var(--color_bg_card_hover)] rounded-full transition"
            aria-label="Предыдущий месяц"
          >
            ←
          </button>
          <h2 className="text-base font-bold text-white capitalize">
            {format(currentMonth, 'LLLL yyyy', { locale: ru })}
          </h2>
          <button
            onClick={() => navigate(1)}
            className="p-2 hover:bg-[var(--color_bg_card_hover)] rounded-full transition"
            aria-label="Следующий месяц"
          >
            →
          </button>
        </div>
        <button
          onClick={goToToday}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-xs font-medium transition text-white"
        >
          Сегодня
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {WEEK_DAYS.map((d) => (
          <div key={d} className="text-center text-xs text-[var(--color_text_muted)] font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDayIndex }, (_, i) => (
          <div key={`empty-${i}`} className="h-12" />
        ))}

        {days.map((day, i) => {
          const isActive = selectedDate && isSameDay(day.date, selectedDate);
          const isCurrentDay = isToday(day.date);
          const load = countToLoad(day.count);
          const hasWorkouts = day.count > 0;

          return (
            <button
              key={i}
              onClick={() => onSelect(day)}
              className={`
                relative h-12 rounded-lg transition-all duration-200
                flex flex-col items-center justify-center gap-0.5
                ${loadColors[load]}
                ${isActive
                  ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-gray-900 scale-105'
                  : 'hover:opacity-90 hover:scale-105'
                }
                ${isCurrentDay && !isActive ? 'ring-1 ring-white/40' : ''}
                ${!hasWorkouts ? 'hover:bg-[var(--color_bg_card_hover)]' : ''}
              `}
              title={`${format(day.date, 'd MMMM yyyy', { locale: ru })}${day.count > 0 ? ` — ${day.count} тренировок` : ''}`}
            >
              <span
                className={`text-sm font-bold leading-none ${
                  hasWorkouts ? 'text-white' : 'text-[var(--color_text_muted)]'
                } ${isCurrentDay ? 'text-emerald-300' : ''}`}
              >
                {format(day.date, 'd')}
              </span>
              {hasWorkouts && (
                <span className="text-[10px] leading-none text-white/80 font-semibold">
                  {day.count}
                </span>
              )}
              {isCurrentDay && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-2 pt-2 border-t border-[var(--color_border)]">
        <div className="flex justify-between items-center">
          <span className="text-xs text-[var(--color_text_muted)]">Тренировок:</span>
          <div className="flex gap-3">
            {([['low', '1'], ['medium', '2'], ['high', '3+']] as const).map(([load, label]) => (
              <div key={load} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded ${loadColors[load]}`} />
                <span className="text-xs text-[var(--color_text_muted)]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
