/**
 * WorkoutFormBase — shared form core for all workout creation/editing.
 *
 * Used by:
 *   - WorkoutForm (athlete logs own workout, full-page Screen)
 *   - WorkoutInlineForm (trainer assigns workout via BottomSheet)
 *
 * Manages: date, time, workoutType, notes, exercises, template selection.
 * Callers supply: submit logic, optional assignee UI (headerSlot), optional templates list.
 */
import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import WorkoutTypeTabs, { type WorkoutType } from '@/components/WorkoutTypeTabs';
import WorkoutDateTimeRow from '@/components/WorkoutDateTimeRow';
import SectionLabel from '@/components/SectionLabel';
import WorkoutExercisesEditor, {
  type WorkoutExercisesEditorHandle,
} from '@/components/WorkoutExercisesEditor/WorkoutExercisesEditor';
import AiWorkoutGenerator from '@/components/AiWorkoutGenerator/AiWorkoutGenerator';
import AiWorkoutRecognizer from '@/components/AiWorkoutRecognizer/AiWorkoutRecognizer';
import AiWorkoutTextParser from '@/components/AiWorkoutTextParser/AiWorkoutTextParser';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  SparklesIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import AccentButton from '@/components/ui/AccentButton';
import GhostButton from '@/components/ui/GhostButton';
import type { ExerciseData, WorkoutTemplate } from '@/api/trainer';
import type {
  AiParsedWorkoutExercisePayload,
  AiRecognizedWorkoutResult,
  AiTextParseUiPayload,
  AiWorkoutResult,
} from '@/api/ai';
import { WORKOUT_TYPE_CONFIG, DEFAULT_WORKOUT_TYPE } from '@/constants/workoutTypes';
import { nowRoundedToHour, today, parseTimeString, parseLocalDate, toDateKey } from '@/utils/date';
import {
  convertExercisesForType,
  convertAiExercises,
  convertAiResult,
} from './workoutTypeConversion';
import { workoutsApi } from '@/api/workouts';
import { profileApi } from '@/api/profile';
import { exerciseIdForDisplay } from '@/utils/exerciseIdForDisplay';
import { isRecord } from '@/utils/typeGuards';

function parseDraftDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  // New format: local date key "YYYY-MM-DD"
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return parseLocalDate(value);
  // Legacy format: ISO string (often produced by Date#toISOString(), i.e. UTC).
  // Parse as Date first (applies timezone), then take local Y-M-D to avoid day drift on reload.
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export interface WorkoutFormData {
  date: Date;
  time: Date;
  workoutType: WorkoutType;
  notes: string;
  exercises: ExerciseData[];
  /** Set when user picked a template — passed through to caller's submit handler */
  selectedTemplateId: number | null;
}

interface WorkoutFormDraft {
  workoutType: WorkoutType;
  notes: string;
  exercises: ExerciseData[];
  date: string;
  time: string;
  savedAt: number;
}

function isWorkoutFormDraft(v: unknown): v is WorkoutFormDraft {
  if (!isRecord(v)) return false;
  const o = v;
  if (typeof o.savedAt !== 'number') return false;
  if (typeof o.notes !== 'string') return false;
  if (typeof o.date !== 'string') return false;
  if (typeof o.time !== 'string') return false;
  if (!Array.isArray(o.exercises)) return false;
  const wt = o.workoutType;
  if (wt !== 'crossfit' && wt !== 'bodybuilding' && wt !== 'cardio') return false;
  return true;
}

function loadLocalDraft(key: string): WorkoutFormDraft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isWorkoutFormDraft(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

interface Props {
  initialDate?: Date;
  initialTime?: Date;
  initialType?: WorkoutType;
  initialNotes?: string;
  initialExercises?: ExerciseData[];

  /** If provided, enables localStorage + DB auto-save as a draft */
  storageKey?: string;

  /** If provided, renders a template picker section */
  templates?: WorkoutTemplate[];

  /** Rendered between date/type row and exercises (e.g. assignee picker) */
  headerSlot?: React.ReactNode;

  submitLabel?: string;
  notesLabel?: string;
  notesPlaceholder?: string;

  /** Назначение тренером: в редакторе упражнений не показываем веса (их вводит атлет) */
  hideExerciseWeights?: boolean;

  /** Скрыть ИИ (фото/текст/генерация) — онбординг и «быстрый» ввод */
  hideAiAssist?: boolean;

  /**
   * Компактный «лайт» UI для первого шага (онбординг): один главный путь для ИИ,
   * остальное под раскрытием, заметки свёрнуты по умолчанию.
   */
  lightOnboarding?: boolean;

  /** Called with form data on save. Should handle toasts and throw on hard error. */
  onSubmit: (data: WorkoutFormData) => Promise<void>;
  onCancel?: () => void;
}

export default function WorkoutFormBase({
  initialDate,
  initialTime,
  initialType = DEFAULT_WORKOUT_TYPE,
  initialNotes = '',
  initialExercises = [],
  storageKey,
  templates,
  headerSlot,
  submitLabel = 'Сохранить',
  notesLabel = 'Заметки',
  notesPlaceholder = 'Общие заметки...',
  hideExerciseWeights = false,
  hideAiAssist = false,
  lightOnboarding = false,
  onSubmit,
  onCancel,
}: Props) {
  // ── Draft state ───────────────────────────────────────────────────
  const localDraft = storageKey ? loadLocalDraft(storageKey) : null;
  const hasMeaningfulDraft =
    !!localDraft && (localDraft.exercises.length > 0 || !!localDraft.notes);

  const [draftRestored, setDraftRestored] = useState(hasMeaningfulDraft);
  // When user clears/resets the draft, there may already be an in-flight getDraft() request.
  // This flag prevents that stale response from re-applying old date/time/notes/exercises.
  const ignoreDbDraftRef = useRef(false);
  /** Latest values for DB-vs-local merge (effect intentionally keyed only by storageKey). */
  const dbDraftMergeRef = useRef({ localSavedAt: 0, hasInitialDate: false });
  useLayoutEffect(() => {
    dbDraftMergeRef.current = {
      localSavedAt: localDraft?.savedAt ?? 0,
      hasInitialDate: !!initialDate,
    };
  }, [localDraft?.savedAt, initialDate]);

  // ── Form state (initialized from draft or props) ──────────────────
  const [date, setDate] = useState<Date>(() => {
    if (initialDate) return initialDate;
    const draftDate = parseDraftDate(localDraft?.date);
    if (draftDate) return draftDate;
    return today();
  });

  const [time, setTime] = useState<Date>(() => {
    if (initialTime) return initialTime;
    if (localDraft?.time) return parseTimeString(localDraft.time);
    return nowRoundedToHour();
  });

  const [workoutType, setWorkoutType] = useState<WorkoutType>(
    localDraft?.workoutType ?? initialType
  );
  const [notes, setNotes] = useState(localDraft?.notes ?? initialNotes);
  const [exercises, setExercises] = useState<ExerciseData[]>(
    localDraft?.exercises ?? initialExercises
  );
  const [saving, setSaving] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [profileWeight, setProfileWeight] = useState<number | undefined>();
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [aiPhotoUrl, setAiPhotoUrl] = useState<string | null>(null);
  const [aiPhotoExpanded, setAiPhotoExpanded] = useState(false);
  /** Только для распознавания по фото: требуем явный выбор типа тренировки пользователем */
  const [aiPhotoNeedsTypePick, setAiPhotoNeedsTypePick] = useState(false);

  const exercisesEditorRef = useRef<WorkoutExercisesEditorHandle>(null);
  const [liteToolbarMoreOpen, setLiteToolbarMoreOpen] = useState(false);
  const [notesLiteOpen, setNotesLiteOpen] = useState(() => {
    if (!lightOnboarding) return true;
    const fromDraft = localDraft?.notes?.trim() ?? '';
    return fromDraft.length > 0 || initialNotes.trim().length > 0;
  });

  // ── Auto-save to localStorage (immediate) + DB (debounced) ───────
  const dbSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!storageKey) return;

    const draft: WorkoutFormDraft = {
      workoutType,
      notes,
      exercises,
      // Store local calendar day (no timezone) to avoid UTC drift on reload.
      date: toDateKey(date),
      time: `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`,
      savedAt: Date.now(),
    };

    // Immediate localStorage save
    localStorage.setItem(storageKey, JSON.stringify(draft));

    // Debounced DB save (3 seconds after last change)
    if (dbSaveTimer.current) clearTimeout(dbSaveTimer.current);
    dbSaveTimer.current = setTimeout(() => {
      workoutsApi.saveDraft(draft).catch(() => {
        /* silent */
      });
    }, 3000);

    return () => {
      if (dbSaveTimer.current) clearTimeout(dbSaveTimer.current);
    };
  }, [workoutType, notes, exercises, date, time, storageKey]);

  // ── Load draft from DB on mount (in background, update if newer) ──
  useEffect(() => {
    if (!storageKey) return;
    workoutsApi
      .getDraft()
      .then((res) => {
        if (ignoreDbDraftRef.current) return;
        const rawDraft = res.data?.data;
        if (!isWorkoutFormDraft(rawDraft)) return;
        const dbDraft = rawDraft;
        const { localSavedAt, hasInitialDate } = dbDraftMergeRef.current;
        if (dbDraft.savedAt > localSavedAt) {
          const dbHasMeaningful =
            (dbDraft.exercises?.length ?? 0) > 0 || !!dbDraft.notes?.trim();
          // DB draft is newer — silently apply it
          if (dbDraft.workoutType) setWorkoutType(dbDraft.workoutType);
          if (dbDraft.notes != null) setNotes(dbDraft.notes);
          if (dbDraft.exercises?.length) setExercises(dbDraft.exercises);
          // Important: don't override today's date with an "empty" DB draft.
          if (dbHasMeaningful && dbDraft.date && !hasInitialDate) {
            const d = parseDraftDate(dbDraft.date);
            if (d) setDate(d);
          }
          if (dbHasMeaningful && dbDraft.time) setTime(parseTimeString(dbDraft.time));
          if (dbHasMeaningful) setDraftRestored(true);
        }
      })
      .catch(() => {
        /* silent */
      });
  }, [storageKey]);

  // ── Clear draft (localStorage + DB) ──────────────────────────────
  const clearDraft = () => {
    if (!storageKey) return;
    ignoreDbDraftRef.current = true;
    localStorage.removeItem(storageKey);
    workoutsApi.clearDraft().catch(() => {
      /* silent */
    });
    setDraftRestored(false);
  };

  // ── Reset form to initial state ───────────────────────────────────
  const resetToInitial = () => {
    clearDraft();
    setWorkoutType(initialType);
    setNotes(initialNotes);
    setExercises(initialExercises);
    setDate(initialDate ?? today());
    setTime(initialTime ?? nowRoundedToHour());
    setSelectedTemplateId(null);
    setAiGenerated(false);
    setAiPhotoExpanded(false);
    setLiteToolbarMoreOpen(false);
    setNotesLiteOpen(!lightOnboarding || initialNotes.trim().length > 0);
    setAiPhotoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const hasFormContent =
    notes.trim().length > 0 ||
    exercises.length > 0 ||
    selectedTemplateId != null ||
    aiPhotoUrl != null;

  const handleClearForm = () => {
    if (
      !window.confirm('Очистить форму? Все поля и черновик будут сброшены — это нельзя отменить.')
    ) {
      return;
    }
    resetToInitial();
    toast.success('Форма очищена');
  };

  // ── Fetch body weight (для веса в подходах и «вес тела») ───────────
  useEffect(() => {
    if (hideExerciseWeights) return;
    profileApi
      .getMeasurements('body_weight', 1)
      .then((res) => {
        const latest = res.data?.data?.[0];
        if (latest) setProfileWeight(latest.value);
      })
      .catch(() => {});
  }, [hideExerciseWeights]);

  // ── Type change with exercise normalization ───────────────────────

  const handleWorkoutTypeChange = (newType: WorkoutType) => {
    if (aiPhotoNeedsTypePick) setAiPhotoNeedsTypePick(false);
    if (exercises.length === 0) {
      setWorkoutType(newType);
      return;
    }

    const oldType = workoutType;
    setWorkoutType(newType);
    setExercises((prev) => convertExercisesForType(prev, oldType, newType));

    if (newType === 'cardio') {
      toast('Подходы убраны — для кардио остадлена длительность (20 мин)', { icon: '🏃' });
    } else if (oldType === 'cardio') {
      toast(
        newType === 'crossfit'
          ? 'Длительность убрана — добавлены повторы (10)'
          : 'Длительность убрана — добавлены подходы (3×10)',
        { icon: '💪' }
      );
    } else {
      toast(
        `Тип изменён на «${WORKOUT_TYPE_CONFIG[newType] ?? newType}». Упражнения адаптированы.`,
        { icon: 'ℹ️' }
      );
    }
  };

  // ── AI result handler ─────────────────────────────────────────────

  const handleAiGeneratedResult = (result: AiWorkoutResult, photoUrl?: string) => {
    setWorkoutType(result.workoutType);
    const converted = convertAiResult(result);
    setExercises(converted);
    setAiGenerated(true);
    setSelectedTemplateId(null);
    if (photoUrl) {
      setAiPhotoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return photoUrl;
      });
      setAiPhotoExpanded(false);
    }
    toast.success(`ИИ сгенерировал ${converted.length} упражнений`);
  };

  const handleAiRecognizedResult = (result: AiRecognizedWorkoutResult, photoUrl?: string) => {
    // Тип тренировки выбирается пользователем вручную (вкладками сверху).
    const converted = convertAiExercises(result.exercises, workoutType);
    setExercises(converted);
    setAiGenerated(true);
    setSelectedTemplateId(null);
    setAiPhotoNeedsTypePick(true);
    if (photoUrl) {
      setAiPhotoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return photoUrl;
      });
      setAiPhotoExpanded(false);
    }
    toast.success(`ИИ распознал ${converted.length} упражнений`);
  };

  const handleAiTextParsed = (payload: AiTextParseUiPayload) => {
    const nameMap = new Map(payload.previewItems.map((item) => [item.exerciseId, item.name]));
    const baseConverted: ExerciseData[] = payload.exercises.map((ex: AiParsedWorkoutExercisePayload) => ({
      exerciseId: ex.exerciseId,
      name:
        nameMap.get(ex.exerciseId) ??
        exerciseIdForDisplay(String(ex.exerciseId)),
      zones: Array.isArray(ex.zones) ? ex.zones : undefined,
      zoneWeights:
        ex.zoneWeights && typeof ex.zoneWeights === 'object' ? ex.zoneWeights : undefined,
      bodyweight: ex.bodyweight,
      setsDetail: ex.sets?.map((s) => ({ reps: s.reps ?? 10, weight: s.weight })) ?? [],
      sets: ex.sets?.length ?? 3,
      blockId: ex.blockId,
      duration: ex.sets?.[0]?.time ? Math.round(Number(ex.sets?.[0]?.time ?? 0) / 60) : undefined,
    }));

    // С бэка "по тексту" приходит силовой формат по умолчанию (bodybuilding),
    // а тип тренировки пользователь выбирает сам вкладками — поэтому конвертируем под текущий.
    const converted = convertExercisesForType(baseConverted, 'bodybuilding', workoutType);

    setExercises(converted);
    setAiGenerated(true);
    setSelectedTemplateId(null);
    if (payload.warning) toast(payload.warning, { icon: '⚠️' });
    else toast.success(`ИИ разобрал ${baseConverted.length} упражнений`);
  };

  // ── Template picker ───────────────────────────────────────────────

  const applyTemplate = (template: WorkoutTemplate) => {
    const normalized =
      template.exercises?.map((ex) => {
        if (template.workoutType === 'bodybuilding' && !ex.setsDetail?.length) {
          return {
            ...ex,
            setsDetail: Array.from({ length: ex.sets ?? 3 }, () => ({
              reps: ex.reps ?? 10,
              weight: ex.weight,
            })),
          };
        }
        return ex;
      }) ?? [];
    setWorkoutType(template.workoutType);
    setExercises(normalized);
    setAiGenerated(false);
    setSelectedTemplateId(template.id);
    setShowTemplatePicker(false);
  };

  // ── Submit ────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (aiPhotoNeedsTypePick) {
      toast.error('Выберите тип тренировки (Силовая / Кроссфит / Кардио)');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ date, time, workoutType, notes, exercises, selectedTemplateId });
      clearDraft();
    } catch {
      // onSubmit handles its own error toasts
    } finally {
      setSaving(false);
    }
  };

  /* ─── Render ─────────────────────────────────────────────────────── */

  const rootGap = lightOnboarding ? 'space-y-4' : 'space-y-5';

  const aiToolbarBlock = (
    <div className="flex flex-wrap gap-3 mb-1">
      <AiWorkoutRecognizer
        onResult={handleAiRecognizedResult}
        triggerContent={
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-[13px] leading-none">📸</span>
              <span>Распознать по фото</span>
            </span>
          </>
        }
      />
      <AiWorkoutTextParser
        onResult={handleAiTextParsed}
        triggerClassName="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
        triggerContent={
          <>
            <span>📝</span>
            Распознать по тексту
          </>
        }
      />
      <AiWorkoutGenerator onResult={handleAiGeneratedResult} />
      <span className="text-xs text-white/40 self-center">· 10₽</span>
    </div>
  );

  return (
    <div className={rootGap}>
      {/* Draft banner */}
      {draftRestored && storageKey && (
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <span className="text-sm text-amber-300">Восстановлен черновик</span>
          <button
            type="button"
            onClick={resetToInitial}
            className="text-xs text-amber-400 hover:text-amber-200 font-medium transition-colors underline shrink-0"
          >
            Сбросить
          </button>
        </div>
      )}

      {/* Когда + тип */}
      {lightOnboarding ? (
        <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] via-(--color_bg_card) to-violet-500/[0.04] p-3.5 space-y-3 shadow-lg shadow-black/20">
          <div>
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-1.5">
              Когда
            </p>
            <WorkoutDateTimeRow
              date={date}
              time={time}
              onDateChange={setDate}
              onTimeChange={setTime}
            />
          </div>
          <div className="h-px bg-white/10" />
          <div>
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-1.5">
              Тип тренировки
            </p>
            <WorkoutTypeTabs
              value={aiPhotoNeedsTypePick ? null : workoutType}
              onChange={handleWorkoutTypeChange}
            />
            {aiPhotoNeedsTypePick && (
              <p className="mt-2 text-[11px] text-amber-300/90">
                После распознавания по фото выберите тип тренировки вручную.
              </p>
            )}
          </div>
        </div>
      ) : (
        <>
          <div>
            <SectionLabel>Когда</SectionLabel>
            <WorkoutDateTimeRow
              date={date}
              time={time}
              onDateChange={setDate}
              onTimeChange={setTime}
            />
          </div>

          <div>
            <SectionLabel>Тип тренировки</SectionLabel>
            <WorkoutTypeTabs
              value={aiPhotoNeedsTypePick ? null : workoutType}
              onChange={handleWorkoutTypeChange}
            />
            {aiPhotoNeedsTypePick && (
              <p className="mt-2 text-[11px] text-amber-300/90">
                После распознавания по фото выберите тип тренировки вручную.
              </p>
            )}
          </div>
        </>
      )}

      {/* headerSlot — e.g. assignee picker */}
      {headerSlot}

      {/* Шаблон */}
      {templates && templates.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>Шаблон</SectionLabel>
            {selectedTemplateId && (
              <button
                onClick={() => {
                  setSelectedTemplateId(null);
                  setExercises([]);
                }}
                className="text-[10px] text-(--color_text_muted) hover:text-white transition-colors"
              >
                Сбросить
              </button>
            )}
          </div>
          <button
            onClick={() => setShowTemplatePicker((v) => !v)}
            className={`w-full flex items-center justify-between py-2.5 px-3 rounded-xl text-sm text-left transition-colors border ${
              selectedTemplateId
                ? 'bg-(--color_primary_light)/10 border-(--color_primary_light) text-white'
                : 'bg-(--color_bg_card_hover) border-(--color_border) text-(--color_text_muted) hover:text-white'
            }`}
          >
            <span>
              {selectedTemplateId
                ? `📋 ${templates.find((t) => t.id === selectedTemplateId)?.name}`
                : '📋 Выбрать шаблон'}
            </span>
            {showTemplatePicker ? (
              <ChevronUpIcon className="w-4 h-4 shrink-0 opacity-50" />
            ) : (
              <ChevronDownIcon className="w-4 h-4 shrink-0 opacity-50" />
            )}
          </button>
          {showTemplatePicker && (
            <div className="mt-1 rounded-xl bg-(--color_bg_card_hover) divide-y divide-(--color_border) border border-(--color_border)">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left text-white hover:bg-(--color_border) transition-colors"
                >
                  <span className="shrink-0 text-xs px-1.5 py-0.5 rounded bg-(--color_primary_light)">
                    {t.workoutType === 'crossfit'
                      ? 'CF'
                      : t.workoutType === 'bodybuilding'
                        ? 'Сил'
                        : 'Кард'}
                  </span>
                  <span className="flex-1 truncate">{t.name}</span>
                  {t.exercises?.length > 0 && (
                    <span className="text-xs text-(--color_text_muted) shrink-0">
                      {t.exercises.length} упр.
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Упражнения */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
            Упражнения{exercises.length > 0 && ` (${exercises.length})`}
          </p>
          {aiGenerated && (
            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <SparklesIcon className="w-3 h-3" />
              Сгенерировано через ИИ
            </span>
          )}
        </div>

        {/* Пустое состояние: ИИ или короткая подсказка */}
        {exercises.length === 0 && !aiPhotoUrl && (
          <div
            className={`rounded-2xl mb-3 space-y-2 ${
              lightOnboarding && !hideAiAssist
                ? 'relative overflow-hidden border border-emerald-400/20 bg-gradient-to-br from-emerald-500/15 via-(--color_bg_card) to-violet-500/10 p-4 shadow-[0_0_40px_-12px_rgba(16,185,129,0.35)]'
                : lightOnboarding && hideAiAssist
                  ? 'border border-white/10 bg-white/[0.02] p-3.5'
                  : 'bg-(--color_bg_card) border border-(--color_border) p-4'
            }`}
          >
            {hideAiAssist ? (
              <div
                className={`flex items-center gap-3 ${lightOnboarding ? 'p-1' : 'p-2'}`}
              >
                <span className="text-xl shrink-0">✏️</span>
                <span className="flex-1 min-w-0 text-sm text-(--color_text_muted) leading-snug">
                  {lightOnboarding
                    ? 'Выберите упражнения в списке ниже — пара штук достаточно, чтобы увидеть прогресс.'
                    : 'Добавьте одно или два упражнения из каталога ниже — так вы быстрее увидите прогресс в календаре.'}
                </span>
              </div>
            ) : lightOnboarding ? (
              <>
                <p className="text-[11px] font-medium text-emerald-200/90 tracking-wide">
                  Через ИИ
                </p>
                <AiWorkoutTextParser
                  onResult={handleAiTextParsed}
                  triggerClassName="w-full flex items-center gap-3 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500/25 to-teal-500/15 border border-emerald-400/35 text-left shadow-md shadow-emerald-950/40 hover:from-emerald-500/35 hover:border-emerald-300/45 transition-all"
                  triggerContent={
                    <>
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/25 text-lg">
                        📝
                      </span>
                      <span className="flex-1 min-w-0 text-left">
                        <span className="block text-sm font-semibold text-white">
                          Вставить текст программы
                        </span>
                        <span className="block text-xs text-white/60 mt-0.5">
                          ИИ разберёт упражнения и подходы
                        </span>
                      </span>
                      <span className="text-emerald-300/80 text-lg shrink-0">→</span>
                    </>
                  }
                />
                <p className="text-[10px] font-medium text-white/35 uppercase tracking-wider pt-1">
                  Или так же через ИИ
                </p>
                <div className="space-y-2">
                  <AiWorkoutRecognizer
                    onResult={handleAiRecognizedResult}
                    triggerClassName="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/[0.07] transition-colors"
                    triggerContent={
                      <>
                        <span className="text-lg shrink-0">📸</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-white">
                            Распознать по фото
                          </span>
                          <span className="block text-xs text-(--color_text_muted)">
                            Загрузите снимок программы
                          </span>
                        </span>
                        <span className="text-emerald-400/60 text-base shrink-0">→</span>
                      </>
                    }
                  />
                  <AiWorkoutGenerator
                    onResult={handleAiGeneratedResult}
                    triggerClassName="w-full flex items-center gap-3 p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/25 text-left hover:bg-violet-500/15 transition-colors"
                    triggerContent={
                      <>
                        <span className="text-lg shrink-0">✨</span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-white">
                            Сгенерировать по описанию
                          </span>
                          <span className="block text-xs text-(--color_text_muted)">
                            Опишите желаемую тренировку
                          </span>
                        </span>
                        <span className="text-violet-400/60 text-base shrink-0">→</span>
                      </>
                    }
                  />
                </div>
                <div className="h-px bg-white/10 my-1" />
                <button
                  type="button"
                  onClick={() => exercisesEditorRef.current?.openExercisePicker()}
                  className="group flex w-full cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-2.5 text-left transition-colors hover:bg-white/[0.08] hover:border-white/20 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40"
                >
                  <span className="text-lg shrink-0" aria-hidden>
                    ✏️
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-white">Добрать из каталога</span>
                    <span className="mt-0.5 block text-xs text-(--color_text_muted)">
                      Если чего-то не хватает — вручную по одному
                    </span>
                  </span>
                  <span
                    className="shrink-0 text-base text-white/35 transition-colors group-hover:text-emerald-400/80"
                    aria-hidden
                  >
                    →
                  </span>
                </button>
              </>
            ) : (
              <>
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-3">
                  Как добавить упражнения?
                </p>

                <AiWorkoutRecognizer
                  onResult={handleAiRecognizedResult}
                  triggerClassName="w-full flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-left hover:bg-emerald-500/15 transition-colors"
                  triggerContent={
                    <>
                      <span className="text-xl shrink-0">📸</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-white">
                          Распознать изображение
                        </span>
                        <span className="block text-xs text-(--color_text_muted)">
                          ИИ распознает по фото
                        </span>
                      </span>
                      <span className="text-emerald-400/60 text-base shrink-0">→</span>
                    </>
                  }
                />

                <AiWorkoutTextParser onResult={handleAiTextParsed} />

                <AiWorkoutGenerator
                  onResult={handleAiGeneratedResult}
                  triggerClassName="w-full flex items-center gap-3 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-left hover:bg-violet-500/15 transition-colors"
                  triggerContent={
                    <>
                      <span className="text-xl shrink-0">✨</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-white">
                          Сгенерировать по описанию
                        </span>
                        <span className="block text-xs text-(--color_text_muted)">
                          ИИ сам подберёт упражнения, подходы и веса
                        </span>
                      </span>
                      <span className="text-violet-400/60 text-base shrink-0">→</span>
                    </>
                  }
                />

                <div className="flex items-center gap-3 p-3 rounded-xl bg-(--color_bg_card_hover) border border-(--color_border)">
                  <span className="text-xl shrink-0">✏️</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium text-white/70">Вручную из каталога</span>
                    <span className="block text-xs text-(--color_text_muted)">
                      Добавьте упражнения по одному ниже
                    </span>
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {aiPhotoUrl && (
          <div className="rounded-xl border border-white/10 overflow-hidden mb-3">
            <button
              type="button"
              onClick={() => setAiPhotoExpanded((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs text-white/50 hover:text-white/70 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <PhotoIcon className="w-3.5 h-3.5" />
                Исходное фото
              </span>
              {aiPhotoExpanded ? (
                <ChevronUpIcon className="w-3.5 h-3.5" />
              ) : (
                <ChevronDownIcon className="w-3.5 h-3.5" />
              )}
            </button>
            {aiPhotoExpanded && (
              <img
                src={aiPhotoUrl}
                alt="Исходное фото тренировки"
                className="w-full max-h-[70vh] object-contain bg-black/20"
              />
            )}
          </div>
        )}

        <WorkoutExercisesEditor
          ref={exercisesEditorRef}
          workoutType={workoutType}
          exercises={exercises}
          profileWeight={profileWeight}
          hideWeights={hideExerciseWeights}
          hideAddExerciseButton={
            lightOnboarding && !hideAiAssist && exercises.length === 0
          }
          onChange={(exs) => {
            setExercises(exs);
            setAiGenerated(false);
          }}
          toolbar={
            hideAiAssist
              ? undefined
              : exercises.length > 0 && !aiGenerated
                ? lightOnboarding
                  ? (
                      <div className="mb-1">
                        <button
                          type="button"
                          onClick={() => setLiteToolbarMoreOpen((v) => !v)}
                          className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-white/55 hover:text-white/75 transition-colors"
                        >
                          <span>Добавить ещё через ИИ (фото, текст, генерация · 10₽)</span>
                          {liteToolbarMoreOpen ? (
                            <ChevronUpIcon className="w-3.5 h-3.5 shrink-0 opacity-60" />
                          ) : (
                            <ChevronDownIcon className="w-3.5 h-3.5 shrink-0 opacity-60" />
                          )}
                        </button>
                        {liteToolbarMoreOpen ? aiToolbarBlock : null}
                      </div>
                    )
                  : aiToolbarBlock
                : undefined
          }
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-1">
        {/* Комментарий — только текст; разбор программы — через «Распознать по тексту» */}
        <div>
          {lightOnboarding ? (
            <>
              <button
                type="button"
                onClick={() => setNotesLiteOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-2 py-1 text-left"
              >
                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
                  {notesLabel}
                </span>
                {notesLiteOpen ? (
                  <ChevronUpIcon className="w-4 h-4 text-white/40" />
                ) : (
                  <ChevronDownIcon className="w-4 h-4 text-white/40" />
                )}
              </button>
              {notesLiteOpen && (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={notesPlaceholder}
                  rows={3}
                  className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors resize-none placeholder:text-(--color_text_muted) leading-relaxed mt-1"
                />
              )}
            </>
          ) : (
            <>
              <SectionLabel>{notesLabel}</SectionLabel>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={notesPlaceholder}
                rows={4}
                className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors resize-none placeholder:text-(--color_text_muted) leading-relaxed"
              />
            </>
          )}
        </div>

        {hasFormContent && (
          <GhostButton
            variant="accent-soft"
            onClick={handleClearForm}
            disabled={saving}
            className="text-sm"
          >
            Очистить форму
          </GhostButton>
        )}
        <div className="flex gap-2">
          {onCancel && (
            <GhostButton variant="solid" onClick={onCancel} disabled={saving}>
              Отмена
            </GhostButton>
          )}
          <AccentButton
            onClick={handleSubmit}
            disabled={saving}
            loading={saving}
            loadingText="Сохранение..."
            className="flex-1 font-semibold"
          >
            {submitLabel}
          </AccentButton>
        </div>
      </div>
    </div>
  );
}
