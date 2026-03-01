import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import DatePicker, { registerLocale } from 'react-datepicker';
import { ru } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  trainerApi,
  type AssignedTo,
  type WorkoutData,
  type ExerciseData,
  type AthleteListItem,
  type TrainerGroupItem,
  type WorkoutTemplate,
  type ScheduledWorkout,
} from '@/api/trainer';
import { XMarkIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import AiWorkoutGenerator from '@/components/AiWorkoutGenerator/AiWorkoutGenerator';
import AiWorkoutRecognizer from '@/components/AiWorkoutRecognizer/AiWorkoutRecognizer';
import ExercisePicker from '@/components/ExercisePicker/ExercisePicker';
import type { AiWorkoutResult } from '@/api/ai';
import type { ExerciseWithSets } from '@/types/Exercise';
import 'react-datepicker/dist/react-datepicker.css';
import '@/styles/datepicker.css';

registerLocale('ru', ru);

function buildWorkoutPreviewMessage(
  date: Date,
  time: Date,
  type: 'crossfit' | 'bodybuilding' | 'cardio',
  exercises: ExerciseData[],
  notes?: string,
): string {
  return JSON.stringify({
    __type: 'workout_preview',
    date: format(date, 'yyyy-MM-dd'),
    time: format(time, 'HH:mm'),
    workoutType: type,
    exercises,
    notes: notes || undefined,
  });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-2">
      {children}
    </p>
  );
}

interface WorkoutInlineFormProps {
  editWorkout?: ScheduledWorkout;
  preselectedAssignee?: AssignedTo;
  preselectedDate?: string; // YYYY-MM-DD
  preselectedTime?: string; // HH:mm
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function WorkoutInlineForm({
  editWorkout,
  preselectedAssignee,
  preselectedDate,
  preselectedTime,
  onSuccess,
  onCancel,
}: WorkoutInlineFormProps) {
  const [dateState, setDateState] = useState<Date>(() => {
    if (editWorkout) return new Date(editWorkout.scheduledDate);
    if (preselectedDate) {
      const [y, m, d] = preselectedDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  });
  const [timeState, setTimeState] = useState<Date>(() => {
    if (editWorkout) return new Date(editWorkout.scheduledDate);
    const d = new Date();
    if (preselectedTime) {
      const [h, m] = preselectedTime.split(':').map(Number);
      d.setHours(h, m, 0, 0);
    } else {
      d.setHours(9, 0, 0, 0);
    }
    return d;
  });

  const [workoutType, setWorkoutType] = useState<'crossfit' | 'bodybuilding' | 'cardio'>(
    editWorkout?.workoutData.type ?? 'crossfit'
  );
  const [notes, setNotes] = useState(editWorkout?.notes ?? '');
  const [loading, setLoading] = useState(false);

  // Templates
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  // Assignee selection
  const [groups, setGroups] = useState<TrainerGroupItem[]>([]);
  const [athletes, setAthletes] = useState<AthleteListItem[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<AssignedTo[]>(
    editWorkout?.assignedTo ?? []
  );
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [assigneeMode, setAssigneeMode] = useState<'group' | 'athlete'>(() => {
    if (editWorkout?.assignedTo?.length) return editWorkout.assignedTo[0].type;
    if (preselectedAssignee) return preselectedAssignee.type;
    return 'group';
  });

  // Exercises
  const [exercises, setExercises] = useState<ExerciseData[]>(editWorkout?.workoutData.exercises ?? []);

  const showAssigneePicker = !preselectedAssignee;

  useEffect(() => {
    trainerApi.getWorkoutTemplates().then((res) => setTemplates(res.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!showAssigneePicker) return;
    const load = async () => {
      try {
        setLoadingAssignees(true);
        const [groupsRes, athletesRes] = await Promise.all([
          trainerApi.listGroups(),
          trainerApi.listAthletes(),
        ]);
        setGroups(groupsRes.data.data);
        setAthletes(athletesRes.data.data);
      } catch {
        // silent
      } finally {
        setLoadingAssignees(false);
      }
    };
    load();
  }, [showAssigneePicker]);

  const applyTemplate = (template: WorkoutTemplate) => {
    setWorkoutType(template.workoutType);
    setExercises(template.exercises ?? []);
    setSelectedTemplateId(template.id);
    setShowTemplatePicker(false);
  };

  const handleAiResult = (result: AiWorkoutResult) => {
    setWorkoutType(result.workoutType);
    const converted: ExerciseData[] = result.exercises.map((ex, i) => ({
      exerciseId: ex.exerciseId ?? `ai-${i}`,
      name: ex.displayName ?? ex.name,
      sets: ex.sets,
      reps: ex.reps,
      weight: ex.weight,
      duration: ex.duration,
      notes: ex.notes,
    }));
    setExercises(converted);
    if (result.notes) setNotes(result.notes);
    setSelectedTemplateId(null);
    toast.success(`AI сгенерировал ${converted.length} упражнений`);
  };

  /** Convert ExerciseWithSets (from ExercisePicker) → ExerciseData (trainer format) */
  const handleExercisePicked = (ex: ExerciseWithSets) => {
    const data: ExerciseData =
      workoutType === 'cardio'
        ? {
            exerciseId: String(ex.exerciseId),
            name: ex.title,
            duration: ex.duration ?? 20,
          }
        : {
            exerciseId: String(ex.exerciseId),
            name: ex.title,
            sets: ex.sets.length || 3,
            reps: ex.sets[0]?.reps,
            weight: ex.sets[0]?.weight || undefined,
          };
    setExercises((prev) => [...prev, data]);
  };

  const removeExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, patch: Partial<ExerciseData>) => {
    setExercises((prev) => prev.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)));
  };

  const toggleLink = (i: number) => {
    setExercises((prev) => {
      const next = prev.map((ex) => ({ ...ex }));
      const a = next[i];
      const b = next[i + 1];
      if (!a || !b) return prev;
      if (a.blockId && a.blockId === b.blockId) {
        const bid = a.blockId;
        for (let j = i + 1; j < next.length; j++) {
          if (next[j].blockId === bid) delete next[j].blockId;
          else break;
        }
      } else {
        const newBlockId = a.blockId ?? crypto.randomUUID();
        a.blockId = newBlockId;
        b.blockId = newBlockId;
      }
      return next;
    });
  };

  const switchMode = (mode: 'group' | 'athlete') => {
    setAssigneeMode(mode);
    setSelectedAssignees([]);
  };

  const toggleGroup = (group: TrainerGroupItem) => {
    const item: AssignedTo = { type: 'group', id: group.id, name: group.name };
    setSelectedAssignees((prev) => {
      const exists = prev.find((a) => a.type === 'group' && a.id === group.id);
      return exists
        ? prev.filter((a) => !(a.type === 'group' && a.id === group.id))
        : [...prev, item];
    });
  };

  const selectAthlete = (athlete: AthleteListItem) => {
    const item: AssignedTo = {
      type: 'athlete',
      id: athlete.id,
      name: athlete.fullName || athlete.email,
    };
    setSelectedAssignees((prev) => {
      const alreadySelected =
        prev.length === 1 && prev[0].type === 'athlete' && prev[0].id === athlete.id;
      return alreadySelected ? [] : [item];
    });
  };

  const isGroupSelected = (id: number) =>
    selectedAssignees.some((a) => a.type === 'group' && a.id === id);
  const isAthleteSelected = (id: number) =>
    selectedAssignees.some((a) => a.type === 'athlete' && a.id === id);

  const handleSubmit = async () => {
    if (!preselectedAssignee && selectedAssignees.length === 0) {
      toast.error('Выберите группу или атлета');
      return;
    }

    setLoading(true);
    try {
      const scheduledDate = `${format(dateState, 'yyyy-MM-dd')}T${format(timeState, 'HH:mm')}:00`;
      const workoutData: WorkoutData = {
        type: workoutType,
        exercises,
        notes: notes || undefined,
      };

      const assignedTo = preselectedAssignee ? [preselectedAssignee] : selectedAssignees;

      if (editWorkout) {
        await trainerApi.updateScheduledWorkout(editWorkout.id, {
          scheduledDate,
          workoutData,
          assignedTo,
          notes: notes || undefined,
        });
        toast.success('Тренировка обновлена');
      } else {
        await trainerApi.createScheduledWorkout({
          scheduledDate,
          workoutData,
          assignedTo,
          notes: notes || undefined,
          templateId: selectedTemplateId ?? undefined,
        });

        const previewMessage = buildWorkoutPreviewMessage(
          dateState,
          timeState,
          workoutType,
          exercises,
          notes
        );
        await Promise.all(
          assignedTo.map(async (a) => {
            try {
              const chatRes =
                a.type === 'group'
                  ? await trainerApi.getOrCreateGroupChat(a.id)
                  : await trainerApi.getOrCreateAthleteChat(a.id);
              await trainerApi.sendMessage(chatRes.data.data.chatId, previewMessage);
            } catch {
              // silent
            }
          })
        );

        toast.success('Тренировка создана');
      }

      onSuccess?.();
    } catch {
      toast.error(
        editWorkout ? 'Ошибка обновления тренировки' : 'Ошибка создания тренировки'
      );
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Render                                                               */
  /* ------------------------------------------------------------------ */

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="rounded-2xl border border-(--color_border) overflow-hidden"
      style={{ backgroundColor: 'var(--color_bg_card)' }}
    >
      {/* Form header */}
      <div className="px-4 pt-4 pb-3 border-b border-(--color_border)">
        <h3 className="text-base font-semibold text-white">
          {editWorkout ? 'Редактировать тренировку' : 'Создать тренировку'}
        </h3>
      </div>

      <div className="px-4 py-4 space-y-5">

        {/* ── Когда ── */}
        <div>
          <SectionLabel>Когда</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            <DatePicker
              selected={dateState}
              onChange={(d: Date | null) => d && setDateState(d)}
              dateFormat="d MMM yyyy"
              locale="ru"
              wrapperClassName="w-full"
              className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors"
              calendarClassName="dark-datepicker"
            />
            <DatePicker
              selected={timeState}
              onChange={(t: Date | null) => t && setTimeState(t)}
              showTimeSelect
              showTimeSelectOnly
              timeIntervals={15}
              timeCaption="Время"
              dateFormat="HH:mm"
              timeFormat="HH:mm"
              locale="ru"
              wrapperClassName="w-full"
              className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors"
              calendarClassName="dark-datepicker"
            />
          </div>
        </div>

        {/* ── Тип ── */}
        <div>
          <SectionLabel>Тип тренировки</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {(['crossfit', 'bodybuilding', 'cardio'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setWorkoutType(type)}
                className={`py-2.5 px-3 rounded-xl text-sm font-medium transition-colors ${
                  workoutType === type
                    ? 'bg-(--color_primary_light) text-white'
                    : 'bg-(--color_bg_card_hover) text-(--color_text_muted) hover:text-white border border-(--color_border)'
                }`}
              >
                {type === 'crossfit' ? 'CrossFit' : type === 'bodybuilding' ? 'Силовая' : 'Кардио'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Кому ── */}
        {preselectedAssignee ? (
          <div>
            <SectionLabel>Для кого</SectionLabel>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-(--color_bg_card_hover) border border-(--color_border)">
              <span>{preselectedAssignee.type === 'group' ? '👥' : '🏃'}</span>
              <span className="text-sm text-white">{preselectedAssignee.name}</span>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel>Кому назначить</SectionLabel>
              {selectedAssignees.length > 0 && (
                <button
                  onClick={() => setSelectedAssignees([])}
                  className="text-[10px] text-(--color_text_muted) hover:text-white transition-colors"
                >
                  Сбросить
                </button>
              )}
            </div>

            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-1.5 mb-2.5 p-1 rounded-xl bg-(--color_bg_card_hover)">
              {(['group', 'athlete'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => switchMode(mode)}
                  className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    assigneeMode === mode
                      ? 'bg-(--color_primary_light) text-white'
                      : 'text-(--color_text_muted) hover:text-white'
                  }`}
                >
                  {mode === 'group' ? '👥 Группа' : '🏃 Персональная'}
                </button>
              ))}
            </div>

            {/* Selected tags */}
            {selectedAssignees.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedAssignees.map((a) => (
                  <span
                    key={`${a.type}-${a.id}`}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-(--color_primary_light) text-white text-xs"
                  >
                    {a.type === 'group' ? '👥' : '🏃'} {a.name}
                    <button
                      onClick={() =>
                        setSelectedAssignees((prev) =>
                          prev.filter((x) => !(x.type === a.type && x.id === a.id))
                        )
                      }
                      className="ml-0.5 hover:opacity-70"
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {loadingAssignees ? (
              <div className="flex justify-center py-2"><div className="w-4 h-4 border border-white/20 border-t-(--color_primary_light) rounded-full animate-spin" /></div>
            ) : (
              <div className="max-h-44 overflow-y-auto rounded-xl bg-(--color_bg_card_hover) divide-y divide-(--color_border) border border-(--color_border)">
                {assigneeMode === 'group' && groups.length === 0 && (
                  <div className="text-xs text-(--color_text_muted) text-center py-4">Нет групп</div>
                )}
                {assigneeMode === 'athlete' && athletes.length === 0 && (
                  <div className="text-xs text-(--color_text_muted) text-center py-4">Нет атлетов</div>
                )}
                {assigneeMode === 'group' &&
                  groups.map((group) => (
                    <button
                      key={`group-${group.id}`}
                      onClick={() => toggleGroup(group)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors ${
                        isGroupSelected(group.id)
                          ? 'bg-(--color_primary_light) text-white'
                          : 'text-white hover:bg-(--color_border)'
                      }`}
                    >
                      <span>👥</span>
                      <span className="truncate font-medium">{group.name}</span>
                      <span className="ml-auto text-xs opacity-60 shrink-0">
                        {group.athleteCount} чел.
                      </span>
                    </button>
                  ))}
                {assigneeMode === 'athlete' &&
                  athletes.map((athlete) => (
                    <button
                      key={`athlete-${athlete.id}`}
                      onClick={() => selectAthlete(athlete)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors ${
                        isAthleteSelected(athlete.id)
                          ? 'bg-(--color_primary_light) text-white'
                          : 'text-white hover:bg-(--color_border)'
                      }`}
                    >
                      <span>🏃</span>
                      <span className="truncate">{athlete.fullName || athlete.email}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ── Шаблон ── */}
        {templates.length > 0 && (
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
                      {t.workoutType === 'crossfit' ? 'CF' : t.workoutType === 'bodybuilding' ? 'Сил' : 'Кард'}
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

        {/* ── Упражнения ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>
              Упражнения{exercises.length > 0 && ` (${exercises.length})`}
            </SectionLabel>
          </div>

          {/* AI tools */}
          <div className="flex flex-wrap gap-3 mb-1">
            <AiWorkoutGenerator onResult={handleAiResult} />
            <AiWorkoutRecognizer onResult={handleAiResult} />
          </div>

          {/* Exercise list */}
          {exercises.length > 0 && (
            <div className="mt-3 space-y-0.5">
              {exercises.map((ex, i) => {
                const isInBlock = !!ex.blockId;
                const isLinkedToNext =
                  i < exercises.length - 1 &&
                  ex.blockId != null &&
                  ex.blockId === exercises[i + 1].blockId;

                return (
                  <div key={i}>
                    <div
                      className={`p-3 rounded-xl border transition-colors ${
                        isInBlock
                          ? 'bg-amber-500/5 border-amber-500/40'
                          : 'bg-(--color_bg_card_hover) border-(--color_border)'
                      }`}
                    >
                      {/* Name + params + remove */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white leading-snug truncate">
                            {ex.name}
                          </p>
                          <p className="text-xs text-(--color_text_muted) mt-0.5">
                            {ex.duration
                              ? `${ex.duration} мин`
                              : `${ex.sets ?? 3}×${ex.reps ?? 10}${ex.weight ? ` · ${ex.weight} кг` : ''}`}
                          </p>
                        </div>
                        <button
                          onClick={() => removeExercise(i)}
                          className="shrink-0 mt-0.5 text-white/25 hover:text-red-400 transition-colors"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Notes textarea */}
                      <textarea
                        value={ex.notes ?? ''}
                        onChange={(e) => updateExercise(i, { notes: e.target.value })}
                        placeholder="Комментарий: техника, темп, интенсивность..."
                        rows={2}
                        className="mt-2.5 w-full text-xs bg-transparent border border-white/10 rounded-lg px-2.5 py-1.5 text-white/70 placeholder:text-white/25 outline-none focus:border-amber-500/40 resize-none transition-colors leading-relaxed"
                      />
                    </div>

                    {/* Superset link */}
                    {i < exercises.length - 1 && (
                      <div className="relative flex items-center h-5 pl-4 my-0.5">
                        {isLinkedToNext && (
                          <div className="absolute left-[9px] top-0 bottom-0 w-0.5 bg-amber-500" />
                        )}
                        <button
                          onClick={() => toggleLink(i)}
                          className={`text-sm leading-none transition-colors ${
                            isLinkedToNext
                              ? 'text-amber-400'
                              : 'text-white/15 hover:text-amber-400'
                          }`}
                          title={isLinkedToNext ? 'Разъединить суперсет' : 'Связать в суперсет'}
                        >
                          ⚡
                        </button>
                        {isLinkedToNext && (
                          <span className="ml-1.5 text-[10px] text-amber-400/70">суперсет</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ExercisePicker button */}
          <ExercisePicker onSelect={handleExercisePicked} workoutType={workoutType} />
        </div>

        {/* ── Заметки ── */}
        <div>
          <SectionLabel>Заметки тренера</SectionLabel>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Общие рекомендации по тренировке..."
            rows={3}
            className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors resize-none placeholder:text-(--color_text_muted) leading-relaxed"
          />
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3 rounded-xl bg-(--color_primary_light) text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading
              ? editWorkout ? 'Сохранение...' : 'Создание...'
              : editWorkout ? 'Сохранить' : 'Создать тренировку'}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-5 py-3 rounded-xl bg-(--color_bg_card_hover) text-(--color_text_muted) hover:text-white border border-(--color_border) transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
