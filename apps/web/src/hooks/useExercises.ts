import { useEffect, useState } from 'react';
import { exercisesApi } from '../api/exercises';
import { Exercise } from '@/types/Exercise';

export function useExercises() {
  const [data, setData] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    exercisesApi
      .list()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}
