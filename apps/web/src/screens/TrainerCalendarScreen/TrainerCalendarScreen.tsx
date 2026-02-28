import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getDaysInMonth, startOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import WorkoutInlineForm from '@/components/WorkoutInlineForm/WorkoutInlineForm';
import TrainerCalendar, { type TrainerDayData } from '@/components/TrainerCalendar/TrainerCalendar';
import { trainerApi, type ScheduledWorkout } from '@/api/trainer';

import { PlusIcon, TrashIcon, CheckIcon, XMarkIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

const WORKOUT_TYPE_LABELS: Record<string, string> = {
  crossfit: 'CrossFit',
  bodybuilding: 'Силовая',
  cardio: 'Кардио',
};

const WORKOUT_TYPE_COLORS: Record<string, string> = {
  crossfit: 'bg-white/10 ring-1 ring-inset ring-white/20',
  bodybuilding: 'bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/30',
  cardio: 'bg-amber-500/15 ring-1 ring-inset ring-amber-500/30',
};

// Hours shown on timeline (7:00 – 22:00)
const TIMELINE_HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

function getWorkoutHour(scheduledDate: string): number {
  return new Date(scheduledDate).getHours();
}

function getWorkoutMinutes(scheduledDate: string): string {
  return new Date(scheduledDate).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TrainerCalendarScreen() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(today));
  const [workouts, setWorkouts] = useState<ScheduledWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  // selectedTime: null = form hidden, string = form open with that time pre-filled
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<ScheduledWorkout | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

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
      const key = toDateKey(new Date(w.scheduledDate));
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
        .filter((w) => toDateKey(new Date(w.scheduledDate)) === selectedKey)
        .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()),
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
      setConfirmDeleteId(null);
      toast.success('Тренировка удалена');
      loadWorkouts(currentMonth);
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  const selectedDateStr = toDateKey(selectedDate);

  const openFormAt = (time: string) => {
    setEditingWorkout(null);
    setSelectedTime(time);
    setTimeout(() => {
      document.getElementById('workout-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  };

  const openEditForm = (workout: ScheduledWorkout) => {
    setSelectedTime(null);
    setEditingWorkout(workout);
    setTimeout(() => {
      document.getElementById('workout-form')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  };

  return (
    <Screen>
      <div className="flex flex-col h-full">
        {/* ── Page header ── */}
        <div className="px-4 pt-3 pb-1 shrink-0 flex items-center gap-2">
          <CalendarDaysIcon className="w-5 h-5 text-(--color_primary_light) shrink-0" />
          <h1 className="text-lg font-bold text-white">Календарь</h1>
        </div>

        {/* ── Calendar (top) ── */}
        <div className="px-2 pt-1 pb-1 shrink-0">
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
        <div className="border-t border-(--color_border) mx-2 shrink-0" />

        {/* ── Selected day timeline (bottom) ── */}
        <div className="flex-1 overflow-y-auto">
          {/* Day header */}
          <div className="flex items-center justify-between px-3 pt-3 pb-2 shrink-0">
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
                  ? 'Загрузка...'
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
          <div className="px-3 pb-4">
            {TIMELINE_HOURS.map((hour) => {
              const hourWorkouts = workoutsByHour[hour] ?? [];
              const hasWorkouts = hourWorkouts.length > 0;
              const timeStr = formatHour(hour);
              const isActive = selectedTime === timeStr;

              return (
                <div key={hour} className="flex gap-2 min-h-10">
                  {/* Hour label */}
                  <div className="w-10 shrink-0 pt-1.5">
                    <span className="text-xs text-(--color_text_muted) font-mono">{timeStr}</span>
                  </div>

                  {/* Content area */}
                  <div className="flex-1 border-l border-(--color_border) pl-3 py-1 mb-0.5">
                    {hasWorkouts ? (
                      <div className="space-y-1.5">
                        {hourWorkouts.map((workout) => (
                          <motion.div
                            key={workout.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            onClick={() => { setConfirmDeleteId(null); openEditForm(workout); }}
                            className={`relative rounded-xl px-3 py-2 flex items-center justify-between gap-2 cursor-pointer hover:opacity-90 transition-opacity ${
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
                                {WORKOUT_TYPE_LABELS[workout.workoutData.type] ??
                                  workout.workoutData.type}
                              </span>
                              {workout.assignedTo.length > 0 && (
                                <span className="text-xs text-white/60 truncate">
                                  {workout.assignedTo
                                    .map((a) => `${a.type === 'group' ? '👥' : '🏃'} ${a.name}`)
                                    .join(', ')}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(workout.id); }}
                              className="text-white/40 hover:text-red-400 transition-colors shrink-0 p-1"
                            >
                              <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                            {confirmDeleteId === workout.id && (
                              <div
                                className="absolute inset-0 rounded-xl bg-black/40 backdrop-blur-sm flex items-center justify-center gap-3 z-10"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="text-sm text-red-400 font-medium">Удалить?</span>
                                <button onClick={() => handleDelete(workout.id)} className="p-1.5 text-red-400 hover:text-red-300 transition-colors" title="Да">
                                  <CheckIcon className="w-5 h-5" />
                                </button>
                                <button onClick={() => setConfirmDeleteId(null)} className="p-1.5 text-white/60 hover:text-white transition-colors" title="Отмена">
                                  <XMarkIcon className="w-5 h-5" />
                                </button>
                              </div>
                            )}
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

          {/* Inline create / edit form */}
          <AnimatePresence>
            {(selectedTime !== null || editingWorkout !== null) && (
              <motion.div
                id="workout-form"
                key={editingWorkout ? `edit-${editingWorkout.id}` : `${selectedDateStr}-${selectedTime}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-3 mb-3"
              >
                {editingWorkout ? (
                  <WorkoutInlineForm
                    key={editingWorkout.id}
                    editWorkout={editingWorkout}
                    onSuccess={() => {
                      setEditingWorkout(null);
                      loadWorkouts(currentMonth);
                    }}
                    onCancel={() => setEditingWorkout(null)}
                  />
                ) : (
                  <WorkoutInlineForm
                    preselectedDate={selectedDateStr}
                    preselectedTime={selectedTime!}
                    onSuccess={() => {
                      setSelectedTime(null);
                      loadWorkouts(currentMonth);
                    }}
                    onCancel={() => setSelectedTime(null)}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Screen>
  );
}
