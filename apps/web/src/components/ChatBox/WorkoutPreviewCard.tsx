import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { ExerciseData } from '@/api/trainer';
import { WORKOUT_TYPE_CONFIG } from '@/constants/workoutTypes';

export interface WorkoutPreviewData {
  __type: 'workout_preview';
  date: string;
  time: string;
  workoutType: 'crossfit' | 'bodybuilding' | 'cardio';
  exercises: ExerciseData[];
  notes?: string;
  scheduledWorkoutId?: number;
}

export function parseWorkoutPreview(content: string): WorkoutPreviewData | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed.__type === 'workout_preview') return parsed as WorkoutPreviewData;
    return null;
  } catch {
    return null;
  }
}

export function WorkoutPreviewCard({ data, onClick }: { data: WorkoutPreviewData; onClick?: () => void }) {
  const [y, m, d] = data.date.split('-').map(Number);
  const dateStr = format(new Date(y, m - 1, d), 'd MMMM', { locale: ru });
  const typeLabel = WORKOUT_TYPE_CONFIG[data.workoutType] ?? data.workoutType;

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm w-full ${onClick ? 'cursor-pointer hover:bg-white/10 transition-colors active:scale-[0.99]' : ''}`}
    >
      <div className="px-4 py-3 bg-white/5 border-b border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Тренировка</span>
          <span className="text-xs font-medium text-white/60">{typeLabel}</span>
        </div>
        <div className="text-xs text-white/50 mt-0.5">
          📅 {dateStr} · {data.time}
        </div>
      </div>

      {data.exercises.length > 0 && (
        <div className="px-4 py-3 space-y-1.5">
          {data.exercises.map((ex, i) => (
            <div key={i} className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-white/90 truncate">{ex.name}</span>
              <span className="text-xs text-white/40 shrink-0">
                {ex.duration
                  ? `${ex.duration} мин`
                  : [
                      ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : null,
                      ex.weight ? `${ex.weight} кг` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
              </span>
            </div>
          ))}
        </div>
      )}

      {onClick && (
        <div className="px-4 py-2 border-t border-white/10 text-xs text-white/30 text-center">
          Нажмите для просмотра
        </div>
      )}
    </div>
  );
}
