import { useState, useEffect, useRef } from 'react';
import { format, startOfMonth, isSameDay, isToday, getDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';

export type LoadType = 'none' | 'low' | 'medium' | 'high';

export interface DayData {
  date: Date;
  load: LoadType;
  workoutType?: 'strength' | 'cardio' | 'crossfit' | 'rest';
  intensity?: number;
  fromTrainer?: boolean;
  hasDraft?: boolean;
}

export interface TrainerDayData {
  date: Date;
  count: number;
}

type BaseProps = {
  selectedDate: Date | null;
  onMonthChange?: (month: Date) => void;
  onTodayClick?: (today: Date) => void;
  month?: Date;
};

type LoadModeProps = BaseProps & {
  mode: 'load';
  days: DayData[];
  onSelect: (day: DayData) => void;
  hideTrainerBadge?: boolean;
};

type CountModeProps = BaseProps & {
  mode: 'count';
  days: TrainerDayData[];
  onSelect: (day: TrainerDayData) => void;
};

export type CalendarProps = LoadModeProps | CountModeProps;

const loadColors: Record<LoadType, string> = {
  none: 'bg-(--color_bg_card)',
  low: 'bg-emerald-600',
  medium: 'bg-emerald-500',
  high: 'bg-emerald-400',
};

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function getMondayIndex(date: Date): number {
  const day = getDay(date);
  return day === 0 ? 6 : day - 1;
}

function countToLoad(count: number): LoadType {
  if (count === 0) return 'none';
  if (count === 1) return 'low';
  if (count === 2) return 'medium';
  return 'high';
}

export default function Calendar(props: CalendarProps) {
  const { selectedDate, onMonthChange, onTodayClick, month = new Date() } = props;
  const [currentMonth, setCurrentMonth] = useState<Date>(month);
  const directionRef = useRef<1 | -1>(1);

  useEffect(() => {
    setCurrentMonth(month);
  }, [month]);

  const navigate = (delta: 1 | -1) => {
    directionRef.current = delta;
    const next = new Date(currentMonth);
    next.setMonth(currentMonth.getMonth() + delta);
    setCurrentMonth(next);
    onMonthChange?.(next);
  };

  const goToToday = () => {
    const today = new Date();
    directionRef.current = today >= currentMonth ? 1 : -1;
    setCurrentMonth(today);
    onMonthChange?.(today);
    onTodayClick?.(today);
  };

  const startDayIndex = getMondayIndex(startOfMonth(currentMonth));
  const monthKey = format(currentMonth, 'yyyy-MM');
  const animDir = directionRef.current;

  return (
    <div className="glass p-6 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center justify-between flex-1">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 hover:bg-(--color_bg_card_hover) rounded-full transition"
            aria-label="Предыдущий месяц"
          >
            ←
          </button>
          <h2 className="text-base font-bold text-white capitalize flex items-center gap-2">
            <CalendarDaysIcon className="w-4 h-4 text-(--color_text_muted) shrink-0" />
            {format(currentMonth, 'LLLL yyyy', { locale: ru })}
          </h2>
          <button
            onClick={() => navigate(1)}
            className="p-1.5 hover:bg-(--color_bg_card_hover) rounded-full transition"
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

      {/* Weekday headers */}
      <div className="relative">
        <div className="h-px bg-white/10 mb-3" />
        <div className="grid grid-cols-7 gap-2 mb-1">
          {WEEK_DAYS.map((d) => (
            <div key={d} className="text-center text-sm text-(--color_text_muted) font-medium pb-2">
              {d}
            </div>
          ))}
        </div>
        <div className="h-px bg-linear-to-r from-transparent via-white/10 to-transparent mb-3" />
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-linear-to-b from-transparent to-white/3 pointer-events-none" />
      </div>

      {/* Day grid */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={monthKey}
          initial={{ opacity: 0, y: animDir > 0 ? 8 : -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: animDir > 0 ? -8 : 8 }}
          transition={{ duration: 0.18, ease: 'easeInOut' }}
          className="grid grid-cols-7 gap-2"
        >
          {Array.from({ length: startDayIndex }, (_, i) => (
            <div key={`empty-${i}`} className="h-12" />
          ))}

          {props.mode === 'count'
            ? props.days.map((day, i) => {
                const isActive = selectedDate && isSameDay(day.date, selectedDate);
                const isCurrentDay = isToday(day.date);
                const load = countToLoad(day.count);
                const hasWorkouts = day.count > 0;
                return (
                  <button
                    key={i}
                    onClick={() => props.onSelect(day)}
                    className={`
                      relative h-12 rounded-lg transition-all duration-200
                      flex flex-col items-center justify-center gap-0.5
                      ${loadColors[load]}
                      ${isActive ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-gray-900 scale-105' : 'hover:opacity-90 hover:scale-105'}
                      ${isCurrentDay && !isActive ? 'ring-1 ring-white/40' : ''}
                      ${!hasWorkouts ? 'hover:bg-(--color_bg_card_hover)' : ''}
                    `}
                    title={`${format(day.date, 'd MMMM yyyy', { locale: ru })}${day.count > 0 ? ` — ${day.count} тренировок` : ''}`}
                  >
                    <span className={`text-sm font-bold leading-none ${hasWorkouts ? 'text-white' : 'text-(--color_text_muted)'} ${isCurrentDay ? '!text-emerald-300' : ''}`}>
                      {format(day.date, 'd')}
                    </span>
                    {hasWorkouts && (
                      <span className="text-[10px] leading-none text-white/80 font-semibold">{day.count}</span>
                    )}
                    {isCurrentDay && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full" />
                    )}
                  </button>
                );
              })
            : props.days.map((day, i) => {
                const isActive = selectedDate && isSameDay(day.date, selectedDate);
                const isCurrentDay = isToday(day.date);
                const hasLoad = day.load !== 'none';
                const hideTrainer = props.hideTrainerBadge ?? false;
                return (
                  <button
                    key={i}
                    onClick={() => props.onSelect(day)}
                    className={`
                      relative h-12 rounded-lg transition-all duration-200
                      flex items-center justify-center
                      ${loadColors[day.load]}
                      ${isActive ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-gray-900 scale-105' : 'hover:opacity-90 hover:scale-105'}
                      ${isCurrentDay && !isActive ? 'ring-1 ring-white/40' : ''}
                      ${!hasLoad ? 'hover:bg-(--color_bg_card_hover)' : ''}
                    `}
                    title={`${format(day.date, 'd MMMM yyyy', { locale: ru })} — нагрузка`}
                  >
                    <span className={`text-sm font-bold ${hasLoad ? 'text-white' : 'text-(--color_text_muted)'} ${isCurrentDay ? '!text-emerald-300' : ''}`}>
                      {format(day.date, 'd')}
                    </span>
                    {isCurrentDay && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full" />
                    )}
                    {day.fromTrainer && !hideTrainer && (
                      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-violet-400 rounded-full border border-gray-900" title="Назначено тренером" />
                    )}
                    {day.hasDraft && (
                      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-amber-400 rounded-full border border-gray-900" title="Есть черновик" />
                    )}
                  </button>
                );
              })
          }
        </motion.div>
      </AnimatePresence>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-(--color_border)">
        {props.mode === 'count' ? (
          <div className="flex flex-wrap justify-between items-center gap-2">
            <span className="text-sm text-(--color_text_muted)">Тренировок:</span>
            <div className="flex gap-4 flex-wrap">
              {(['low', 'medium', 'high'] as const).map((load, i) => (
                <div key={load} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${loadColors[load]}`} />
                  <span className="text-xs text-(--color_text_secondary)">{['1', '2', '3+'][i]}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap justify-between items-center gap-2">
            <span className="text-sm text-(--color_text_muted)">Нагрузка:</span>
            <div className="flex gap-4 flex-wrap">
              {(['low', 'medium', 'high'] as const).map((load, i) => (
                <div key={load} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${loadColors[load]}`} />
                  <span className="text-xs text-(--color_text_secondary)">{['Низкая', 'Средняя', 'Высокая'][i]}</span>
                </div>
              ))}
              {!props.hideTrainerBadge && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-violet-400" />
                  <span className="text-xs text-(--color_text_secondary)">От тренера</span>
                </div>
              )}
              {props.days.some((d) => d.hasDraft) && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-xs text-(--color_text_secondary)">Черновик</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
