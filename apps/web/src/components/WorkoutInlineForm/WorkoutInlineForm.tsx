import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { parseLocalDate, parseApiDateTime, toApiDateTime, toDateKey, toTimeKey } from '@/utils/date';
import toast from 'react-hot-toast';
import WorkoutFormBase, { type WorkoutFormData } from '@/components/WorkoutFormBase/WorkoutFormBase';
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
import { XMarkIcon } from '@heroicons/react/24/outline';
import Tabs from '@/components/ui/Tabs';
import { useAuth } from '@/contexts/AuthContext';

function buildWorkoutPreviewMessage(
  date: Date,
  time: Date,
  type: 'crossfit' | 'bodybuilding' | 'cardio',
  exercises: ExerciseData[],
  notes?: string,
  scheduledWorkoutId?: number,
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
  onSuccess?: () => void;
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

  const showAssigneePicker = !preselectedAssignee;

  useEffect(() => {
    trainerApi.getWorkoutTemplates().then((res) => setTemplates(res.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!showAssigneePicker) return;
    if (initialGroups && initialAthletes) return;
    const load = async () => {
      try {
        setLoadingAssignees(true);
        const [groupsRes, athletesRes] = await Promise.all([
          trainerApi.listGroups(),
          trainerApi.listAthletes(),
        ]);
        setGroups(groupsRes.data.data);
        setAthletes(athletesRes.data.data);
      } catch { /* silent */ }
      finally { setLoadingAssignees(false); }
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
      return exists ? prev.filter((a) => !(a.type === 'group' && a.id === group.id)) : [...prev, item];
    });
  };

  const selectAthlete = (athlete: AthleteListItem) => {
    const item: AssignedTo = { type: 'athlete', id: athlete.id, name: athlete.fullName || athlete.email };
    setSelectedAssignees((prev) => {
      const already = prev.length === 1 && prev[0].type === 'athlete' && prev[0].id === athlete.id;
      return already ? [] : [item];
    });
  };

  const isGroupSelected = (id: number) => selectedAssignees.some((a) => a.type === 'group' && a.id === id);
  const isAthleteSelected = (id: number) => selectedAssignees.some((a) => a.type === 'athlete' && a.id === id);

  // ── Initial values ────────────────────────────────────────────────

  const initialDate = (() => {
    if (editWorkout) return parseApiDateTime(editWorkout.scheduledDate);
    if (preselectedDate) return parseLocalDate(preselectedDate);
    return undefined;
  })();

  const initialTime = (() => {
    if (editWorkout) return parseApiDateTime(editWorkout.scheduledDate);
    const d = new Date();
    if (preselectedTime) {
      const [h, m] = preselectedTime.split(':').map(Number);
      d.setHours(h, m, 0, 0);
    } else {
      d.setHours(9, 0, 0, 0);
    }
    return d;
  })();

  // ── Submit ────────────────────────────────────────────────────────

  const handleSubmit = async (data: WorkoutFormData) => {
    const assignedTo = preselectedAssignee ? [preselectedAssignee] : selectedAssignees;

    const scheduledDate = toApiDateTime(data.date, data.time);
    const normalizedExercises = data.exercises.map((ex) => {
      if (data.workoutType !== 'bodybuilding' || ex.duration != null || !ex.setsDetail?.length) return ex;
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
        const previewMessage = buildWorkoutPreviewMessage(data.date, data.time, data.workoutType, data.exercises, data.notes, scheduledWorkoutId);
        await Promise.all(assignedTo.map(async (a) => {
          try {
            const chatRes = a.type === 'group'
              ? await trainerApi.getOrCreateGroupChat(a.id)
              : await trainerApi.getOrCreateAthleteChat(a.id);
            await trainerApi.sendMessage(chatRes.data.data.chatId, previewMessage);
          } catch { /* silent */ }
        }));
        toast.success('Тренировка создана');
      }
      onSuccess?.();
    } catch {
      toast.error(editWorkout ? 'Ошибка обновления тренировки' : 'Ошибка создания тренировки');
      throw new Error('submit failed');
    }
  };

  // ── Assignee picker (passed as headerSlot) ────────────────────────

  const assigneePicker = preselectedAssignee ? (
    <div>
      <SectionLabel>Для кого</SectionLabel>
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-(--color_bg_card_hover) border border-(--color_border)">
        <span>{preselectedAssignee.type === 'group' ? '👥' : '🏃'}</span>
        <span className="text-sm text-white">{preselectedAssignee.name}</span>
      </div>
    </div>
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
                onClick={() => setSelectedAssignees((prev) => prev.filter((x) => !(x.type === a.type && x.id === a.id)))}
                className="ml-0.5 hover:opacity-70"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <Tabs
        className="mb-2.5"
        size="sm"
        active={assigneeMode}
        onChange={(v) => switchMode(v as 'group' | 'athlete')}
        tabs={[
          { id: 'group', label: '👥 Группа' },
          { id: 'athlete', label: '🏃 Персональная' },
        ]}
      />

      {loadingAssignees ? (
        <div className="rounded-xl bg-(--color_bg_card_hover) border border-(--color_border) flex items-center justify-center py-2.5">
          <div className="w-4 h-4 border border-white/20 border-t-(--color_primary_light) rounded-full animate-spin" />
        </div>
      ) : (
        <div className="max-h-44 overflow-y-auto rounded-xl bg-(--color_bg_card_hover) divide-y divide-(--color_border) border border-(--color_border)">
          {assigneeMode === 'group' && groups.length === 0 && (
            <div className="text-xs text-(--color_text_muted) text-center py-4">Нет групп</div>
          )}
          {assigneeMode === 'athlete' && athletes.length === 0 && (
            <div className="text-xs text-(--color_text_muted) text-center py-4">Нет атлетов</div>
          )}
          {assigneeMode === 'group' && groups.map((group) => (
            <button
              key={`group-${group.id}`}
              onClick={() => toggleGroup(group)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors ${
                isGroupSelected(group.id) ? 'bg-(--color_primary_light) text-white' : 'text-white hover:bg-(--color_border)'
              }`}
            >
              <span>👥</span>
              <span className="truncate font-medium">{group.name}</span>
              <span className="ml-auto text-xs opacity-60 shrink-0">{group.athleteCount} чел.</span>
            </button>
          ))}
          {assigneeMode === 'athlete' && athletes.map((athlete) => (
            <button
              key={`athlete-${athlete.id}`}
              onClick={() => selectAthlete(athlete)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm text-left transition-colors ${
                isAthleteSelected(athlete.id) ? 'bg-(--color_primary_light) text-white' : 'text-white hover:bg-(--color_border)'
              }`}
            >
              <span>🏃</span>
              <span className="truncate">{athlete.fullName || athlete.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  /* ─── Render ─────────────────────────────────────────────────────── */

  const formBase = (
    <WorkoutFormBase
      initialDate={initialDate}
      initialTime={initialTime}
      initialType={editWorkout?.workoutData.type !== 'intro' ? editWorkout?.workoutData.type : undefined}
      initialNotes={editWorkout?.notes ?? ''}
      initialExercises={editWorkout?.workoutData.exercises ?? []}
      storageKey={storageKey}
      templates={templates}
      headerSlot={assigneePicker}
      submitLabel={editWorkout ? 'Сохранить' : 'Создать тренировку'}
      notesLabel="Программа или комментарий"
      notesPlaceholder="Напишите программу тренировки или комментарий — можно сконвертировать в упражнения через AI"
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  );

  if (noCard) return formBase;

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
      <div className="px-4 py-4">{formBase}</div>
    </motion.div>
  );
}
