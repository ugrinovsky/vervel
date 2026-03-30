import { useState, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { useLocation } from 'react-router';
import { toDateKey, parseApiDateTime, parseLocalDate } from '@/utils/date';
import { workoutsApi } from '@/api/workouts';
import type { DayData } from '@/components/ui/Calendar';
import type { WorkoutTimelineEntry, WorkoutStats } from '@/types/Analytics';

const DEFAULT_DURATION = 60;
const CALORIES_PER_KG = 0.05;

function findWorkoutByDate(timeline: WorkoutTimelineEntry[], dateStr: string) {
  return timeline.find((w) => format(parseApiDateTime(w.date), 'yyyy-MM-dd') === dateStr);
}

function filterWorkoutsByDate(timeline: WorkoutTimelineEntry[], dateStr: string) {
  return timeline.filter((w) => format(parseApiDateTime(w.date), 'yyyy-MM-dd') === dateStr);
}

export interface DayStats {
  exercises: number;
  duration: number;
  volume: number;
  calories: number;
  type: string | null;
  intensity: number;
  fromTrainer: boolean;
}

export interface MonthlyStatsData {
  workouts: number;
  activeDays: number;
  totalVolume: number;
  avgVolume: number;
  avgDuration: number;
  totalCalories: number;
  streak: number;
}

const EMPTY_DAY_STATS: DayStats = {
  exercises: 0,
  duration: 0,
  volume: 0,
  calories: 0,
  type: null,
  intensity: 0,
  fromTrainer: false,
};

export function useActivityData(draftDate?: string | null) {
  const location = useLocation();
  const initialDate = (location.state as { date?: string } | null)?.date;

  const [selectedDate, setSelectedDate] = useState<Date | null>(
    initialDate ? parseLocalDate(initialDate) : new Date()
  );
  const [currentMonth, setCurrentMonth] = useState<Date>(
    initialDate ? parseLocalDate(initialDate) : new Date()
  );
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = () => setRefetchTrigger((t) => t + 1);

  useEffect(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const from = toDateKey(new Date(year, month, 1));
    const to = toDateKey(new Date(year, month + 1, 0)) + 'T23:59:59';
    if (!stats) setLoading(true);
    workoutsApi.stats(from, to)
      .then((res) => setStats(res.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [currentMonth, refetchTrigger]);

  const days: DayData[] = useMemo(() => {
    if (!stats?.timeline) return [];

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month, i + 1);
      const dateKey = format(date, 'yyyy-MM-dd');
      const workout = findWorkoutByDate(stats.timeline, dateKey);

      return {
        date,
        workoutsCount: workout ? 1 : 0,
        load: (workout?.loadLevel ?? 'none') as DayData['load'],
        workoutType: workout?.type as DayData['workoutType'],
        intensity: workout?.intensity,
        fromTrainer: workout?.scheduledWorkoutId != null,
        hasDraft: draftDate === dateKey,
      };
    });
  }, [stats, currentMonth, draftDate]);

  const dayStats: DayStats | null = useMemo(() => {
    if (!selectedDate || !stats?.timeline) return null;

    const dayWorkouts = filterWorkoutsByDate(
      stats.timeline,
      format(selectedDate, 'yyyy-MM-dd'),
    );

    if (!dayWorkouts.length) return EMPTY_DAY_STATS;

    return dayWorkouts.reduce<DayStats>(
      (acc, w) => ({
        exercises: acc.exercises + ((w as any).exercises?.length || 1),
        duration: acc.duration + ((w as any).duration || DEFAULT_DURATION),
        volume: acc.volume + (w.volume || 0),
        calories: acc.calories + Math.round((w.volume || 0) * CALORIES_PER_KG),
        type: w.type || acc.type,
        intensity: w.intensity || acc.intensity,
        fromTrainer: acc.fromTrainer || w.scheduledWorkoutId != null,
      }),
      { ...EMPTY_DAY_STATS },
    );
  }, [selectedDate, stats]);

  const monthlyStats: MonthlyStatsData | null = useMemo(() => {
    if (!stats?.timeline.length) return null;

    const totalVolume =
      stats.totalVolume || stats.timeline.reduce((acc, w) => acc + (w.volume || 0), 0);
    const count = stats.timeline.length;

    const totalDuration = stats.timeline.reduce(
      (acc, w) => acc + ((w as any).duration || DEFAULT_DURATION),
      0,
    );
    const totalCalories = stats.timeline.reduce(
      (acc, w) => acc + Math.round((w.volume || 0) * CALORIES_PER_KG),
      0,
    );

    return {
      workouts: count,
      activeDays: new Set(stats.timeline.map((w) => format(new Date(w.date), 'yyyy-MM-dd'))).size,
      totalVolume,
      avgVolume: Math.round(totalVolume / count),
      avgDuration: Math.round(totalDuration / count),
      totalCalories,
      streak: (stats as any).streak || 0,
    };
  }, [stats]);

  const dayWorkouts = useMemo(() => {
    if (!selectedDate || !stats?.timeline) return [];
    return filterWorkoutsByDate(stats.timeline, format(selectedDate, 'yyyy-MM-dd'));
  }, [selectedDate, stats]);

  return {
    selectedDate,
    setSelectedDate,
    currentMonth,
    setCurrentMonth,
    stats,
    loading,
    days,
    dayStats,
    dayWorkouts,
    monthlyStats,
    refetch,
  };
}
