import { useState, useEffect, useRef } from 'react';
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
import { exercisesApi } from '@/api/exercises';
import type { Exercise } from '@/types/Exercise';
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
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

  // Exercises (simple plan — no per-set detail needed for scheduling)
  const [exercises, setExercises] = useState<ExerciseData[]>(editWorkout?.workoutData.exercises ?? []);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [showExPicker, setShowExPicker] = useState(false);
  const [exSearch, setExSearch] = useState('');
  const [selectedEx, setSelectedEx] = useState<Exercise | null>(null);
  const [exSets, setExSets] = useState(3);
  const [exReps, setExReps] = useState(10);
  const [exWeight, setExWeight] = useState(0);
  const [exDuration, setExDuration] = useState(20);
  const [exHighlight, setExHighlight] = useState(-1);
  const listboxRef = useRef<HTMLDivElement>(null);

  const showAssigneePicker = !preselectedAssignee;

  useEffect(() => {
    exercisesApi.list().then((res) => setAllExercises(res ?? []));
    trainerApi.getWorkoutTemplates().then((res) => setTemplates(res.data.data)).catch(() => {});
  }, []);

  const applyTemplate = (template: WorkoutTemplate) => {
    setWorkoutType(template.workoutType);
    setExercises(template.exercises ?? []);
    setSelectedTemplateId(template.id);
    setShowTemplatePicker(false);
  };

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

  // Athletes are single-select (personal workout = one athlete)
  const selectAthlete = (athlete: AthleteListItem) => {
    const item: AssignedTo = {
      type: 'athlete',
      id: athlete.id,
      name: athlete.fullName || athlete.email,
    };
    setSelectedAssignees((prev) => {
      const alreadySelected = prev.length === 1 && prev[0].type === 'athlete' && prev[0].id === athlete.id;
      return alreadySelected ? [] : [item];
    });
  };

  const isGroupSelected = (id: number) =>
    selectedAssignees.some((a) => a.type === 'group' && a.id === id);
  const isAthleteSelected = (id: number) =>
    selectedAssignees.some((a) => a.type === 'athlete' && a.id === id);

  const filteredExercises = allExercises.filter((ex) =>
    ex.title.toLowerCase().includes(exSearch.toLowerCase())
  );

  const addExercise = () => {
    if (!selectedEx) return;
    const ex: ExerciseData =
      workoutType === 'cardio'
        ? { exerciseId: selectedEx.id, name: selectedEx.title, duration: exDuration }
        : { exerciseId: selectedEx.id, name: selectedEx.title, sets: exSets, reps: exReps, weight: exWeight || undefined };
    setExercises((prev) => [...prev, ex]);
    setShowExPicker(false);
    setSelectedEx(null);
    setExSearch('');
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
        // Unlink: remove blockId from b and any following exercises in the same block
        const bid = a.blockId;
        for (let j = i + 1; j < next.length; j++) {
          if (next[j].blockId === bid) delete next[j].blockId;
          else break;
        }
      } else {
        // Link: extend a's block or start a new one
        const newBlockId = a.blockId ?? crypto.randomUUID();
        a.blockId = newBlockId;
        b.blockId = newBlockId;
      }
      return next;
    });
  };

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

        // Send workout preview to each assignee's chat
        const previewMessage = buildWorkoutPreviewMessage(dateState, timeState, workoutType, exercises, notes);
        await Promise.all(
          assignedTo.map(async (a) => {
            try {
              const chatRes = a.type === 'group'
                ? await trainerApi.getOrCreateGroupChat(a.id)
                : await trainerApi.getOrCreateAthleteChat(a.id);
              await trainerApi.sendMessage(chatRes.data.data.chatId, previewMessage);
            } catch {
              // silent — не ломаем основной флоу если чат недоступен
            }
          })
        );

        toast.success('Тренировка создана');
      }

      onSuccess?.();
    } catch {
      toast.error(editWorkout ? 'Ошибка обновления тренировки' : 'Ошибка создания тренировки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border)"
    >
      <h3 className="text-lg font-semibold text-white mb-4">
        {editWorkout ? 'Редактировать тренировку' : 'Создать тренировку'}
      </h3>

      <div className="space-y-4">
        {/* Date + Time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-(--color_text_muted) mb-1 block">Дата</label>
            <DatePicker
              selected={dateState}
              onChange={(d: Date | null) => d && setDateState(d)}
              dateFormat="d MMM yyyy"
              locale="ru"
              wrapperClassName="w-full"
              className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors"
              calendarClassName="dark-datepicker"
            />
          </div>
          <div>
            <label className="text-xs text-(--color_text_muted) mb-1 block">Время</label>
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
              className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors"
              calendarClassName="dark-datepicker"
            />
          </div>
        </div>

        {/* Template picker */}
        {templates.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-(--color_text_muted)">Из шаблона</label>
              {selectedTemplateId && (
                <button
                  onClick={() => { setSelectedTemplateId(null); setExercises([]); }}
                  className="text-xs text-(--color_text_muted) hover:text-white transition-colors"
                >
                  Сбросить
                </button>
              )}
            </div>
            {showTemplatePicker ? (
              <div className="rounded-xl bg-(--color_bg_card_hover) divide-y divide-(--color_border) border border-(--color_border) mb-1">
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
                <button
                  onClick={() => setShowTemplatePicker(false)}
                  className="w-full px-3 py-2 text-xs text-(--color_text_muted) hover:text-white transition-colors text-center"
                >
                  Отмена
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowTemplatePicker(true)}
                className={`w-full py-2 px-3 rounded-xl text-sm text-left transition-colors border ${
                  selectedTemplateId
                    ? 'bg-(--color_primary_light)/10 border-(--color_primary_light) text-white'
                    : 'bg-(--color_bg_card_hover) border-(--color_border) text-(--color_text_muted) hover:text-white'
                }`}
              >
                {selectedTemplateId
                  ? `📋 ${templates.find((t) => t.id === selectedTemplateId)?.name}`
                  : '📋 Выбрать шаблон'}
              </button>
            )}
          </div>
        )}

        {/* Workout Type */}
        <div>
          <label className="text-xs text-(--color_text_muted) mb-2 block">Тип тренировки</label>
          <div className="grid grid-cols-3 gap-2">
            {(['crossfit', 'bodybuilding', 'cardio'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setWorkoutType(type)}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  workoutType === type
                    ? 'bg-(--color_primary_light) text-white'
                    : 'bg-(--color_bg_card_hover) text-(--color_text_muted) hover:text-white'
                }`}
              >
                {type === 'crossfit' ? 'CrossFit' : type === 'bodybuilding' ? 'Силовая' : 'Кардио'}
              </button>
            ))}
          </div>
        </div>

        {/* Exercises */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-white">
              Упражнения
              {exercises.length > 0 && (
                <span className="text-(--color_text_muted) ml-1">({exercises.length})</span>
              )}
            </label>
            {!showExPicker && (
              <button
                onClick={() => setShowExPicker(true)}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <PlusIcon className="w-3 h-3" />
                Добавить
              </button>
            )}
          </div>

          {/* Added exercises */}
          {exercises.length > 0 && (
            <div className="mb-2">
              {exercises.map((ex, i) => {
                const isInBlock = !!ex.blockId;
                const isLinkedToNext =
                  i < exercises.length - 1 &&
                  ex.blockId != null &&
                  ex.blockId === exercises[i + 1].blockId;

                return (
                  <div key={i}>
                    {/* Exercise card */}
                    <div
                      className={`flex flex-col gap-1.5 px-3 py-2 rounded-lg border-l-2 transition-colors ${
                        isInBlock
                          ? 'bg-amber-500/5 border-amber-500'
                          : 'bg-(--color_bg_card_hover) border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white flex-1 truncate">{ex.name}</span>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-xs text-(--color_text_muted)">
                            {ex.duration
                              ? `${ex.duration} мин`
                              : `${ex.sets ?? '?'}×${ex.reps ?? '?'}${ex.weight ? ` · ${ex.weight}кг` : ''}`}
                          </span>
                          <button
                            onClick={() => removeExercise(i)}
                            className="text-(--color_text_muted) hover:text-red-400 transition-colors"
                          >
                            <XMarkIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <input
                        type="text"
                        value={ex.notes ?? ''}
                        onChange={(e) => updateExercise(i, { notes: e.target.value })}
                        placeholder="Комментарий тренера..."
                        className="text-xs bg-transparent border-b border-white/10 text-white/70 placeholder:text-white/30 outline-none focus:border-amber-500/60 transition-colors pb-0.5"
                      />
                    </div>

                    {/* ⚡ button between exercises */}
                    {i < exercises.length - 1 && (
                      <div className="relative flex items-center h-6 pl-2">
                        {isLinkedToNext && (
                          <div className="absolute left-[1px] top-0 bottom-0 w-0.5 bg-amber-500" />
                        )}
                        <button
                          onClick={() => toggleLink(i)}
                          className={`ml-2 text-sm leading-none transition-colors ${
                            isLinkedToNext ? 'text-amber-400' : 'text-white/20 hover:text-amber-400'
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

          {/* Inline picker */}
          {showExPicker && (
            <div className="rounded-xl bg-(--color_bg_card_hover) p-3 space-y-2">
              <input
                type="text"
                value={exSearch}
                onChange={(e) => {
                  setExSearch(e.target.value);
                  setSelectedEx(null);
                  setExHighlight(-1);
                }}
                placeholder="Поиск упражнения..."
                autoFocus
                className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors placeholder:text-(--color_text_muted)"
                onKeyDown={(e) => {
                  const list = filteredExercises.slice(0, 8);
                  if (!exSearch || selectedEx) return;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const next = Math.min(exHighlight + 1, list.length - 1);
                    setExHighlight(next);
                    listboxRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const next = Math.max(exHighlight - 1, 0);
                    setExHighlight(next);
                    listboxRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
                  } else if (e.key === 'Enter' && exHighlight >= 0) {
                    e.preventDefault();
                    const picked = list[exHighlight];
                    if (picked) {
                      setSelectedEx(picked);
                      setExSearch(picked.title);
                    }
                  } else if (e.key === 'Escape') {
                    setShowExPicker(false);
                    setSelectedEx(null);
                    setExSearch('');
                    setExHighlight(-1);
                  }
                }}
              />

              {exSearch && !selectedEx && (
                <div
                  ref={listboxRef}
                  className="max-h-36 overflow-y-auto rounded-lg bg-(--color_bg_card) divide-y divide-(--color_border)"
                >
                  {filteredExercises.length === 0 ? (
                    <div className="text-xs text-(--color_text_muted) text-center py-3">
                      Не найдено
                    </div>
                  ) : (
                    filteredExercises.slice(0, 8).map((ex, idx) => (
                      <button
                        key={ex.id}
                        onClick={() => {
                          setSelectedEx(ex);
                          setExSearch(ex.title);
                          setExHighlight(-1);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm text-white transition-colors ${
                          idx === exHighlight
                            ? 'bg-(--color_primary_light)'
                            : 'hover:bg-(--color_bg_card_hover)'
                        }`}
                      >
                        {ex.title}
                      </button>
                    ))
                  )}
                </div>
              )}

              {selectedEx &&
                (workoutType === 'cardio' ? (
                  <div>
                    <label className="text-[10px] text-(--color_text_muted) mb-1 block">
                      Длительность (мин)
                    </label>
                    <input
                      type="number"
                      value={exDuration}
                      min={1}
                      onChange={(e) => setExDuration(+e.target.value)}
                      onClick={(e) => { if (e.button === 0) e.currentTarget.select(); }}
                      className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-lg px-3 py-1.5 text-white text-sm outline-none"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-(--color_text_muted) mb-1 block">
                        Подходы
                      </label>
                      <input
                        type="number"
                        value={exSets}
                        min={0}
                        placeholder="0"
                        onChange={(e) => setExSets(+e.target.value)}
                        onClick={(e) => { if (e.button === 0) e.currentTarget.select(); }}
                        className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-lg px-3 py-1.5 text-white text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-(--color_text_muted) mb-1 block">
                        Повторы
                      </label>
                      <input
                        type="number"
                        value={exReps}
                        min={0}
                        placeholder="0"
                        onChange={(e) => setExReps(+e.target.value)}
                        onClick={(e) => { if (e.button === 0) e.currentTarget.select(); }}
                        className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-lg px-3 py-1.5 text-white text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-(--color_text_muted) mb-1 block">
                        Вес кг
                      </label>
                      <input
                        type="number"
                        value={exWeight}
                        min={0}
                        step={2.5}
                        placeholder="0"
                        onChange={(e) => setExWeight(+e.target.value)}
                        onClick={(e) => { if (e.button === 0) e.currentTarget.select(); }}
                        className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-lg px-3 py-1.5 text-white text-sm outline-none"
                      />
                    </div>
                  </div>
                ))}

              <div className="flex gap-2">
                <button
                  onClick={addExercise}
                  disabled={!selectedEx}
                  className="flex-1 py-1.5 rounded-lg bg-(--color_primary_light) text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  Добавить
                </button>
                <button
                  onClick={() => {
                    setShowExPicker(false);
                    setSelectedEx(null);
                    setExSearch('');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-(--color_bg_card) text-(--color_text_muted) text-sm hover:text-white transition-colors"
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Preselected assignee */}
        {preselectedAssignee && (
          <div>
            <label className="text-xs text-(--color_text_muted) mb-1 block">Для кого</label>
            <div className="px-3 py-2 rounded-lg bg-(--color_bg_input) text-sm text-white">
              {preselectedAssignee.type === 'group' ? '👥' : '🏃'} {preselectedAssignee.name}
            </div>
          </div>
        )}

        {/* Assignee picker */}
        {showAssigneePicker && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-white">Кому назначить</label>
              {selectedAssignees.length > 0 && (
                <button
                  onClick={() => setSelectedAssignees([])}
                  className="text-xs text-(--color_text_muted) hover:text-white transition-colors"
                >
                  Сбросить
                </button>
              )}
            </div>

            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-1.5 mb-2 p-1 rounded-xl bg-(--color_bg_card_hover)">
              <button
                onClick={() => switchMode('group')}
                className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  assigneeMode === 'group'
                    ? 'bg-(--color_primary_light) text-white'
                    : 'text-(--color_text_muted) hover:text-white'
                }`}
              >
                👥 Группа
              </button>
              <button
                onClick={() => switchMode('athlete')}
                className={`py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  assigneeMode === 'athlete'
                    ? 'bg-(--color_primary_light) text-white'
                    : 'text-(--color_text_muted) hover:text-white'
                }`}
              >
                🏃 Персональная
              </button>
            </div>

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
              <div className="text-xs text-(--color_text_muted) py-2">Загрузка...</div>
            ) : (
              <div className="max-h-52 overflow-y-auto rounded-xl bg-(--color_bg_card_hover) divide-y divide-(--color_border)">
                {assigneeMode === 'group' && groups.length === 0 && (
                  <div className="text-xs text-(--color_text_muted) text-center py-4">
                    Нет групп
                  </div>
                )}
                {assigneeMode === 'athlete' && athletes.length === 0 && (
                  <div className="text-xs text-(--color_text_muted) text-center py-4">
                    Нет атлетов
                  </div>
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

        {/* Notes */}
        <div>
          <label className="text-xs text-(--color_text_muted) mb-1 block">
            Заметки (опционально)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Дополнительная информация..."
            rows={2}
            className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2 rounded-xl bg-(--color_primary_light) text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? (editWorkout ? 'Сохранение...' : 'Создание...') : (editWorkout ? 'Сохранить' : 'Создать')}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-(--color_bg_card_hover) text-(--color_text_muted) hover:text-white transition-colors disabled:opacity-50"
            >
              Отмена
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
