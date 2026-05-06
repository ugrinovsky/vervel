// ── Workout Type Config (единый источник истины для лейблов) ─────────

export const DEFAULT_WORKOUT_TYPE = 'bodybuilding' as const;

export const WORKOUT_TYPE_CONFIG: Record<string, string> = {
  crossfit:     'Кроссфит',
  bodybuilding: 'Силовая',
  cardio:       'Кардио',
  intro:        'Вводная',
  rest_day:     'Выходной',
};

// ── CrossFit WOD types ───────────────────────────────────────────────

export const WOD_CONFIG = {
  amrap:   { label: 'AMRAP',    hint: 'макс. раундов за время' },
  fortime: { label: 'For Time', hint: 'раунды на время' },
  emom:    { label: 'EMOM',     hint: 'каждую минуту' },
  tabata:  { label: 'Tabata',   hint: '20с/10с × раунды' },
} as const;

export type WodType = keyof typeof WOD_CONFIG;

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

export function isWodType(s: string): s is WodType {
  return Object.prototype.hasOwnProperty.call(WOD_CONFIG, s);
}

/** Стабильный порядок для UI (те же ключи, что и в {@link WOD_CONFIG}). */
const WOD_TYPE_ORDER: string[] = ['amrap', 'fortime', 'emom', 'tabata'];
export const WOD_TYPES: readonly WodType[] = WOD_TYPE_ORDER.filter(isWodType);

export function exerciseBrief(ex: ExerciseBriefData): string {
  if (ex.duration != null) return `${ex.duration} мин`;
  if (ex.wodType) {
    const wod = (isWodType(ex.wodType) ? WOD_CONFIG[ex.wodType].label : ex.wodType.toUpperCase());
    const ctx = ex.timeCap ? ` ${ex.timeCap}мин` : ex.rounds ? ` ${ex.rounds}р` : '';
    const reps = ex.reps ? ` · ${ex.reps}×` : '';
    return wod + ctx + reps;
  }
  const count = ex.setsDetail?.length ?? ex.sets;
  const reps = ex.setsDetail?.[0]?.reps ?? ex.reps;
  if (count && reps) return `${count}×${reps}`;
  return '';
}
