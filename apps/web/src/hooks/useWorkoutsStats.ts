// hooks/useWorkoutStats.ts
import { useCallback, useEffect, useState } from 'react';
import { workoutsApi } from '@/api/workouts';

export type StatsPeriod = 'week' | 'month' | 'year';

const getDateRange = (period: StatsPeriod) => {
  const now = new Date();
  const from = new Date(now);

  if (period === 'week') from.setDate(now.getDate() - 7);
  if (period === 'month') from.setMonth(now.getMonth() - 1);
  if (period === 'year') from.setFullYear(now.getFullYear() - 1);

  return {
    from: from.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
};

export const useWorkoutStats = (period: StatsPeriod) => {
  const [data, setData] = useState<unknown>({
    workoutsCount: 0,
    totalVolume: 0,
    avgIntensity: null,
    byType: {},
    zones: {},
    timeline: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { from, to } = getDateRange(period);
      const response = await workoutsApi.stats(from, to);
      setData(response.data);
    } catch {
      setError('Ошибка загрузки статистики');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { data, loading, error, refetch: fetchStats };
};
