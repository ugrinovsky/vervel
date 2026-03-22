import { useState, useMemo } from 'react';
import type { Exercise, ExerciseCategory, MuscleZone } from '@/types/Exercise';

export const normalizeSearch = (s: string) => s.toLowerCase().replace(/ё/g, 'е');

export function useExerciseFilters(exercises: Exercise[]) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ExerciseCategory | null>(null);
  const [zoneFilter, setZoneFilter] = useState<MuscleZone | null>(null);

  const availableCategories = useMemo<ExerciseCategory[]>(() => {
    const ALL: ExerciseCategory[] = ['strength', 'functional', 'olympic', 'cardio', 'gymnastics'];
    if (exercises.length === 0) return ALL;
    const set = new Set(exercises.map((e) => e.category));
    return ALL.filter((c) => set.has(c));
  }, [exercises]);

  const availableZones = useMemo<MuscleZone[]>(() => {
    const set = new Set(exercises.flatMap((e) => e.zones));
    return [...set] as MuscleZone[];
  }, [exercises]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(search.trim());
    return exercises.filter((ex) => {
      if (categoryFilter && ex.category !== categoryFilter) return false;
      if (zoneFilter && !ex.zones.includes(zoneFilter)) return false;
      if (q) return normalizeSearch(ex.title).includes(q);
      return true;
    });
  }, [exercises, search, categoryFilter, zoneFilter]);

  return {
    search, setSearch,
    categoryFilter, setCategoryFilter,
    zoneFilter, setZoneFilter,
    availableCategories,
    availableZones,
    filtered,
  };
}
