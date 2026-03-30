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
import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import WorkoutTypeTabs, { type WorkoutType } from '@/components/WorkoutTypeTabs';
import WorkoutDateTimeRow from '@/components/WorkoutDateTimeRow';
import SectionLabel from '@/components/SectionLabel';
import WorkoutExercisesEditor from '@/components/WorkoutExercisesEditor/WorkoutExercisesEditor';
import AiWorkoutGenerator from '@/components/AiWorkoutGenerator/AiWorkoutGenerator';
import AiWorkoutRecognizer from '@/components/AiWorkoutRecognizer/AiWorkoutRecognizer';
import { ChevronDownIcon, ChevronUpIcon, SparklesIcon } from '@heroicons/react/24/outline';
import AccentButton from '@/components/ui/AccentButton';
import GhostButton from '@/components/ui/GhostButton';
import type { ExerciseData, WorkoutTemplate } from '@/api/trainer';
import type { AiWorkoutResult } from '@/api/ai';
import { WORKOUT_TYPE_CONFIG } from '@/constants/workoutTypes';
import { convertExercisesForType, convertAiResult } from './workoutTypeConversion';
import { workoutsApi } from '@/api/workouts';

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

function loadLocalDraft(key: string): WorkoutFormDraft | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as WorkoutFormDraft;
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

  /** Called with form data on save. Should handle toasts and throw on hard error. */
  onSubmit: (data: WorkoutFormData) => Promise<void>;
  onCancel?: () => void;
}

export default function WorkoutFormBase({
  initialDate,
  initialTime,
  initialType = 'bodybuilding',
  initialNotes = '',
  initialExercises = [],
  storageKey,
  templates,
  headerSlot,
  submitLabel = 'Сохранить',
  notesLabel = 'Заметки',
  notesPlaceholder = 'Общие заметки...',
  onSubmit,
  onCancel,
}: Props) {
  // ── Draft state ───────────────────────────────────────────────────
  const localDraft = storageKey ? loadLocalDraft(storageKey) : null;
  const hasMeaningfulDraft = !!localDraft && (localDraft.exercises.length > 0 || !!localDraft.notes);

  const [draftRestored, setDraftRestored] = useState(hasMeaningfulDraft);

  // ── Form state (initialized from draft or props) ──────────────────
  const [date, setDate] = useState<Date>(() => {
    if (initialDate) return initialDate;
    if (localDraft?.date) return new Date(localDraft.date);
    return new Date();
  });

  const [time, setTime] = useState<Date>(() => {
    if (localDraft?.time) {
      const d = new Date();
      const [h, m] = localDraft.time.split(':').map(Number);
      d.setHours(h, m, 0, 0);
      return d;
    }
    if (initialTime) return initialTime;
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });

  const [workoutType, setWorkoutType] = useState<WorkoutType>(localDraft?.workoutType ?? initialType);
  const [notes, setNotes] = useState(localDraft?.notes ?? initialNotes);
  const [exercises, setExercises] = useState<ExerciseData[]>(localDraft?.exercises ?? initialExercises);
  const [saving, setSaving] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

  // ── Auto-save to localStorage (immediate) + DB (debounced) ───────
  const dbSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!storageKey) return;

    const draft: WorkoutFormDraft = {
      workoutType,
      notes,
      exercises,
      date: date.toISOString(),
      time: `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`,
      savedAt: Date.now(),
    };

    // Immediate localStorage save
    localStorage.setItem(storageKey, JSON.stringify(draft));

    // Debounced DB save (3 seconds after last change)
    if (dbSaveTimer.current) clearTimeout(dbSaveTimer.current);
    dbSaveTimer.current = setTimeout(() => {
      workoutsApi.saveDraft(draft).catch(() => {/* silent */});
    }, 3000);

    return () => {
      if (dbSaveTimer.current) clearTimeout(dbSaveTimer.current);
    };
  }, [workoutType, notes, exercises, date, time, storageKey]);

  // ── Load draft from DB on mount (in background, update if newer) ──
  useEffect(() => {
    if (!storageKey) return;
    workoutsApi.getDraft().then((res) => {
      const dbDraft = res.data?.data as WorkoutFormDraft | null;
      if (!dbDraft) return;
      const localSavedAt = localDraft?.savedAt ?? 0;
      if (dbDraft.savedAt > localSavedAt) {
        // DB draft is newer — silently apply it
        if (dbDraft.workoutType) setWorkoutType(dbDraft.workoutType);
        if (dbDraft.notes != null) setNotes(dbDraft.notes);
        if (dbDraft.exercises?.length) setExercises(dbDraft.exercises);
        if (dbDraft.date && !initialDate) setDate(new Date(dbDraft.date));
        if (dbDraft.time) {
          const d = new Date();
          const [h, m] = dbDraft.time.split(':').map(Number);
          d.setHours(h, m, 0, 0);
          setTime(d);
        }
        if (dbDraft.exercises?.length > 0 || dbDraft.notes) setDraftRestored(true);
      }
    }).catch(() => {/* silent */});
  }, [storageKey]);

  // ── Clear draft (localStorage + DB) ──────────────────────────────
  const clearDraft = () => {
    if (!storageKey) return;
    localStorage.removeItem(storageKey);
    workoutsApi.clearDraft().catch(() => {/* silent */});
    setDraftRestored(false);
  };

  // ── Reset form to initial state ───────────────────────────────────
  const resetToInitial = () => {
    clearDraft();
    setWorkoutType(initialType);
    setNotes(initialNotes);
    setExercises(initialExercises);
    setDate(initialDate ?? new Date());
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    setTime(initialTime ?? d);
    setSelectedTemplateId(null);
  };

  // ── Type change with exercise normalization ───────────────────────

  const handleWorkoutTypeChange = (newType: WorkoutType) => {
    if (exercises.length === 0) { setWorkoutType(newType); return; }

    const oldType = workoutType;
    setWorkoutType(newType);
    setExercises((prev) => convertExercisesForType(prev, oldType, newType));

    if (newType === 'cardio') {
      toast('Подходы убраны — для кардио оставлена длительность (20 мин)', { icon: '🏃' });
    } else if (oldType === 'cardio') {
      toast(
        newType === 'crossfit' ? 'Длительность убрана — добавлены повторы (10)' : 'Длительность убрана — добавлены подходы (3×10)',
        { icon: '💪' }
      );
    } else {
      toast(`Тип изменён на «${WORKOUT_TYPE_CONFIG[newType] ?? newType}». Упражнения адаптированы.`, { icon: 'ℹ️' });
    }
  };

  // ── AI result handler ─────────────────────────────────────────────

  const handleAiResult = (result: AiWorkoutResult) => {
    setWorkoutType(result.workoutType);
    const converted = convertAiResult(result);
    setExercises(converted);
    setAiGenerated(true);
    if (result.notes) setNotes(result.notes);
    setSelectedTemplateId(null);
    toast.success(`AI сгенерировал ${converted.length} упражнений`);
  };

  // ── Template picker ───────────────────────────────────────────────

  const applyTemplate = (template: WorkoutTemplate) => {
    const normalized = template.exercises?.map((ex) => {
      if (template.workoutType === 'bodybuilding' && !ex.setsDetail?.length) {
        return { ...ex, setsDetail: Array.from({ length: ex.sets ?? 3 }, () => ({ reps: ex.reps ?? 10, weight: ex.weight })) };
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

  return (
    <div className="space-y-5">

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

      {/* Когда */}
      <div>
        <SectionLabel>Когда</SectionLabel>
        <WorkoutDateTimeRow date={date} time={time} onDateChange={setDate} onTimeChange={setTime} />
      </div>

      {/* Тип */}
      <div>
        <SectionLabel>Тип тренировки</SectionLabel>
        <WorkoutTypeTabs value={workoutType} onChange={handleWorkoutTypeChange} />
      </div>

      {/* headerSlot — e.g. assignee picker */}
      {headerSlot}

      {/* Шаблон */}
      {templates && templates.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>Шаблон</SectionLabel>
            {selectedTemplateId && (
              <button
                onClick={() => { setSelectedTemplateId(null); setExercises([]); }}
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
            {showTemplatePicker
              ? <ChevronUpIcon className="w-4 h-4 shrink-0 opacity-50" />
              : <ChevronDownIcon className="w-4 h-4 shrink-0 opacity-50" />}
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
                    {t.workoutType === 'crossfit' ? 'CF' : t.workoutType === 'bodybuilding' ? 'Сил' : 'Кард'}
                  </span>
                  <span className="flex-1 truncate">{t.name}</span>
                  {t.exercises?.length > 0 && (
                    <span className="text-xs text-(--color_text_muted) shrink-0">{t.exercises.length} упр.</span>
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
              Сгенерировано через AI
            </span>
          )}
        </div>
        <WorkoutExercisesEditor
          workoutType={workoutType}
          exercises={exercises}
          onChange={(exs) => { setExercises(exs); setAiGenerated(false); }}
          toolbar={
            <div className="flex flex-wrap gap-3 mb-1">
              <AiWorkoutGenerator onResult={handleAiResult} />
              <AiWorkoutRecognizer onResult={handleAiResult} />
            </div>
          }
        />
      </div>

      {/* Заметки */}
      <div>
        <SectionLabel>{notesLabel}</SectionLabel>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={notesPlaceholder}
          rows={6}
          className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors resize-none placeholder:text-(--color_text_muted) leading-relaxed"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
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
  );
}
