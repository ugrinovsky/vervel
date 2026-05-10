import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { getDaysInMonth, startOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  useSensors,
  useSensor,
  PointerSensor,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, Modifier } from '@dnd-kit/core';
import Screen from '@/components/Screen/Screen';
import AccentButton from '@/components/ui/AccentButton';
import AppInput from '@/components/ui/AppInput';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import WorkoutInlineForm from '@/components/WorkoutInlineForm/WorkoutInlineForm';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import Calendar, { type TrainerDayData } from '@/components/ui/Calendar';
import {
  trainerApi,
  type ScheduledWorkout,
  type AthleteListItem,
  type TrainerGroupItem,
  type TrainerLead,
} from '@/api/trainer';
import { toDateKey, parseApiDateTime, toApiDateTime, currentHourString } from '@/utils/date';
import {
  PlusIcon,
  CalendarDaysIcon,
  UserPlusIcon,
  PhoneIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';
import ScreenLinks from '@/components/ScreenLinks/ScreenLinks';
import ScreenHint from '@/components/ScreenHint/ScreenHint';
import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton';
import Tabs from '@/components/ui/Tabs';
import GhostButton from '@/components/ui/GhostButton';
import { WORKOUT_TYPE_CONFIG } from '@/constants/AnalyticsConstants';
import { useAuth } from '@/contexts/AuthContext';
import { parseTrainerWorkoutDraft } from '@/util/localStorageWorkoutDraft';
import { isRecord } from '@/utils/typeGuards';
import { noPullRefreshProps } from '@/lib/noPullRefresh';
import SectionGroup from '@/components/ui/SectionGroup';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

function isScheduledWorkoutDragPayload(v: unknown): v is ScheduledWorkout {
  if (!isRecord(v)) return false;
  if (typeof v.id !== 'number') return false;
  if (typeof v.scheduledDate !== 'string') return false;
  if (!isRecord(v.workoutData)) return false;
  if (!Array.isArray(v.workoutData.exercises)) return false;
  return true;
}

const WORKOUT_TYPE_COLORS: Record<string, string> = {
  crossfit: 'bg-white/10 ring-1 ring-inset ring-white/20',
  bodybuilding: 'bg-emerald-500/15 ring-1 ring-inset ring-emerald-500/30',
  cardio: 'bg-amber-500/15 ring-1 ring-inset ring-amber-500/30',
};

const TRAINER_DAY1_TIP_KEY = 'vervel_trainer_calendar_day1_tip_dismissed';

const INTRO_STRIPE_STYLE = {
  backgroundColor: 'rgba(14,165,233,0.12)',
  backgroundImage:
    'repeating-linear-gradient(45deg, rgba(56,189,248,0.18) 0px, rgba(56,189,248,0.18) 3px, transparent 3px, transparent 11px)',
} as const;

function formatRussianPhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return raw.startsWith('+') ? '+' : '';

  const d = digits.startsWith('7') || digits.startsWith('8') ? digits.slice(1) : digits;
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean);
  let formatted = '+7';
  if (parts[0]) formatted += ` (${parts[0]}`;
  if (parts[0]?.length === 3) formatted += ')';
  if (parts[1]) formatted += ` ${parts[1]}`;
  if (parts[2]) formatted += `-${parts[2]}`;
  if (parts[3]) formatted += `-${parts[3]}`;
  return formatted;
}

/** Лиды, с которых ещё ведём воронку (без финальных статусов) */
function isLeadSelectableForIntro(lead: TrainerLead): boolean {
  return lead.crmStatus !== 'converted' && lead.crmStatus !== 'lost';
}

const LEAD_PIPELINE_LABEL: Partial<Record<TrainerLead['crmStatus'], string>> = {
  new: 'новый',
  contacted: 'контакт',
  trial: 'пробное',
};

// Hours shown on timeline (7:00 – 23:00)
const TIMELINE_HOURS = Array.from({ length: 17 }, (_, i) => i + 7);

function formatHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

function getWorkoutHour(scheduledDate: string): number {
  return parseApiDateTime(scheduledDate).getHours();
}

function getWorkoutMinutes(scheduledDate: string): string {
  return parseApiDateTime(scheduledDate).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAssignedTo(
  assignedTo: ScheduledWorkout['assignedTo'],
  nicknames: Map<number, string>
): string {
  if (assignedTo.length === 0) return '';
  if (assignedTo.length === 1) {
    const a = assignedTo[0];
    const icon = a.type === 'group' ? '👥' : '🏃';
    const name = a.type === 'athlete' ? (nicknames.get(a.id) ?? a.name) : a.name;
    return `${icon} ${name}`;
  }
  const groups = assignedTo.filter((a) => a.type === 'group').length;
  const athletes = assignedTo.filter((a) => a.type === 'athlete').length;
  const parts: string[] = [];
  if (groups > 0) parts.push(`👥 ${groups}`);
  if (athletes > 0) parts.push(`🏃 ${athletes}`);
  return parts.join(' · ');
}

// ── Drag sub-components ───────────────────────────────────────────────────────

function WorkoutCardInner({
  workout,
  nicknames,
}: {
  workout: ScheduledWorkout;
  nicknames: Map<number, string>;
}) {
  const isIntro = workout.workoutData.type === 'intro';

  if (isIntro) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <UserPlusIcon className="w-3.5 h-3.5 text-sky-300 shrink-0" />
        <span className="text-sm font-medium text-sky-500 truncate">
          {workout.workoutData.clientName || 'Вводная'}
        </span>
        {workout.workoutData.clientPhone && (
          <span className="text-xs text-sky-300/70 font-mono truncate">
            {workout.workoutData.clientPhone}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-xs font-mono text-white/70 shrink-0">
        {getWorkoutMinutes(workout.scheduledDate)}
      </span>
      <span className="text-sm font-medium text-white truncate">
        {WORKOUT_TYPE_CONFIG[workout.workoutData.type] ?? workout.workoutData.type}
      </span>
      {workout.assignedTo.length > 0 && (
        <span className="text-xs text-white/60 truncate">
          {formatAssignedTo(workout.assignedTo, nicknames)}
        </span>
      )}
    </div>
  );
}

function DraggableWorkout({
  workout,
  nicknames,
  isEditing,
  onEdit,
  onDelete,
}: {
  workout: ScheduledWorkout;
  nicknames: Map<number, string>;
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: workout.id,
    data: { workout },
  });

  const isIntro = workout.workoutData.type === 'intro';

  /* Корень без CSS transform: @dnd-kit измеряет getBoundingClientRect(ref); motion с translate
   * на том же узле даёт смещение «призрака» DragOverlay относительно курсора. */
  return (
    <div
      ref={setNodeRef}
      {...noPullRefreshProps}
      onClick={onEdit}
      {...listeners}
      {...attributes}
      style={isIntro ? INTRO_STRIPE_STYLE : undefined}
      className={`relative rounded-xl px-3 h-9 flex items-center justify-between gap-2 touch-none select-none cursor-grab active:cursor-grabbing overflow-hidden ${
        isEditing ? 'ring-2 ring-white/40' : ''
      } ${isIntro ? 'ring-1 ring-inset ring-sky-400/40' : (WORKOUT_TYPE_COLORS[workout.workoutData.type] ?? 'bg-(--color_bg_card)')}`}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isDragging ? 0 : 1 }}
        className="flex min-w-0 flex-1 items-center justify-between gap-2"
      >
        <WorkoutCardInner workout={workout} nicknames={nicknames} />
        <div onPointerDown={(e) => e.stopPropagation()}>
          <ConfirmDeleteButton onConfirm={onDelete} variant="overlay" overlayRounded="rounded-xl" />
        </div>
      </motion.div>
    </div>
  );
}

function DroppableHour({
  hour,
  children,
  isCurrentHour,
  nowHour,
  nowMinutes,
}: {
  hour: number;
  children: React.ReactNode;
  isCurrentHour: boolean;
  nowHour: number;
  nowMinutes: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `hour-${hour}` });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 border-l border-(--color_border) pl-3 py-1 mb-0.5 relative transition-colors duration-100 ${
        isOver ? 'bg-white/5' : ''
      }`}
    >
      {isCurrentHour && (
        <div
          className="absolute left-0 right-0 flex items-center pointer-events-none z-10"
          style={{ top: `${(nowMinutes / 60) * 100}%` }}
        >
          <div className="w-2 h-2 rounded-full bg-red-400 shrink-0 -ml-1" />
          <div className="flex-1 h-px bg-red-400/70" />
          <span className="text-[10px] text-red-400 font-mono shrink-0 ml-1">
            {String(nowHour).padStart(2, '0')}:{String(nowMinutes).padStart(2, '0')}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

// ── Intro session form ────────────────────────────────────────────────────────

function IntroSessionForm({
  scheduledAt,
  editWorkout,
  crmEnabled,
  onSuccess,
  onCancel,
  draftKey,
}: {
  scheduledAt: string;
  editWorkout?: ScheduledWorkout;
  /** Настройка «CRM» (featTrainerCrm): при false блок выбора лида скрыт */
  crmEnabled: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  draftKey?: string;
}) {
  const [clientName, setClientName] = useState(editWorkout?.workoutData.clientName ?? '');
  const [clientPhone, setClientPhone] = useState(editWorkout?.workoutData.clientPhone ?? '');
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(
    editWorkout?.trainerLeadId ?? null
  );
  const [leads, setLeads] = useState<TrainerLead[]>([]);
  const [phoneError, setPhoneError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!crmEnabled) return;
    let cancelled = false;
    trainerApi
      .listLeads()
      .then((res) => {
        if (!cancelled) setLeads(res.data.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [crmEnabled]);

  useEffect(() => {
    if (crmEnabled || editWorkout) return;
    setSelectedLeadId(null);
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed) || !('leadId' in parsed)) return;
      const next = { ...parsed };
      delete next.leadId;
      if (next.clientName || next.clientPhone) {
        localStorage.setItem(draftKey, JSON.stringify(next));
      } else {
        localStorage.removeItem(draftKey);
      }
    } catch {
      /* ignore */
    }
  }, [crmEnabled, editWorkout, draftKey]);

  useEffect(() => {
    if (editWorkout || !draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.clientName) setClientName(d.clientName);
        if (d.clientPhone) setClientPhone(d.clientPhone);
        if (typeof d.leadId === 'number') setSelectedLeadId(d.leadId);
      }
    } catch {}
  }, [draftKey, editWorkout]);

  useEffect(() => {
    if (!draftKey || editWorkout) return;
    if (!clientName && !clientPhone && selectedLeadId == null) return;
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          clientName,
          clientPhone,
          ...(selectedLeadId != null ? { leadId: selectedLeadId } : {}),
        })
      );
    } catch {}
  }, [clientName, clientPhone, selectedLeadId, draftKey, editWorkout]);

  const leadOptions = useMemo(() => {
    const pipeline = leads
      .filter(isLeadSelectableForIntro)
      .sort((a, b) =>
        String(b.updatedAt ?? b.createdAt).localeCompare(
          String(a.updatedAt ?? a.createdAt),
          undefined,
          { numeric: true }
        )
      );
    const fk = editWorkout?.trainerLeadId;
    if (fk != null && !pipeline.some((l) => l.id === fk)) {
      const cur = leads.find((l) => l.id === fk);
      return cur ? [cur, ...pipeline.filter((l) => l.id !== cur.id)] : pipeline;
    }
    return pipeline;
  }, [leads, editWorkout?.trainerLeadId]);

  const onLeadChange = (value: string) => {
    if (value === '') {
      setSelectedLeadId(null);
      return;
    }
    const id = Number(value);
    const lead = leads.find((l) => l.id === id);
    setSelectedLeadId(id);
    if (lead) {
      setClientName(lead.name);
      if (lead.phone) setClientPhone(formatRussianPhone(lead.phone));
      setPhoneError('');
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow only: digits, +, space, (, ), -
    if (raw && /[^\d\s\+\(\)\-]/.test(raw)) return;
    const formatted = raw === '' ? '' : formatRussianPhone(raw);
    setClientPhone(formatted);
    setPhoneError('');
  };

  const validatePhone = (): boolean => {
    if (!clientPhone) return true; // optional
    const digits = clientPhone.replace(/\D/g, '');
    if (digits.length < 11) {
      setPhoneError('Введите полный номер телефона');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;
    if (!validatePhone()) return;
    setSaving(true);
    try {
      const workoutData = {
        type: 'intro' as const,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim() || undefined,
        exercises: [],
      };
      const leadPayload =
        crmEnabled && selectedLeadId != null ? { trainerLeadId: selectedLeadId } : {};

      if (editWorkout) {
        await trainerApi.updateScheduledWorkout(editWorkout.id, {
          scheduledDate: scheduledAt,
          workoutData,
          assignedTo: [],
          ...(crmEnabled
            ? {
                trainerLeadId: selectedLeadId,
              }
            : {}),
        });
        toast.success('Вводная обновлена');
      } else {
        await trainerApi.createScheduledWorkout({
          scheduledDate: scheduledAt,
          workoutData,
          assignedTo: [],
          ...leadPayload,
        });
        if (draftKey) localStorage.removeItem(draftKey);
        toast.success('Вводная добавлена');
      }
      onSuccess();
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const showLeadPicker = crmEnabled;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Badge */}
      <div
        className="rounded-xl p-3 flex items-center gap-3 ring-1 ring-sky-400/30"
        style={INTRO_STRIPE_STYLE}
      >
        <div className="w-9 h-9 rounded-lg bg-sky-400/20 flex items-center justify-center shrink-0">
          <UserPlusIcon className="w-5 h-5 text-sky-300" />
        </div>
        <div>
          <div className="text-sm font-semibold text-sky-500">Вводная тренировка</div>
          <div className="text-xs text-(--color_text_muted)">Слот занят — клиент без аккаунта</div>
        </div>
      </div>

      {showLeadPicker ? (
        <div>
          <label className="block text-xs text-(--color_text_muted) mb-1.5">
            Лид из CRM <span className="text-white/35">необязательно</span>
          </label>
          <select
            value={selectedLeadId ?? ''}
            onChange={(e) => onLeadChange(e.target.value)}
            className="w-full py-2.5 px-3 rounded-xl bg-(--color_bg_card_hover) text-white text-sm border border-transparent focus:border-sky-400/40 focus:ring-1 focus:ring-sky-400/30 outline-none appearance-none bg-[length:14px_10px] bg-[right_14px_center] bg-no-repeat"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
            }}
          >
            <option value="">Без привязки к лиду</option>
            {leadOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
                {LEAD_PIPELINE_LABEL[l.crmStatus]
                  ? ` · ${LEAD_PIPELINE_LABEL[l.crmStatus]}`
                  : ''}
              </option>
            ))}
          </select>
          {leadOptions.length === 0 && leads.filter(isLeadSelectableForIntro).length === 0 && (
            <p className="text-[11px] text-(--color_text_muted) mt-1.5 leading-snug">
              Нет лидов в воронке. Добавьте клиента на экране CRM или продолжайте только с именем
              здесь.
            </p>
          )}
        </div>
      ) : null}

      {/* Name */}
      <div>
        <label className="block text-xs text-(--color_text_muted) mb-1.5">Имя клиента *</label>
        <AppInput
          type="text"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="Иван Иванов"
          required
          className="py-2.5 px-3 rounded-xl bg-(--color_bg_card_hover) focus:ring-1 focus:ring-sky-400/50 focus:border-transparent"
        />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-xs text-(--color_text_muted) mb-1.5">
          <PhoneIcon className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
          Телефон
        </label>
        <AppInput
          type="tel"
          inputMode="numeric"
          value={clientPhone}
          onChange={handlePhoneChange}
          onBlur={validatePhone}
          placeholder="+7 (999) 000-00-00"
          maxLength={18}
          className="py-2.5 px-3 rounded-xl bg-(--color_bg_card_hover) font-mono tracking-wide focus:ring-1 focus:ring-sky-400/50 focus:border-transparent"
          error={phoneError || undefined}
        />
      </div>

      {/* Buttons */}
      <div className="flex gap-2 pt-1">
        <GhostButton
          variant="solid"
          type="button"
          onClick={() => {
            if (draftKey) localStorage.removeItem(draftKey);
            onCancel();
          }}
          className="flex-1"
        >
          Отмена
        </GhostButton>
        <button
          type="submit"
          disabled={saving || !clientName.trim()}
          className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-opacity ring-1 ring-sky-400/40"
          style={{
            background: 'linear-gradient(135deg, rgba(14,165,233,0.75), rgba(2,132,199,0.75))',
          }}
        >
          {saving ? 'Сохранение…' : editWorkout ? 'Сохранить' : 'Добавить'}
        </button>
      </div>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TrainerCalendarScreen() {
  const navigate = useNavigate();
  const today = new Date();
  const { user } = useAuth();
  const flags = useFeatureFlags();
  /** Тот же переключатель, что «CRM» в настройках профиля (featTrainerCrm) */
  const trainerCrmEnabled = user?.clientPreferences?.featTrainerCrm ?? true;
  const calendarMoreLinks = useMemo(() => {
    const links: Array<{
      emoji: string;
      bg: string;
      label: string;
      sub: string;
      to: string;
    }> = [];
    if (flags.teams) {
      links.push(
        {
          emoji: '🏃',
          bg: 'bg-emerald-500/20',
          label: 'Атлеты',
          sub: 'список атлетов',
          to: '/trainer/athletes',
        },
        {
          emoji: '👥',
          bg: 'bg-blue-500/20',
          label: 'Группы',
          sub: 'список групп',
          to: '/trainer/groups',
        }
      );
    }
    if (flags.trainerTemplates) {
      links.push({
        emoji: '📋',
        bg: 'bg-violet-500/20',
        label: 'Шаблоны',
        sub: 'готовые тренировки',
        to: '/trainer/templates',
      });
    }
    return links;
  }, [flags.trainerTemplates, flags.teams]);
  const introDraftKey = user ? `trainer_intro_draft_${user.id}` : undefined;

  const [day1TipDismissed, setDay1TipDismissed] = useState(() => {
    try {
      return localStorage.getItem(TRAINER_DAY1_TIP_KEY) === '1';
    } catch {
      return false;
    }
  });

  const trainerDraft = useMemo(() => {
    if (!user) return null;
    const raw = localStorage.getItem(`trainer_workout_draft_${user.id}`);
    if (!raw) return null;
    return parseTrainerWorkoutDraft(raw);
  }, [user]);

  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(today));
  const [workouts, setWorkouts] = useState<ScheduledWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [now, setNow] = useState(() => new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<ScheduledWorkout | null>(null);
  const [athletes, setAthletes] = useState<AthleteListItem[]>([]);
  const [groups, setGroups] = useState<TrainerGroupItem[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<ScheduledWorkout | null>(null);
  const [sheetTab, setSheetTab] = useState<'workout' | 'intro'>('workout');
  const [daySlotFilter, setDaySlotFilter] = useState<'all' | 'intros'>('all');
  const timelineRef = useRef<HTMLDivElement>(null);

  const restrictToTimeline = useMemo<Modifier>(
    () =>
      ({ transform, activeNodeRect }) => {
        const container = timelineRef.current;
        /* Только вертикаль: слоты по часам. x обнуляем после фикса ref/motion (иначе был offset). */
        if (!container || !activeNodeRect) return { ...transform, x: 0 };
        const containerRect = container.getBoundingClientRect();
        const minY = containerRect.top - activeNodeRect.top;
        const maxY = containerRect.bottom - activeNodeRect.bottom;
        return {
          ...transform,
          x: 0,
          y: Math.min(Math.max(transform.y, minY), maxY),
        };
      },
    []
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 300, tolerance: 5 },
    })
  );

  const loadWorkouts = async (month: Date) => {
    try {
      setLoading(true);
      const from = new Date(month.getFullYear(), month.getMonth(), 1);
      const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      const to = toDateKey(lastDay) + 'T23:59:59';
      const res = await trainerApi.getScheduledWorkouts(toDateKey(from), to);
      setWorkouts(res.data.data);
    } catch {
      toast.error('Ошибка загрузки тренировок');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkouts(currentMonth);
  }, [currentMonth]);

  useEffect(() => {
    trainerApi
      .listAthletes()
      .then((res) => setAthletes(res.data.data))
      .catch(() => {});
    trainerApi
      .listGroups()
      .then((res) => setGroups(res.data.data))
      .catch(() => {});
  }, []);

  const nicknames = useMemo(() => {
    const map = new Map<number, string>();
    for (const a of athletes) {
      if (a.nickname) map.set(a.id, a.nickname);
    }
    return map;
  }, [athletes]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(startOfMonth(month));
    setSelectedTime(null);
  };

  const calendarDays: TrainerDayData[] = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysCount = getDaysInMonth(currentMonth);

    const countByKey: Record<string, number> = {};
    const restByKey = new Set<string>();
    for (const w of workouts) {
      const key = toDateKey(parseApiDateTime(w.scheduledDate));
      if (w.workoutData.type === 'rest_day') {
        restByKey.add(key);
      } else {
        countByKey[key] = (countByKey[key] || 0) + 1;
      }
    }

    return Array.from({ length: daysCount }, (_, i) => {
      const date = new Date(year, month, i + 1);
      const key = toDateKey(date);
      return { date, count: countByKey[key] ?? 0, isRestDay: restByKey.has(key) };
    });
  }, [currentMonth, workouts]);

  const selectedKey = toDateKey(selectedDate);
  const selectedWorkouts = useMemo(
    () =>
      workouts
        .filter((w) => toDateKey(parseApiDateTime(w.scheduledDate)) === selectedKey)
        .sort(
          (a, b) =>
            parseApiDateTime(a.scheduledDate).getTime() -
            parseApiDateTime(b.scheduledDate).getTime()
        ),
    [workouts, selectedKey]
  );

  useEffect(() => {
    setDaySlotFilter('all');
  }, [selectedKey]);

  const hasIntroOnDay = useMemo(
    () => selectedWorkouts.some((w) => w.workoutData.type === 'intro'),
    [selectedWorkouts]
  );

  const restDayWorkout = useMemo(
    () => selectedWorkouts.find((w) => w.workoutData.type === 'rest_day') ?? null,
    [selectedWorkouts]
  );
  const isRestDay = restDayWorkout !== null;

  const [togglingRest, setTogglingRest] = useState(false);

  const toggleRestDay = async () => {
    setTogglingRest(true);
    try {
      const restRows = selectedWorkouts.filter((w) => w.workoutData.type === 'rest_day');
      if (restRows.length > 0) {
        for (const r of restRows) {
          await trainerApi.deleteScheduledWorkout(r.id);
        }
        toast.success(restRows.length > 1 ? 'Выходные дубли сняты' : 'Выходной снят');
      } else {
        await trainerApi.createScheduledWorkout({
          scheduledDate: `${selectedDateStr}T00:00:00`,
          workoutData: { type: 'rest_day', exercises: [] },
          assignedTo: [],
        });
        toast('🌙 Выходной отмечен', { duration: 2000 });
      }
      loadWorkouts(currentMonth);
    } catch {
      toast.error('Ошибка');
    } finally {
      setTogglingRest(false);
    }
  };

  const selectedSessionWorkouts = useMemo(
    () => selectedWorkouts.filter((w) => w.workoutData.type !== 'rest_day'),
    [selectedWorkouts]
  );

  const timelineWorkouts = useMemo(
    () =>
      daySlotFilter === 'intros'
        ? selectedWorkouts.filter((w) => w.workoutData.type === 'intro')
        : selectedSessionWorkouts,
    [selectedWorkouts, selectedSessionWorkouts, daySlotFilter]
  );

  const workoutsByHour = useMemo(() => {
    const map: Record<number, ScheduledWorkout[]> = {};
    for (const w of timelineWorkouts) {
      let h = getWorkoutHour(w.scheduledDate);
      if (h < 7) h = 7;
      if (h > 23) h = 23;
      if (!map[h]) map[h] = [];
      map[h].push(w);
    }
    return map;
  }, [timelineWorkouts]);

  const handleDelete = async (id: number) => {
    try {
      await trainerApi.deleteScheduledWorkout(id);
      toast.success('Тренировка удалена');
      loadWorkouts(currentMonth);
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const cur = event.active.data.current;
    if (!isRecord(cur) || !('workout' in cur)) return;
    const workout = cur.workout;
    if (!isScheduledWorkoutDragPayload(workout)) return;
    setActiveWorkout(workout);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveWorkout(null);
    const { active, over } = event;
    if (!over) return;

    const rawId = active.id;
    const workoutId = typeof rawId === 'number' ? rawId : Number(rawId);
    if (!Number.isFinite(workoutId)) return;
    const overRaw = over.id;
    if (typeof overRaw !== 'string' || !overRaw.startsWith('hour-')) return;
    const targetHour = parseInt(overRaw.replace('hour-', ''), 10);
    if (!Number.isFinite(targetHour)) return;
    const workout = workouts.find((w) => w.id === workoutId);
    if (!workout) return;

    const originalHour = getWorkoutHour(workout.scheduledDate);
    if (targetHour === originalHour) return;

    const originalDate = parseApiDateTime(workout.scheduledDate);
    const newDate = new Date(originalDate);
    newDate.setHours(targetHour, originalDate.getMinutes(), 0, 0);
    const newScheduledDate = toApiDateTime(newDate, newDate);

    // Optimistic update
    setWorkouts((prev) =>
      prev.map((w) => (w.id === workoutId ? { ...w, scheduledDate: newScheduledDate } : w))
    );

    try {
      await trainerApi.updateScheduledWorkout(workoutId, {
        scheduledDate: newScheduledDate,
        workoutData: workout.workoutData,
        assignedTo: workout.assignedTo,
      });
    } catch {
      toast.error('Ошибка перемещения');
      loadWorkouts(currentMonth);
    }
  };

  const isToday = toDateKey(selectedDate) === toDateKey(now);
  const nowHour = now.getHours();
  const nowMinutes = now.getMinutes();

  const selectedDateStr = toDateKey(selectedDate);

  const openFormAt = (time: string) => {
    setEditingWorkout(null);
    setSheetTab('workout');
    setSelectedTime(time);
  };

  const openDraftForm = useCallback(() => {
    if (!trainerDraft) return;
    const draftDateObj = new Date(trainerDraft.date);
    setSelectedDate(draftDateObj);
    setCurrentMonth(startOfMonth(draftDateObj));
    setEditingWorkout(null);
    setSheetTab('workout');
    setSelectedTime(trainerDraft.time ?? currentHourString());
  }, [trainerDraft]);

  const openEditForm = (workout: ScheduledWorkout) => {
    setSelectedTime(null);
    setEditingWorkout(workout);
  };

  const handleWorkoutSaved = (scheduledDate: string) => {
    const dt = parseApiDateTime(scheduledDate);
    const month = startOfMonth(dt);
    setSelectedDate(dt);
    setCurrentMonth(month);
    loadWorkouts(month);
  };

  const isCurrentMonthView =
    currentMonth.getFullYear() === today.getFullYear() &&
    currentMonth.getMonth() === today.getMonth();

  const showTrainerDay1Tip =
    !day1TipDismissed &&
    !loading &&
    (athletes.length === 0 || (athletes.length > 0 && workouts.length === 0 && isCurrentMonthView));

  const dismissTrainerDay1Tip = () => {
    try {
      localStorage.setItem(TRAINER_DAY1_TIP_KEY, '1');
    } catch {
      /* ignore */
    }
    setDay1TipDismissed(true);
  };

  return (
    <Screen className="trainer-calendar-screen" enablePullToRefresh={false}>
      <div className="flex flex-col px-4 w-full">
        <SectionGroup
          showLabel={false}
          showBreakAfter={false}
          className="shrink-0"
          bodyClassName="space-y-0"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="pt-4 pb-1"
          >
            <ScreenHeader
              icon="📅"
              title="Календарь"
              description="Планируйте тренировки для атлетов и групп по датам — нажмите на слот времени, чтобы назначить тренировку"
            />
            {showTrainerDay1Tip && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 rounded-2xl border border-(--color_primary_light)/35 bg-(--color_primary_light)/10 px-4 py-3"
              >
                <p className="text-sm font-semibold text-white mb-1.5">С чего начать</p>
                {athletes.length === 0 ? (
                  <p className="text-xs text-(--color_text_muted) leading-relaxed mb-3">
                    <span className="text-white/90">1.</span> Добавьте атлета — удобнее всего
                    пригласительная ссылка на экране «Атлеты».{' '}
                    <span className="text-white/90">2.</span> Вернитесь сюда и нажмите на время в
                    сетке — откроется назначение; атлеты получат план в чате.
                  </p>
                ) : (
                  <p className="text-xs text-(--color_text_muted) leading-relaxed mb-3">
                    Атлеты уже в списке — нажмите на слот времени в выбранном дне ниже и создайте
                    первую тренировку. После сохранения план уйдёт в чаты.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {athletes.length === 0 && (
                    <AccentButton size="sm" onClick={() => navigate('/trainer/athletes')}>
                      Открыть атлетов
                    </AccentButton>
                  )}
                  <GhostButton
                    variant="solid"
                    type="button"
                    className="!px-4 !py-2 text-xs"
                    onClick={dismissTrainerDay1Tip}
                  >
                    Понятно
                  </GhostButton>
                </div>
              </motion.div>
            )}
            <ScreenHint className="mb-2">
              Выберите день в календаре, нажмите на слот времени — откроется форма тренировки. Можно
              назначить{' '}
              <span className="text-white font-medium">сразу нескольким атлетам или группам</span>.
              Используйте шаблоны, чтобы не вводить упражнения заново.
            </ScreenHint>
            {trainerDraft && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-amber-300">Незаконченная тренировка</p>
                  <p className="text-xs text-amber-400/70 mt-0.5 truncate">
                    {trainerDraft.exercises.length} упр. ·{' '}
                    {trainerDraft.workoutType === 'bodybuilding'
                      ? 'Силовая'
                      : trainerDraft.workoutType === 'crossfit'
                        ? 'CrossFit'
                        : 'Кардио'}
                  </p>
                </div>
                <AccentButton size="sm" onClick={openDraftForm} className="shrink-0">
                  Продолжить
                </AccentButton>
              </motion.div>
            )}
          </motion.div>
        </SectionGroup>

        <SectionGroup title="Месяц" className="shrink-0" bodyClassName="space-y-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="pt-1 pb-1"
          >
            <Calendar
              mode="count"
              days={calendarDays}
              selectedDate={selectedDate}
              month={currentMonth}
              onSelect={(day) => {
                setSelectedDate(day.date);
                setSelectedTime(null);
              }}
              onTodayClick={(today) => {
                setSelectedDate(today);
                setSelectedTime(null);
              }}
              onMonthChange={handleMonthChange}
            />
          </motion.div>
        </SectionGroup>

        <SectionGroup title="Расписание дня" className="min-h-0 min-w-0" bodyClassName="space-y-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-xl px-4 pb-4"
          >
            {/* Day header */}
            <div className="flex items-center justify-between pt-3 pb-2 shrink-0">
              <div>
                <div className="text-sm font-semibold text-white capitalize flex items-center gap-1.5">
                  <CalendarDaysIcon className="w-4 h-4 text-(--color_text_muted) shrink-0" />
                  {selectedDate.toLocaleDateString('ru-RU', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </div>
                <div className="text-xs text-(--color_text_muted)">
                  {loading
                    ? '…'
                    : selectedSessionWorkouts.length === 0
                      ? isRestDay
                        ? 'Выходной — слотов нет'
                        : 'Нет тренировок — нажмите на слот ниже'
                      : daySlotFilter === 'intros'
                        ? timelineWorkouts.length === 0
                          ? 'Нет вводных в этот день'
                          : `${timelineWorkouts.length} вводных · всего ${selectedSessionWorkouts.length} слотов`
                        : `${selectedSessionWorkouts.length} тренировок`}
                </div>
                {hasIntroOnDay && selectedWorkouts.length > 0 && (
                  <Tabs
                    size="sm"
                    className="mt-2"
                    tabs={[
                      { id: 'all' as const, label: 'Все слоты' },
                      {
                        id: 'intros' as const,
                        label: trainerCrmEnabled ? 'Лиды' : 'Вводные',
                      },
                    ]}
                    active={daySlotFilter}
                    onChange={(id) => setDaySlotFilter(id)}
                  />
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={toggleRestDay}
                  disabled={togglingRest}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 disabled:opacity-40 ${
                    isRestDay
                      ? 'bg-slate-600/70 text-slate-300 ring-1 ring-slate-500/50 hover:bg-slate-500/70'
                      : 'bg-(--color_bg_card) text-(--color_text_muted) ring-1 ring-(--color_border) hover:text-white'
                  }`}
                >
                  <MoonIcon className={`w-3.5 h-3.5 ${isRestDay ? 'text-slate-300' : ''}`} />
                  {isRestDay ? 'Снять выходной' : 'Выходной'}
                </button>
                {selectedTime === null && !isRestDay && (
                  <AccentButton size="sm" onClick={() => openFormAt(currentHourString())}>
                    <PlusIcon className="w-4 h-4" />
                    Добавить
                  </AccentButton>
                )}
              </div>
            </div>

            {/* Rest day banner */}
            {isRestDay && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="my-4 rounded-2xl bg-slate-700/50 ring-1 ring-slate-500/40 px-5 py-6 flex flex-col items-center gap-3 text-center"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-600/60 flex items-center justify-center">
                  <MoonIcon className="w-6 h-6 text-slate-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Выходной день</p>
                  <p className="text-xs text-(--color_text_muted) mt-0.5">
                    Запись на тренировки недоступна
                  </p>
                </div>
                <button
                  onClick={toggleRestDay}
                  disabled={togglingRest}
                  className="mt-1 px-4 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-600/50 ring-1 ring-slate-500/40 hover:bg-slate-500/50 transition-colors disabled:opacity-40"
                >
                  Отменить выходной
                </button>
              </motion.div>
            )}

            {/* Timeline */}
            {!isRestDay && (
              <DndContext
                sensors={sensors}
                modifiers={[restrictToTimeline]}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div ref={timelineRef}>
                  {TIMELINE_HOURS.map((hour) => {
                    const hourWorkouts = workoutsByHour[hour] ?? [];
                    const hasWorkouts = hourWorkouts.length > 0;
                    const timeStr = formatHour(hour);
                    const isActive = selectedTime === timeStr;
                    const isCurrentHour = isToday && hour === nowHour;

                    return (
                      <div key={hour} className="flex gap-2 min-h-10 border-t border-white/4">
                        {/* Hour label */}
                        <div className="w-10 shrink-0 pt-1.5">
                          <span
                            className={`text-xs font-mono ${isCurrentHour ? 'text-red-400 font-semibold' : 'text-(--color_text_muted)'}`}
                          >
                            {timeStr}
                          </span>
                        </div>

                        {/* Droppable content area */}
                        <DroppableHour
                          hour={hour}
                          isCurrentHour={isCurrentHour}
                          nowHour={nowHour}
                          nowMinutes={nowMinutes}
                        >
                          {hasWorkouts ? (
                            <div className="space-y-1.5">
                              {hourWorkouts.map((workout, idx) => {
                                const isLast = idx === hourWorkouts.length - 1;
                                return (
                                  <div key={workout.id} className="h-9 flex items-center gap-2">
                                    <div className="flex-1 min-w-0 h-full">
                                      <DraggableWorkout
                                        workout={workout}
                                        nicknames={nicknames}
                                        isEditing={editingWorkout?.id === workout.id}
                                        onEdit={() => openEditForm(workout)}
                                        onDelete={() => handleDelete(workout.id)}
                                      />
                                    </div>
                                    {isLast && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openFormAt(timeStr);
                                        }}
                                        className={`shrink-0 text-xs transition-colors px-1 ${
                                          isActive
                                            ? 'text-emerald-400 hover:text-emerald-300'
                                            : 'text-(--color_text_muted) hover:text-white'
                                        }`}
                                      >
                                        + ещё
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            /* Empty slot — click to add */
                            <button
                              onClick={() => openFormAt(timeStr)}
                              className={`
                            w-full h-9 rounded-lg text-xs transition-all duration-150 text-left px-2
                            ${
                              isActive
                                ? 'bg-emerald-900/60 text-emerald-300 ring-1 ring-emerald-600'
                                : 'text-transparent hover:bg-(--color_bg_card_hover) hover:text-(--color_text_muted)'
                            }
                          `}
                            >
                              + добавить в {timeStr}
                            </button>
                          )}
                        </DroppableHour>
                      </div>
                    );
                  })}
                </div>

                {typeof document !== 'undefined' &&
                  createPortal(
                    <DragOverlay dropAnimation={null} zIndex={10050}>
                      {activeWorkout && (
                        <div
                          style={
                            activeWorkout.workoutData.type === 'intro'
                              ? INTRO_STRIPE_STYLE
                              : undefined
                          }
                          className={`w-full max-w-none box-border rounded-xl px-3 h-9 flex items-center justify-between gap-2 cursor-grabbing overflow-hidden ring-2 shadow-[0_0_20px_var(--color_primary_light)]/20 ${
                            activeWorkout.workoutData.type === 'intro'
                              ? 'ring-sky-400/60'
                              : `ring-white/60 ${WORKOUT_TYPE_COLORS[activeWorkout.workoutData.type] ?? 'bg-(--color_bg_card)'}`
                          }`}
                        >
                          <WorkoutCardInner workout={activeWorkout} nicknames={nicknames} />
                          <div className="invisible pointer-events-none">
                            <ConfirmDeleteButton onConfirm={() => {}} />
                          </div>
                        </div>
                      )}
                    </DragOverlay>,
                    document.body
                  )}
              </DndContext>
            )}
          </motion.div>
        </SectionGroup>

        <SectionGroup title="Ещё" className="shrink-0" showBreakAfter={false}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <ScreenLinks className="pb-4" links={calendarMoreLinks} />
          </motion.div>
        </SectionGroup>
      </div>

      <BottomSheet
        id="trainer-calendar-workout-form"
        open={selectedTime !== null || editingWorkout !== null}
        onClose={() => {
          setSelectedTime(null);
          setEditingWorkout(null);
        }}
        title={editingWorkout ? 'Редактировать тренировку' : 'Создать тренировку'}
        emoji={editingWorkout?.workoutData.type === 'intro' ? '🎯' : '💪'}
      >
        {editingWorkout ? (
          editingWorkout.workoutData.type === 'intro' ? (
            <IntroSessionForm
              key={editingWorkout.id}
              scheduledAt={editingWorkout.scheduledDate}
              editWorkout={editingWorkout}
              crmEnabled={trainerCrmEnabled}
              onSuccess={() => {
                setEditingWorkout(null);
                loadWorkouts(currentMonth);
              }}
              onCancel={() => setEditingWorkout(null)}
            />
          ) : (
            <WorkoutInlineForm
              key={editingWorkout.id}
              editWorkout={editingWorkout}
              noCard
              onSuccess={(scheduledDate) => {
                setEditingWorkout(null);
                handleWorkoutSaved(scheduledDate);
              }}
              onCancel={() => setEditingWorkout(null)}
            />
          )
        ) : selectedTime !== null ? (
          <>
            {/* Tabs */}
            <Tabs
              className="mb-5"
              active={sheetTab}
              onChange={(v) => setSheetTab(v)}
              tabs={[
                {
                  id: 'workout',
                  label: (
                    <span className="flex items-center gap-1.5">
                      <CalendarDaysIcon className="w-4 h-4" />
                      Тренировка
                    </span>
                  ),
                },
                {
                  id: 'intro',
                  label: (
                    <span className="flex items-center gap-1.5">
                      <UserPlusIcon className="w-4 h-4" />
                      Вводная
                    </span>
                  ),
                },
              ]}
            />

            {sheetTab === 'workout' ? (
              <WorkoutInlineForm
                key={`${selectedDateStr}-${selectedTime}`}
                preselectedDate={selectedDateStr}
                preselectedTime={selectedTime}
                initialGroups={groups}
                initialAthletes={athletes}
                noCard
                onSuccess={(scheduledDate) => {
                  setSelectedTime(null);
                  handleWorkoutSaved(scheduledDate);
                }}
                onCancel={() => setSelectedTime(null)}
              />
            ) : (
              <IntroSessionForm
                key={`intro-${selectedDateStr}-${selectedTime}`}
                scheduledAt={`${selectedDateStr}T${selectedTime}:00`}
                draftKey={introDraftKey}
                crmEnabled={trainerCrmEnabled}
                onSuccess={() => {
                  setSelectedTime(null);
                  loadWorkouts(currentMonth);
                }}
                onCancel={() => setSelectedTime(null)}
              />
            )}
          </>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}
