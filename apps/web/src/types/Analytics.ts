export interface WorkoutTimelineEntry {
  id?: number; // ID тренировки в БД
  date: string; // ISO строка даты
  type?: string; // Тип тренировки, например "mixed", "crossfit"
  volume?: number; // Общий тоннаж
  intensity?: number; // 0-1
  zones?: Record<string, number>; // Доля нагрузки по мышечным зонам, 0-1
  scheduledWorkoutId?: number | null; // Если назначено тренером
  loadLevel?: 'none' | 'low' | 'medium' | 'high'; // Вычисляется бэкендом
}

export interface WorkoutStats {
  workoutsCount: number;
  totalVolume: number; // общий тоннаж
  avgIntensity: number; // 0-1
  byType?: Record<string, number>; // количество тренировок по типу
  zones: Record<string, number>; // нагрузка по зонам, ключи как в ZONE_LABELS
  timeline: WorkoutTimelineEntry[]; // история тренировок
  period?: 'week' | 'month' | 'year' | 'custom';
}
