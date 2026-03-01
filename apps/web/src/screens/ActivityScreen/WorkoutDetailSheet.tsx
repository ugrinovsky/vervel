import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer } from 'recharts';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import { workoutsApi, type WorkoutSet } from '@/api/workouts';
import { exercisesApi } from '@/api/exercises';
import type { WorkoutTimelineEntry } from '@/types/Analytics';
import type { Exercise } from '@/types/Exercise';
import { getWorkoutTypeLabel } from './utils';
import zones from '@/constants/zones';

/* ─── Типы ──────────────────────────────────────────────────────────── */

interface FullWorkout {
  id: number;
  workoutType: string;
  exercises: Array<{
    exerciseId: string;
    type: 'strength' | 'cardio' | 'wod';
    sets?: WorkoutSet[];
    rounds?: number;
    duration?: number;
    wodType?: string;
  }>;
  zonesLoad: Record<string, number>;
  totalIntensity: number;
  totalVolume: number;
  notes?: string;
}

interface Props {
  workout: WorkoutTimelineEntry | null;
  onClose: () => void;
}

/* ─── Константы ─────────────────────────────────────────────────────── */

// Строим маппинг из zones.ts + fallbacks для альтернативных ключей из БД
const ZONE_LABEL_MAP = new Map(zones.map((z) => [z.id, z.label]));
const ZONE_LABEL_FALLBACKS: Record<string, string> = {
  back: 'Спина',
  legs: 'Ноги',
  glutes: 'Ягодицы',
  core: 'Пресс',
  glutealMuscles: 'Ягодицы',
};
function getZoneLabel(id: string): string {
  return ZONE_LABEL_MAP.get(id) ?? ZONE_LABEL_FALLBACKS[id] ?? id;
}

const ZONE_COLORS = [
  'var(--color-emerald-400)',
  'var(--color-emerald-600)',
  'var(--color-emerald-300)',
  'var(--color-emerald-700)',
  'var(--color-emerald-500)',
  'var(--color-emerald-200)',
  'var(--color-emerald-800)',
  'var(--color-emerald-100)',
];

/* ─── Утилиты ───────────────────────────────────────────────────────── */

function formatSet(set: WorkoutSet, type: string): string {
  if (type === 'cardio') {
    if (set.time) {
      const min = Math.floor(set.time / 60);
      const sec = set.time % 60;
      return min > 0 ? `${min} мин ${sec > 0 ? `${sec} с` : ''}`.trim() : `${sec} с`;
    }
    if (set.distance) return `${set.distance} м`;
    return '—';
  }
  if (set.reps && set.weight) return `${set.reps} × ${set.weight} кг`;
  if (set.reps) return `${set.reps} повт.`;
  return '—';
}

function exerciseVolume(sets?: WorkoutSet[]): number {
  return (sets ?? []).reduce((acc, s) => acc + (s.reps ?? 0) * (s.weight ?? 0), 0);
}

function formatVolume(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)} т`;
  return `${v} кг`;
}

/* ─── Компоненты секций ─────────────────────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-(--color_text_muted) uppercase tracking-wide mb-3">
      {children}
    </p>
  );
}

function IntensityBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-(--color_bg_card_hover) overflow-hidden">
        <div
          className="h-full rounded-full bg-linear-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-(--color_text_muted) tabular-nums w-8 text-right">{pct}%</span>
    </div>
  );
}

function ExerciseCard({
  ex,
  exerciseName,
}: {
  ex: FullWorkout['exercises'][number];
  exerciseName: string;
}) {
  const vol = exerciseVolume(ex.sets);
  const isWod = ex.type === 'wod';

  return (
    <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) space-y-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-white leading-tight">{exerciseName}</span>
        {vol > 0 && (
          <span className="text-xs text-emerald-400 font-semibold shrink-0">{formatVolume(vol)}</span>
        )}
      </div>

      {isWod ? (
        <div className="text-xs text-(--color_text_muted)">
          {ex.wodType?.toUpperCase() ?? 'WOD'}
          {ex.rounds ? ` · ${ex.rounds} раундов` : ''}
          {ex.duration ? ` · ${Math.round(ex.duration / 60)} мин` : ''}
        </div>
      ) : ex.sets && ex.sets.length > 0 ? (
        <div className="space-y-1">
          {ex.sets.map((s, i) => (
            <div key={s.id ?? i} className="flex items-center gap-2 text-xs">
              <span className="text-(--color_text_muted) w-10 shrink-0">Сет {i + 1}</span>
              <span className="text-(--color_text_secondary)">{formatSet(s, ex.type)}</span>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-xs text-(--color_text_muted)">Нет данных по подходам</span>
      )}
    </div>
  );
}

function ZonesSection({ zonesLoad }: { zonesLoad: Record<string, number> }) {
  const sorted = Object.entries(zonesLoad)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a);

  if (!sorted.length) return null;

  const chartData = sorted.map(([zone, val]) => ({
    name: getZoneLabel(zone),
    value: Math.round(val * 100),
  }));

  return (
    <div>
      <SectionTitle>Нагрузка по мышцам</SectionTitle>
      <ResponsiveContainer width="100%" height={sorted.length * 34 + 8}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 0, right: 36, left: 0, bottom: 0 }}
        >
          <XAxis type="number" domain={[0, 100]} hide />
          <YAxis
            type="category"
            dataKey="name"
            width={72}
            tick={{ fontSize: 12, fill: 'var(--color_text_muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fill: 'var(--color_text_muted)', formatter: (v: number) => `${v}%` }}>
            {chartData.map((_, i) => (
              <Cell key={i} fill={ZONE_COLORS[i % ZONE_COLORS.length]} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Основной компонент ────────────────────────────────────────────── */

export default function WorkoutDetailSheet({ workout, onClose }: Props) {
  const [fullWorkout, setFullWorkout] = useState<FullWorkout | null>(null);
  const [exerciseMap, setExerciseMap] = useState<Map<string, Exercise>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!workout?.id) return;

    setFullWorkout(null);
    setLoading(true);

    Promise.all([
      workoutsApi.get(workout.id),
      exercisesApi.list(),
    ])
      .then(([res, list]) => {
        setFullWorkout(res.data as FullWorkout);
        setExerciseMap(new Map(list.map((e) => [e.id, e])));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workout?.id]);

  const dateLabel = workout?.date
    ? format(new Date(workout.date.slice(0, 10) + 'T12:00:00'), 'd MMMM yyyy', { locale: ru })
    : '';

  return (
    <BottomSheet
      open={workout !== null}
      onClose={onClose}
      header={
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">
            {getWorkoutTypeLabel(workout?.type ?? 'unknown')}
          </span>
          <span className="text-sm text-(--color_text_muted)">{dateLabel}</span>
        </div>
      }
    >
      {loading && (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && fullWorkout && (
        <div className="space-y-6 pt-2">
          {/* Интенсивность + бейджи */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              {workout?.scheduledWorkoutId != null && (
                <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                  📋 От тренера
                </span>
              )}
            </div>
            <div>
              <span className="text-xs text-(--color_text_muted) mb-1 block">Интенсивность</span>
              <IntensityBar value={fullWorkout.totalIntensity} />
            </div>
          </div>

          {/* Список упражнений */}
          {fullWorkout.exercises.length > 0 && (
            <div>
              <SectionTitle>Упражнения · {fullWorkout.exercises.length}</SectionTitle>
              <div className="space-y-2">
                {fullWorkout.exercises.map((ex, i) => {
                  const name =
                    exerciseMap.get(ex.exerciseId)?.title ??
                    ex.exerciseId.replace(/_/g, ' ');
                  return <ExerciseCard key={i} ex={ex} exerciseName={name} />;
                })}
              </div>
            </div>
          )}

          {/* Нагрузка по мышцам */}
          <ZonesSection zonesLoad={fullWorkout.zonesLoad ?? {}} />

          {/* Итого */}
          <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border)">
            <SectionTitle>Итого</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              {fullWorkout.totalVolume > 0 && (
                <div>
                  <div className="text-lg font-bold text-emerald-400">
                    {formatVolume(fullWorkout.totalVolume)}
                  </div>
                  <div className="text-xs text-(--color_text_muted)">Объём</div>
                </div>
              )}
              <div>
                <div className="text-lg font-bold text-emerald-400">
                  {Math.round(fullWorkout.totalIntensity * 100)}%
                </div>
                <div className="text-xs text-(--color_text_muted)">Интенсивность</div>
              </div>
              <div>
                <div className="text-lg font-bold text-white">
                  {fullWorkout.exercises.length}
                </div>
                <div className="text-xs text-(--color_text_muted)">Упражнений</div>
              </div>
              {fullWorkout.totalVolume > 0 && (
                <div>
                  <div className="text-lg font-bold text-amber-400">
                    {Math.round(fullWorkout.totalVolume * 0.05).toLocaleString()}
                  </div>
                  <div className="text-xs text-(--color_text_muted)">Калорий ~</div>
                </div>
              )}
            </div>
          </div>

          {/* Заметки */}
          {fullWorkout.notes && (
            <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border)">
              <SectionTitle>Заметки</SectionTitle>
              <p className="text-sm text-(--color_text_secondary) leading-relaxed">
                {fullWorkout.notes}
              </p>
            </div>
          )}
        </div>
      )}

      {!loading && !fullWorkout && workout?.id && (
        <div className="text-center py-10 text-(--color_text_muted) text-sm">
          Не удалось загрузить детали
        </div>
      )}

      {!loading && !workout?.id && (
        <div className="space-y-4 pt-2">
          {/* Базовая инфа из timeline без id */}
          <div>
            <span className="text-xs text-(--color_text_muted) mb-1 block">Интенсивность</span>
            <IntensityBar value={workout?.intensity ?? 0} />
          </div>
          {(workout?.volume ?? 0) > 0 && (
            <div>
              <span className="text-xs text-(--color_text_muted)">Объём</span>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">
                {formatVolume(workout?.volume ?? 0)}
              </p>
            </div>
          )}
          <p className="text-xs text-(--color_text_muted)">
            Детали по упражнениям появятся после обновления страницы
          </p>
        </div>
      )}
    </BottomSheet>
  );
}
