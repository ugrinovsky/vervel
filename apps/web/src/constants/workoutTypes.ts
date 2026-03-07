export interface WorkoutTypeOption {
  value: 'bodybuilding' | 'crossfit' | 'cardio';
  label: string;
}

export const workoutTypes: WorkoutTypeOption[] = [
  { value: 'bodybuilding', label: '💪 Бодибилдинг' },
  { value: 'crossfit', label: '🏋️ Кроссфит' },
  { value: 'cardio', label: '🏃 Кардио' },
];

// ── CrossFit WOD types ───────────────────────────────────────────────

export type WodType = 'amrap' | 'fortime' | 'emom' | 'tabata';

export interface WodTypeOption {
  value: WodType;
  label: string;
  hint: string;
}

export const WOD_TYPES: WodTypeOption[] = [
  { value: 'amrap',   label: 'AMRAP',    hint: 'макс. раундов за время' },
  { value: 'fortime', label: 'For Time', hint: 'раунды на время' },
  { value: 'emom',    label: 'EMOM',     hint: 'каждую минуту' },
  { value: 'tabata',  label: 'Tabata',   hint: '20с/10с × раунды' },
];

export const WOD_LABEL: Record<WodType, string> = {
  amrap:   'AMRAP',
  fortime: 'For Time',
  emom:    'EMOM',
  tabata:  'Tabata',
};

// ── Workout type labels (shared across all screens) ──────────────────

export const TYPE_LABELS: Record<string, string> = {
  mixed:        'Смешанная',
  crossfit:     'Кроссфит',
  bodybuilding: 'Бодибилдинг',
  cardio:       'Кардио',
};

// ── Brief exercise summary (for chips / previews) ────────────────────

export interface ExerciseBriefData {
  duration?: number;
  wodType?: string;
  timeCap?: number;
  rounds?: number;
  reps?: number;
  sets?: number;
  setsDetail?: { reps: number }[];
}

export function exerciseBrief(ex: ExerciseBriefData): string {
  if (ex.duration != null) return `${ex.duration} мин`;
  if (ex.wodType) {
    const wod = WOD_LABEL[ex.wodType as WodType] ?? ex.wodType.toUpperCase();
    const ctx = ex.timeCap ? ` ${ex.timeCap}мин` : ex.rounds ? ` ${ex.rounds}р` : '';
    const reps = ex.reps ? ` · ${ex.reps}×` : '';
    return wod + ctx + reps;
  }
  const count = ex.setsDetail?.length ?? ex.sets;
  const reps = ex.setsDetail?.[0]?.reps ?? ex.reps;
  if (count && reps) return `${count}×${reps}`;
  return '';
}
