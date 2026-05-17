import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  parseLocalDate,
  parseApiDateTime,
  toApiDateTime,
  toDateKey,
  toTimeKey,
  nowRoundedToHour,
  parseTimeString,
} from '@/utils/date';
import toast from 'react-hot-toast';
import WorkoutFormBase, {
  type WorkoutFormData,
} from '@/components/WorkoutFormBase/WorkoutFormBase';
import SectionLabel from '@/components/SectionLabel';
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
import { XMarkIcon, SparklesIcon, PlusIcon } from '@heroicons/react/24/outline';
import CustomExercisePicker from '@/components/CustomExercisePicker/CustomExercisePicker';
import type { ExerciseWithSets } from '@/types/Exercise';
import TabCard from '@/components/ui/TabCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AccentButton from '@/components/ui/AccentButton';
import AppInput from '@/components/ui/AppInput';
import GhostButton from '@/components/ui/GhostButton';
import { useAuth, useActiveMode } from '@/contexts/AuthContext';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import type { WorkoutType } from '@/components/WorkoutTypeTabs';
import { aiApi } from '@/api/ai';
import { exerciseIdForDisplay } from '@/utils/exerciseIdForDisplay';
import { normalizeExercisesForType } from '@/components/WorkoutExercisesEditor/normalizeForWorkoutType';
import { convertExercisesForType } from '@/components/WorkoutFormBase/workoutTypeConversion';
import { buildTrainerCustomExerciseWithSets } from '@/util/trainerCustomExerciseWithSets';
import TemplatePicker from '@/components/ui/TemplatePicker';

function isEditableWorkoutType(t: WorkoutData['type']): t is WorkoutType {
  return t === 'crossfit' || t === 'bodybuilding' || t === 'cardio';
}

/** Типы, которые умеет редактировать WorkoutFormBase (не intro / rest_day). */
function initialWorkoutTypeForForm(edit: ScheduledWorkout | undefined): WorkoutType | undefined {
  if (!edit) return undefined;
  return isEditableWorkoutType(edit.workoutData.type) ? edit.workoutData.type : undefined;
}

function buildWorkoutPreviewMessage(
  date: Date,
  time: Date,
  type: 'crossfit' | 'bodybuilding' | 'cardio',
  exercises: ExerciseData[],
  notes?: string,
  scheduledWorkoutId?: number
): string {
  return JSON.stringify({
    __type: 'workout_preview',
    date: toDateKey(date),
    time: toTimeKey(time),
    workoutType: type,
    exercises,
    notes: notes || undefined,
    scheduledWorkoutId,
  });
}

interface WorkoutInlineFormProps {
  editWorkout?: ScheduledWorkout;
  preselectedAssignee?: AssignedTo;
  preselectedDate?: string;
  preselectedTime?: string;
  initialGroups?: TrainerGroupItem[];
  initialAthletes?: AthleteListItem[];
  /** Called after successful create/update (scheduledDate returned as API datetime string). */
  onSuccess?: (scheduledDate: string) => void;
  onCancel?: () => void;
  /** Skip outer card wrapper — use when rendering inside BottomSheet */
  noCard?: boolean;
}

export default function WorkoutInlineForm({
  editWorkout,
  preselectedAssignee,
  preselectedDate,
  preselectedTime,
  initialGroups,
  initialAthletes,
  onSuccess,
  onCancel,
  noCard = false,
}: WorkoutInlineFormProps) {
  const { user } = useAuth();
  const { activeMode } = useActiveMode();
  const isTrainerMode = activeMode === 'trainer';
  const { teams: teamsEnabled } = useFeatureFlags();
  const storageKey = !editWorkout && user ? `trainer_workout_draft_${user.id}` : undefined;

  // ── Assignees ─────────────────────────────────────────────────────

  const [groups, setGroups] = useState<TrainerGroupItem[]>(initialGroups ?? []);
  const [athletes, setAthletes] = useState<AthleteListItem[]>(initialAthletes ?? []);
  const [selectedAssignees, setSelectedAssignees] = useState<AssignedTo[]>(
    editWorkout?.assignedTo ?? []
  );
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [assigneeMode, setAssigneeMode] = useState<'group' | 'athlete'>(() => {
    if (editWorkout?.assignedTo?.length) return editWorkout.assignedTo[0].type;
    if (preselectedAssignee) return preselectedAssignee.type;
    return 'group';
  });

  // ── Templates ─────────────────────────────────────────────────────

  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [quickMode, setQuickMode] = useState(!editWorkout);
  const [quickSaving, setQuickSaving] = useState(false);

  // ── Quick text / AI parse ─────────────────────────────────────────
  const { ai: aiEnabled } = useFeatureFlags();
  const [quickDescription, setQuickDescription] = useState('');
  const [quickAiLoading, setQuickAiLoading] = useState(false);
  const [quickAiError, setQuickAiError] = useState<string | null>(null);
  /** Exercises parsed by AI — passed as initial to formBase when switching modes */
  const [parsedExercises, setParsedExercises] = useState<ExerciseData[]>([]);
  const [parsedWorkoutType, setParsedWorkoutType] = useState<WorkoutType | undefined>(undefined);

  const showAssigneePicker = !preselectedAssignee && teamsEnabled;

  useEffect(() => {
    if (!teamsEnabled && !editWorkout && !preselectedAssignee) {
      setSelectedAssignees([]);
    }
  }, [teamsEnabled, editWorkout, preselectedAssignee]);

  useEffect(() => {
    trainerApi
      .getWorkoutTemplates()
      .then((res) => setTemplates(res.data.data))
      .catch(() => {});
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
        /* silent */
      } finally {
        setLoadingAssignees(false);
      }
    };
    load();
  }, [showAssigneePicker]);

  // ── Assignee helpers ──────────────────────────────────────────────

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
      const already = prev.length === 1 && prev[0].type === 'athlete' && prev[0].id === athlete.id;
      return already ? [] : [item];
    });
  };

  const isGroupSelected = (id: number) =>
    selectedAssignees.some((a) => a.type === 'group' && a.id === id);
  const isAthleteSelected = (id: number) =>
    selectedAssignees.some((a) => a.type === 'athlete' && a.id === id);

  // ── Initial values ────────────────────────────────────────────────

  const initialDate = (() => {
    if (editWorkout) return parseApiDateTime(editWorkout.scheduledDate);
    if (preselectedDate) return parseLocalDate(preselectedDate);
    return undefined;
  })();

  const initialTime = (() => {
    if (editWorkout) return parseApiDateTime(editWorkout.scheduledDate);
    if (preselectedTime) return parseTimeString(preselectedTime);
    return nowRoundedToHour();
  })();

  const [quickDate, setQuickDate] = useState(() => toDateKey(initialDate ?? new Date()));
  const [quickTime, setQuickTime] = useState(() => toTimeKey(initialTime));
  const [quickTemplateId, setQuickTemplateId] = useState<number | null>(null);
  const [quickNotes, setQuickNotes] = useState('');

  // ── Submit ────────────────────────────────────────────────────────

  const getAssignedTo = () => {
    if (preselectedAssignee) return [preselectedAssignee];
    if (!teamsEnabled) {
      if (editWorkout) return editWorkout.assignedTo ?? [];
      return [];
    }
    return selectedAssignees;
  };

  const handleSubmit = async (data: WorkoutFormData) => {
    const assignedTo = getAssignedTo();

    const scheduledDate = toApiDateTime(data.date, data.time);
    const normalizedExercises = data.exercises.map((ex) => {
      if (data.workoutType !== 'bodybuilding' || ex.duration != null || !ex.setsDetail?.length)
        return ex;
      return {
        ...ex,
        sets: ex.setsDetail.length,
        reps: ex.setsDetail[0]?.reps ?? ex.reps,
        weight: ex.setsDetail.find((s) => s.weight != null)?.weight ?? ex.weight,
      };
    });
    const workoutData: WorkoutData = {
      type: data.workoutType,
      exercises: normalizedExercises,
      notes: data.notes || undefined,
    };

    try {
      if (editWorkout) {
        await trainerApi.updateScheduledWorkout(editWorkout.id, {
          scheduledDate,
          workoutData,
          assignedTo,
          notes: data.notes || undefined,
        });
        toast.success('Тренировка обновлена');
      } else {
        const created = await trainerApi.createScheduledWorkout({
          scheduledDate,
          workoutData,
          assignedTo,
          notes: data.notes || undefined,
          templateId: data.selectedTemplateId ?? undefined,
        });
        const scheduledWorkoutId = created.data.data.id;
        const previewMessage = buildWorkoutPreviewMessage(
          data.date,
          data.time,
          data.workoutType,
          data.exercises,
          data.notes,
          scheduledWorkoutId
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
              /* silent */
            }
          })
        );
        toast.success('Тренировка создана');
      }
      onSuccess?.(scheduledDate);
    } catch {
      toast.error(editWorkout ? 'Ошибка обновления тренировки' : 'Ошибка создания тренировки');
      throw new Error('submit failed');
    }
  };

  const handleQuickSubmit = async () => {
    if (!quickDate || !quickTime) {
      toast.error('Выберите дату и время');
      return;
    }
    const assignedTo = getAssignedTo();
    const template =
      quickTemplateId != null ? templates.find((t) => t.id === quickTemplateId) : undefined;
    const date = parseLocalDate(quickDate);
    const time = parseTimeString(quickTime);
    const scheduledDate = toApiDateTime(date, time);
    const workoutType = template?.workoutType ?? 'bodybuilding';
    const exercises = template?.exercises ?? [];
    const workoutData: WorkoutData = {
      type: workoutType,
      exercises,
      notes: quickNotes.trim() || undefined,
    };

    setQuickSaving(true);
    try {
      const created = await trainerApi.createScheduledWorkout({
        scheduledDate,
        workoutData,
        assignedTo,
        notes: quickNotes.trim() || undefined,
        templateId: quickTemplateId ?? undefined,
      });
      const previewMessage = buildWorkoutPreviewMessage(
        date,
        time,
        workoutType,
        exercises,
        quickNotes.trim() || undefined,
        created.data.data.id
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
            /* silent */
          }
        })
      );
      toast.success('Тренировка создана');
      onSuccess?.(scheduledDate);
    } catch {
      toast.error('Ошибка создания тренировки');
    } finally {
      setQuickSaving(false);
    }
  };

  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const [customExerciseName, setCustomExerciseName] = useState('');

  const handleQuickCustomPick = (ex: ExerciseWithSets) => {
    const data: ExerciseData = {
      exerciseId: String(ex.exerciseId),
      name: ex.title,
      sets: ex.sets.length,
      setsDetail: ex.sets.map((s) => ({ reps: s.reps, weight: s.weight ?? undefined })),
      duration: ex.duration,
    };
    setParsedExercises((prev) => [...prev, data]);
    setQuickMode(false);
  };

  const handleAthleteCustomExerciseAdd = () => {
    const name = customExerciseName.trim();
    if (!name) return;
    const ex = buildTrainerCustomExerciseWithSets('bodybuilding', name);
    handleQuickCustomPick(ex);
    setCustomExerciseName('');
  };

  // ── Quick AI parse ────────────────────────────────────────────────

  const handleQuickAiParse = async () => {
    const text = quickDescription.trim();
    if (!text || quickAiLoading) return;
    setQuickAiLoading(true);
    setQuickAiError(null);
    try {
      const res = await aiApi.parseNotesText(text);
      const raw = res.data.exercises ?? [];
      if (raw.length === 0) {
        setQuickAiError(
          res.data.warning?.trim() || 'Не удалось распознать упражнения — проверьте формат текста'
        );
        return;
      }
      const nameMap = new Map(
        (res.data.previewItems ?? []).map((item: { exerciseId: string; name: string }) => [
          item.exerciseId,
          item.name,
        ])
      );
      const base: ExerciseData[] = raw.map(
        (ex: {
          exerciseId?: string;
          zones?: string[];
          zoneWeights?: Record<string, number>;
          bodyweight?: boolean;
          sets?: Array<{ reps?: number; weight?: number; time?: number }>;
          blockId?: string;
        }) => ({
          exerciseId: ex.exerciseId,
          name:
            nameMap.get(ex.exerciseId ?? '') ?? exerciseIdForDisplay(String(ex.exerciseId ?? '')),
          zones: Array.isArray(ex.zones) ? ex.zones : undefined,
          zoneWeights:
            ex.zoneWeights && typeof ex.zoneWeights === 'object' ? ex.zoneWeights : undefined,
          bodyweight: ex.bodyweight,
          setsDetail: ex.sets?.map((s) => ({ reps: s.reps ?? 10, weight: s.weight })) ?? [],
          sets: ex.sets?.length ?? 3,
          blockId: ex.blockId,
          duration: ex.sets?.[0]?.time ? Math.round(Number(ex.sets[0].time) / 60) : undefined,
        })
      );
      const converted = normalizeExercisesForType(
        'bodybuilding',
        convertExercisesForType(base, 'bodybuilding', 'bodybuilding')
      );
      setParsedExercises(converted);
      setParsedWorkoutType('bodybuilding');
      setQuickMode(false);
      toast.success(`ИИ разобрал ${converted.length} упр.`);
    } catch {
      setQuickAiError('Ошибка распознавания — попробуйте ещё раз');
    } finally {
      setQuickAiLoading(false);
    }
  };

  // ── Assignee picker (passed as headerSlot) ────────────────────────

  const assigneePicker = preselectedAssignee ? (
    <div>
      <SectionLabel>Для кого</SectionLabel>
      <div className="glass flex items-center gap-2 px-3 py-2.5 rounded-xl border border-(--color_border)">
        <span>{preselectedAssignee.type === 'group' ? '👥' : '🏃'}</span>
        <span className="text-sm text-white">{preselectedAssignee.name}</span>
      </div>
      {!editWorkout && (
        <p className="text-xs text-(--color_text_muted) mt-2.5 leading-relaxed">
          После создания тренировки в соответствующий чат уйдёт сообщение с планом — атлет увидит
          его в «Диалогах».
        </p>
      )}
    </div>
  ) : !teamsEnabled ? (
    editWorkout &&
    editWorkout.assignedTo &&
    editWorkout.workoutData.type !== 'intro' &&
    editWorkout.assignedTo.length > 0 ? (
      <div>
        <SectionLabel>Назначено</SectionLabel>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {editWorkout.assignedTo.map((a) => (
            <span
              key={`${a.type}-${a.id}`}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-(--color_bg_card_hover) border border-(--color_border) text-white text-xs"
            >
              {a.type === 'group' ? '👥' : '🏃'} {a.name}
            </span>
          ))}
        </div>
        <p className="text-xs text-(--color_text_muted) mt-2.5 leading-relaxed">
          В настройках выключены «Атлеты и группы» — состав назначения не редактируется, только сама
          тренировка.
        </p>
      </div>
    ) : (
      <div>
        <SectionLabel>Назначение</SectionLabel>
        <p className="text-xs text-(--color_text_muted) mt-1 leading-relaxed">
          Пока в настройках выключены «Атлеты и группы», тренировка остаётся только в вашем
          календаре — выбрать атлета или группу нельзя. Включите переключатель в профиле, если
          ведёте клиентов в приложении (вкладка «Команда», приглашения, назначения).
        </p>
      </div>
    )
  ) : (
    <div>
      <div className="mb-2">
        <SectionLabel>Кому назначить</SectionLabel>
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

      <TabCard
        tabs={[
          { id: 'group', label: '👥 Группа' },
          { id: 'athlete', label: '🏃 Персональная' },
        ]}
        active={assigneeMode}
        onChange={(v) => switchMode(v)}
        bodyClassName="max-h-44 overflow-y-auto divide-y divide-(--color_border)"
      >
        {loadingAssignees ? (
          <div className="flex items-center justify-center py-2.5">
            <LoadingSpinner size="xs" />
          </div>
        ) : (
          <>
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
                      : 'text-white hover:bg-white/5'
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
                      : 'text-white hover:bg-white/5'
                  }`}
                >
                  <span>🏃</span>
                  <span className="truncate">{athlete.fullName || athlete.email}</span>
                </button>
              ))}
          </>
        )}
      </TabCard>
      {!editWorkout && selectedAssignees.length > 0 && (
        <p className="text-xs text-(--color_text_muted) mt-2.5 leading-relaxed">
          После создания тренировки выбранные атлеты получат в чате сообщение с планом — как только
          вы нажмёте «Создать тренировку».
        </p>
      )}
    </div>
  );

  /* ─── Render ─────────────────────────────────────────────────────── */

  const quickForm = (
    <div className="space-y-4">
      {assigneePicker}

      <div>
        <SectionLabel>Шаблон</SectionLabel>
        <TemplatePicker
          templates={templates}
          value={quickTemplateId}
          onChange={setQuickTemplateId}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <SectionLabel>Дата</SectionLabel>
          <AppInput
            type="date"
            value={quickDate}
            onChange={(e) => setQuickDate(e.target.value)}
            className="scheme-dark"
          />
        </div>
        <div>
          <SectionLabel>Время</SectionLabel>
          <input
            type="time"
            value={quickTime}
            onChange={(e) => setQuickTime(e.target.value)}
            className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-3 text-white text-sm outline-none focus:border-(--color_primary_light)"
          />
        </div>
      </div>

      {isTrainerMode ? (
        <GhostButton
          variant="solid"
          onClick={() => setCustomPickerOpen(true)}
          disabled={quickSaving}
        >
          <PlusIcon className="w-4 h-4" />
          ✏️ Добавить своё упражнение
        </GhostButton>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={customExerciseName}
            onChange={(e) => setCustomExerciseName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAthleteCustomExerciseAdd()}
            placeholder="Название упражнения..."
            disabled={quickSaving}
            className="flex-1 bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-(--color_primary_light) placeholder:text-(--color_text_muted) disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleAthleteCustomExerciseAdd}
            disabled={!customExerciseName.trim() || quickSaving}
            className="flex items-center gap-1 px-3 py-2.5 rounded-xl text-sm font-medium text-(--color_primary_light) border border-(--color_primary_light)/40 hover:bg-(--color_primary_light)/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <PlusIcon className="w-4 h-4" />
            Добавить
          </button>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
            Описание тренировки
          </p>
          {aiEnabled && (
            <button
              type="button"
              onClick={() => void handleQuickAiParse()}
              disabled={quickDescription.trim().length < 5 || quickAiLoading}
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {quickAiLoading ? (
                <LoadingSpinner size="xs" />
              ) : (
                <SparklesIcon className="w-3.5 h-3.5" />
              )}
              {quickAiLoading ? 'Распознаю…' : 'Распознать упражнения'}
            </button>
          )}
        </div>
        <textarea
          value={quickDescription}
          onChange={(e) => {
            setQuickDescription(e.target.value);
            setQuickAiError(null);
          }}
          placeholder={
            aiEnabled
              ? 'Опишите тренировку: жим лёжа 3×10 60кг, приседания 4×8 80кг — ИИ разберёт упражнения, подходы и веса'
              : 'Опишите тренировку или укажите содержание'
          }
          rows={3}
          className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors resize-none placeholder:text-(--color_text_muted)"
        />
        {quickAiError && <p className="text-xs text-red-400 mt-1.5">{quickAiError}</p>}
      </div>

      <div>
        <SectionLabel>Комментарий атлету</SectionLabel>
        <textarea
          value={quickNotes}
          onChange={(e) => setQuickNotes(e.target.value)}
          placeholder="Опционально: что важно сказать атлету"
          rows={2}
          className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors resize-none placeholder:text-(--color_text_muted) leading-relaxed"
        />
      </div>

      <div className="flex flex-col gap-2">
        <AccentButton
          onClick={handleQuickSubmit}
          disabled={quickSaving}
          loading={quickSaving}
          loadingText="Создаём..."
          className="font-semibold"
        >
          Создать тренировку
        </AccentButton>
        <GhostButton variant="solid" onClick={() => setQuickMode(false)} disabled={quickSaving}>
          Настроить подробно
        </GhostButton>
      </div>

      {isTrainerMode && (
        <CustomExercisePicker
          open={customPickerOpen}
          onClose={() => setCustomPickerOpen(false)}
          workoutType="bodybuilding"
          onSelect={handleQuickCustomPick}
        />
      )}
    </div>
  );

  const formBase = (
    <WorkoutFormBase
      initialDate={initialDate}
      initialTime={initialTime}
      initialType={parsedWorkoutType ?? initialWorkoutTypeForForm(editWorkout)}
      initialNotes={editWorkout?.notes ?? ''}
      initialExercises={
        parsedExercises.length > 0 ? parsedExercises : (editWorkout?.workoutData.exercises ?? [])
      }
      storageKey={storageKey}
      templates={templates}
      headerSlot={assigneePicker}
      submitLabel={editWorkout ? 'Сохранить' : 'Создать тренировку'}
      notesLabel="Комментарий"
      notesPlaceholder="По желанию: указания атлету, самочувствие, напоминания — не для разбора в упражнения"
      hideExerciseWeights
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  );

  const activeForm = quickMode ? quickForm : formBase;

  if (noCard) return activeForm;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      className="rounded-2xl border border-(--color_border) overflow-hidden"
      style={{ backgroundColor: 'var(--color_bg_card)' }}
    >
      <div className="px-4 pt-4 pb-3 border-b border-(--color_border) flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">
          {editWorkout ? 'Редактировать тренировку' : 'Создать тренировку'}
        </h3>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <XMarkIcon className="w-4 h-4 text-white" />
          </button>
        )}
      </div>
      <div className="px-4 py-4">{activeForm}</div>
    </motion.div>
  );
}
