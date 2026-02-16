import { useCallback, useEffect, useState } from 'react';
import { trainerApi } from '@/api/trainer';

interface AvatarData {
  zones: Record<string, { intensity: number; lastTrainedDaysAgo: number; peakLoad: number }>;
  totalWorkouts: number;
  lastWorkoutDaysAgo: number | null;
}

export const useAthleteAvatar = (athleteId: number) => {
  const [data, setData] = useState<AvatarData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAvatar = useCallback(async () => {
    setLoading(true);
    try {
      const response = await trainerApi.getAthleteAvatar(athleteId, { mode: 'recovery' });
      setData(response.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    fetchAvatar();
  }, [fetchAvatar]);

  return { data, loading, refetch: fetchAvatar };
};
