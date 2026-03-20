import { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { getDaysInMonth, startOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import WorkoutInlineForm from '@/components/WorkoutInlineForm/WorkoutInlineForm';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import TrainerCalendar, { type TrainerDayData } from '@/components/TrainerCalendar/TrainerCalendar';
import { trainerApi, type ScheduledWorkout, type AthleteListItem } from '@/api/trainer';
import { toDateKey, parseApiDateTime, toApiDateTime } from '@/utils/date';

import { PlusIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import ScreenLinks from '@/components/ScreenLinks/ScreenLinks';
import ScreenHint from '@/components/ScreenHint/ScreenHint';
import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton';
import { WORKOUT_TYPE_CONFIG } from '@/constants/AnalyticsConstants';

const WORKOUT_TYPE_COLORS: Record<string, string> = {
  crossfit: 'bg-white/10 ring-1 ring-inset ring-white/20',
  bodybuilding: 'bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/30',
  cardio: 'bg-amber-500/15 ring-1 ring-inset ring-amber-500/30',
};

// Hours shown on timeline (7:00 – 23:00)
const TIMELINE_HOURS = Array.from({ length: 17 }, (_, i) => i + 7);

function formatHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

function getWorkoutHour(scheduledDate: string): number {
  return parseApiDateTime(scheduledDate).getHours();
}

function getWorkoutMinutes(scheduledDate: string): string {
  return parseApiDateTime(scheduledDate).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAssignedTo(
  assignedTo: ScheduledWorkout['assignedTo'],
  nicknames: Map<number, string>
): string {
  if (assignedTo.length === 0) return ''
  if (assignedTo.length === 1) {
    const a = assignedTo[0]
    const icon = a.type === 'group' ? '👥' : '🏃'
    const name = a.type === 'athlete' ? (nicknames.get(a.id) ?? a.name) : a.name
    return `${icon} ${name}`
  }
  const groups = assignedTo.filter((a) => a.type === 'group').length
  const athletes = assignedTo.filter((a) => a.type === 'athlete').length
  const parts: string[] = []
  if (groups > 0) parts.push(`👥 ${groups}`)
  if (athletes > 0) parts.push(`🏃 ${athletes}`)
  return parts.join(' · ')
}

export default function TrainerCalendarScreen() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(today));
  const [workouts, setWorkouts] = useState<ScheduledWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [now, setNow] = useState(() => new Date());
  // selectedTime: null = form hidden, string = form open with that time pre-filled
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<ScheduledWorkout | null>(null);
  const [athletes, setAthletes] = useState<AthleteListItem[]>([]);

  const loadWorkouts = async (month: Date) => {
    try {
      setLoading(true);
      const from = new Date(month.getFullYear(), month.getMonth(), 1);
      const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      const to = toDateKey(lastDay) + 'T23:59:59';
      const res = await trainerApi.getScheduledWorkouts(toDateKey(from), to);
      setWorkouts(res.data.data);
    } catch {
      toast.error('Ошибка загрузки тренировок');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkouts(currentMonth);
  }, [currentMonth]);

  useEffect(() => {
    trainerApi.listAthletes().then((res) => setAthletes(res.data.data)).catch(() => {});
  }, []);

  const nicknames = useMemo(() => {
    const map = new Map<number, string>();
    for (const a of athletes) {
      if (a.nickname) map.set(a.id, a.nickname);
    }
    return map;
  }, [athletes]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(startOfMonth(month));
    setSelectedTime(null);
  };

  // Build DayData array for the calendar
  const calendarDays: TrainerDayData[] = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysCount = getDaysInMonth(currentMonth);

    const countByKey: Record<string, number> = {};
    for (const w of workouts) {
      const key = toDateKey(parseApiDateTime(w.scheduledDate));
      countByKey[key] = (countByKey[key] || 0) + 1;
    }

    return Array.from({ length: daysCount }, (_, i) => {
      const date = new Date(year, month, i + 1);
      return { date, count: countByKey[toDateKey(date)] ?? 0 };
    });
  }, [currentMonth, workouts]);

  // Workouts for selected day
  const selectedKey = toDateKey(selectedDate);
  const selectedWorkouts = useMemo(
    () =>
      workouts
        .filter((w) => toDateKey(parseApiDateTime(w.scheduledDate)) === selectedKey)
        .sort((a, b) => parseApiDateTime(a.scheduledDate).getTime() - parseApiDateTime(b.scheduledDate).getTime()),
    [workouts, selectedKey]
  );

  // Group workouts by hour
  const workoutsByHour = useMemo(() => {
    const map: Record<number, ScheduledWorkout[]> = {};
    for (const w of selectedWorkouts) {
      const h = getWorkoutHour(w.scheduledDate);
      if (!map[h]) map[h] = [];
      map[h].push(w);
    }
    return map;
  }, [selectedWorkouts]);

  const handleDelete = async (id: number) => {
    try {
      await trainerApi.deleteScheduledWorkout(id);
      toast.success('Тренировка удалена');
      loadWorkouts(currentMonth);
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  const isToday = toDateKey(selectedDate) === toDateKey(now);
  const nowHour = now.getHours();
  const nowMinutes = now.getMinutes();

  const selectedDateStr = toDateKey(selectedDate);

  const openFormAt = (time: string) => {
    setEditingWorkout(null);
    setSelectedTime(time);
  };

  const openEditForm = (workout: ScheduledWorkout) => {
    setSelectedTime(null);
    setEditingWorkout(workout);
  };

  return (
    <Screen className="trainer-calendar-screen">
      <div className="flex flex-col px-4 w-full">
        {/* ── Page header ── */}
        <div className="pt-4 pb-1 shrink-0">
          <ScreenHeader
            icon="📅"
            title="Календарь"
            description="Планируйте тренировки для атлетов и групп по датам — нажмите на слот времени, чтобы назначить тренировку"
          />
          <ScreenHint className="mb-2">
            Выберите день в календаре, нажмите на слот времени — откроется форма тренировки.
            Можно назначить{' '}
            <span className="text-white font-medium">сразу нескольким атлетам или группам</span>.
            Используйте шаблоны, чтобы не вводить упражнения заново.
          </ScreenHint>
        </div>

        {/* ── Calendar (top) ── */}
        <div className="pt-1 pb-1 shrink-0">
          <TrainerCalendar
            days={calendarDays}
            selectedDate={selectedDate}
            month={currentMonth}
            onSelect={(day) => {
              setSelectedDate(day.date);
              setSelectedTime(null);
            }}
            onTodayClick={(today) => {
              setSelectedDate(today);
              setSelectedTime(null);
            }}
            onMonthChange={handleMonthChange}
          />
        </div>

        {/* ── Divider ── */}
        <div className="border-t border-(--color_border) shrink-0 mt-3 mb-3" />

        {/* ── Selected day timeline (bottom) ── */}
        <div>
          {/* Day header */}
          <div className="flex items-center justify-between pt-3 pb-2 shrink-0">
            <div>
              <div className="text-sm font-semibold text-white capitalize flex items-center gap-1.5">
                <CalendarDaysIcon className="w-4 h-4 text-(--color_text_muted) shrink-0" />
                {selectedDate.toLocaleDateString('ru-RU', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </div>
              <div className="text-xs text-(--color_text_muted)">
                {loading
                  ? '…'
                  : selectedWorkouts.length === 0
                    ? 'Нет тренировок — нажмите на слот ниже'
                    : `${selectedWorkouts.length} тренировок`}
              </div>
            </div>
            {selectedTime === null && (
              <button
                onClick={() => openFormAt('09:00')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-(--color_primary_light) text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <PlusIcon className="w-4 h-4" />
                Добавить
              </button>
            )}
          </div>

          {/* Timeline */}
          <div className="pb-4">
            {TIMELINE_HOURS.map((hour) => {
              const hourWorkouts = workoutsByHour[hour] ?? [];
              const hasWorkouts = hourWorkouts.length > 0;
              const timeStr = formatHour(hour);
              const isActive = selectedTime === timeStr;

              const isCurrentHour = isToday && hour === nowHour;

              return (
                <div key={hour} className="flex gap-2 min-h-10 border-t border-white/4">
                  {/* Hour label */}
                  <div className="w-10 shrink-0 pt-1.5">
                    <span
                      className={`text-xs font-mono ${isCurrentHour ? 'text-red-400 font-semibold' : 'text-(--color_text_muted)'}`}
                    >
                      {timeStr}
                    </span>
                  </div>

                  {/* Content area */}
                  <div className="flex-1 border-l border-(--color_border) pl-3 py-1 mb-0.5 relative">
                    {/* Current time indicator */}
                    {isCurrentHour && (
                      <div
                        className="absolute left-0 right-0 flex items-center pointer-events-none z-10"
                        style={{ top: `${(nowMinutes / 60) * 100}%` }}
                      >
                        <div className="w-2 h-2 rounded-full bg-red-400 shrink-0 -ml-1" />
                        <div className="flex-1 h-px bg-red-400/70" />
                        <span className="text-[10px] text-red-400 font-mono shrink-0 ml-1">
                          {String(nowHour).padStart(2, '0')}:{String(nowMinutes).padStart(2, '0')}
                        </span>
                      </div>
                    )}
                    {hasWorkouts ? (
                      <div className="space-y-1.5">
                        {hourWorkouts.map((workout) => (
                          <motion.div
                            key={workout.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            onClick={() => openEditForm(workout)}
                            className={`rounded-xl px-3 py-2 flex items-center justify-between gap-2 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden ${
                              editingWorkout?.id === workout.id ? 'ring-2 ring-white/40' : ''
                            } ${
                              WORKOUT_TYPE_COLORS[workout.workoutData.type] ??
                              'bg-(--color_bg_card)'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-mono text-white/70 shrink-0">
                                {getWorkoutMinutes(workout.scheduledDate)}
                              </span>
                              <span className="text-sm font-medium text-white truncate">
                                {WORKOUT_TYPE_CONFIG[workout.workoutData.type] ??
                                  workout.workoutData.type}
                              </span>
                              {workout.assignedTo.length > 0 && (
                                <span className="text-xs text-white/60 truncate">
                                  {formatAssignedTo(workout.assignedTo, nicknames)}
                                </span>
                              )}
                            </div>
                            <ConfirmDeleteButton onConfirm={() => handleDelete(workout.id)} />
                          </motion.div>
                        ))}

                        {/* Add another at this hour */}
                        <button
                          onClick={() => openFormAt(timeStr)}
                          className={`w-full text-left text-xs text-(--color_text_muted) hover:text-white transition-colors py-0.5 ${
                            isActive ? 'text-emerald-400' : ''
                          }`}
                        >
                          + ещё в {timeStr}
                        </button>
                      </div>
                    ) : (
                      /* Empty slot — click to add */
                      <button
                        onClick={() => openFormAt(timeStr)}
                        className={`
                          w-full h-8 rounded-lg text-xs transition-all duration-150 text-left px-2
                          ${
                            isActive
                              ? 'bg-emerald-900/60 text-emerald-300 ring-1 ring-emerald-600'
                              : 'text-transparent hover:bg-(--color_bg_card_hover) hover:text-(--color_text_muted)'
                          }
                        `}
                      >
                        + добавить в {timeStr}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <ScreenLinks
          className="pb-4"
          links={[
            { emoji: '🏃', bg: 'bg-emerald-500/20', label: 'Атлеты',   sub: 'список атлетов',    to: '/trainer/athletes' },
            { emoji: '👥', bg: 'bg-blue-500/20',    label: 'Группы',   sub: 'список групп',      to: '/trainer/groups' },
            { emoji: '📋', bg: 'bg-violet-500/20',  label: 'Шаблоны',  sub: 'готовые тренировки', to: '/trainer/templates' },
          ]}
        />
      </div>
      <BottomSheet
        open={selectedTime !== null || editingWorkout !== null}
        onClose={() => {
          setSelectedTime(null);
          setEditingWorkout(null);
        }}
        title={editingWorkout ? 'Редактировать тренировку' : 'Создать тренировку'}
        emoji="💪"
      >
        {editingWorkout ? (
          <WorkoutInlineForm
            key={editingWorkout.id}
            editWorkout={editingWorkout}
            noCard
            onSuccess={() => {
              setEditingWorkout(null);
              loadWorkouts(currentMonth);
            }}
            onCancel={() => setEditingWorkout(null)}
          />
        ) : selectedTime !== null ? (
          <WorkoutInlineForm
            key={`${selectedDateStr}-${selectedTime}`}
            preselectedDate={selectedDateStr}
            preselectedTime={selectedTime}
            noCard
            onSuccess={() => {
              setSelectedTime(null);
              loadWorkouts(currentMonth);
            }}
            onCancel={() => setSelectedTime(null)}
          />
        ) : null}
      </BottomSheet>
    </Screen>
  );
}
