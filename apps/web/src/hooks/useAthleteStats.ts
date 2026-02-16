import { useCallback, useEffect, useState } from 'react';
import { trainerApi } from '@/api/trainer';
import { WorkoutStats } from '@/types/Analytics';

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

export const useAthleteStats = (athleteId: number, period: StatsPeriod) => {
  const [data, setData] = useState<WorkoutStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRange(period);
      const response = await trainerApi.getAthleteStats(athleteId, from, to);
      setData(response.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [athleteId, period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { data, loading, refetch: fetchStats };
};
