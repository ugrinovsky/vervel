import { useEffect, useState, useCallback, type JSX } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import AccentButton from '@/components/ui/AccentButton';
import GhostButton from '@/components/ui/GhostButton';
import WorkoutFormBase, {
  type WorkoutFormData,
} from '@/components/WorkoutFormBase/WorkoutFormBase';
import AthleteQrCode from '@/components/AthleteQrCode/AthleteQrCode';
import OnboardingPwaPushSection from '@/components/OnboardingPwaPushSection/OnboardingPwaPushSection';
import Switch from '@/components/ui/Switch';
import { useAuth, useActiveMode } from '@/contexts/AuthContext';
import { workoutsApi } from '@/api/workouts';
import { profileApi } from '@/api/profile';
import { toApiDateTime } from '@/utils/date';
import { exerciseDataToWorkoutExercise } from '@/util/workoutExerciseConversions';
import { checkForNewAchievements } from '@/hooks/useAchievementToast';
import {
  applyUiMode,
  MODE_FLAGS,
  useFeatureFlags,
  type FeatureFlags,
} from '@/hooks/useFeatureFlags';
import type { ClientPreferences } from '@/types/clientPreferences';
import { getTrainerGettingStartedSteps } from '@/util/trainerOnboarding';
import { parseStoredAuthUserJson } from '@/util/parseStoredAuthUser';
import { workoutTypeForAthletePrimaryGoal } from '@/util/athletePrimaryGoalWorkoutType';
import { DEFAULT_WORKOUT_TYPE } from '@/constants/workoutTypes';
import { shouldShowOnboarding } from '@/util/shouldShowOnboarding';

// ─── Step types ──────────────────────────────────────────────────────────────

type Step = 'scenario' | 'clarify' | 'mode' | 'action' | 'done';

type AthleteScenario = 'solo' | 'with_coach' | 'in_team';
type TrainerScenario = 'individual' | 'groups' | 'both';
type Scenario = AthleteScenario | TrainerScenario;

// ─── Progress helpers ─────────────────────────────────────────────────────────

const STEPS: Step[] = ['scenario', 'clarify', 'mode', 'action', 'done'];
const TRAINER_ONBOARDING_STEPS: Step[] = ['scenario', 'mode', 'action', 'done'];

function progressFor(step: Step, isTrainerPath: boolean): { current: number; total: number } {
  if (isTrainerPath) {
    const idx = TRAINER_ONBOARDING_STEPS.indexOf(step);
    return {
      current: idx >= 0 ? idx + 1 : TRAINER_ONBOARDING_STEPS.length,
      total: TRAINER_ONBOARDING_STEPS.length,
    };
  }
  return { current: STEPS.indexOf(step) + 1, total: STEPS.length };
}

// ─── Feature spoiler config ──────────────────────────────────────────────────

type FeatKey = keyof (typeof MODE_FLAGS)['pro'];

const FEAT_ITEMS: Array<{ key: FeatKey; label: string; hint?: string }> = [
  { key: 'featAi', label: 'AI-генерация тренировки', hint: '10 ₽ / запрос' },
  { key: 'featAi', label: 'AI-распознавание по фото', hint: '9 ₽ / запрос' },
  { key: 'featAnalytics', label: 'Аналитика по периодам' },
  { key: 'featProgression', label: 'Сила и прогрессия' },
  { key: 'featAdvancedAnalytics', label: 'Сложная аналитика (ATL/CTL, ACWR)' },
  { key: 'featAvatar', label: 'Карта нагрузки' },
  { key: 'featTeams', label: 'Атлеты и группы', hint: 'у атлета — экран «Моя команда»' },
  { key: 'featDialogs', label: 'Диалоги и чаты' },
  { key: 'featLeaderboard', label: 'Лидерборд' },
  { key: 'featStreaks', label: 'Серии и достижения' },
  { key: 'featVideoCalls', label: 'Видеозвонки' },
];

// Deduplicate by key for display (AI shown once with combined hint)
const UNIQUE_FEAT_ITEMS = [
  { key: 'featAi' as FeatKey, label: 'AI-ассистент', hint: 'генерация, распознавание, чат' },
  { key: 'featAnalytics' as FeatKey, label: 'Аналитика по периодам' },
  { key: 'featProgression' as FeatKey, label: 'Сила и прогрессия' },
  { key: 'featAdvancedAnalytics' as FeatKey, label: 'Сложная аналитика (ATL/CTL, ACWR)' },
  { key: 'featAvatar' as FeatKey, label: 'Карта нагрузки' },
  {
    key: 'featTeams' as FeatKey,
    label: 'Атлеты и группы',
    hint: '«Моя команда», приглашения, чаты с тренером',
  },
  { key: 'featDialogs' as FeatKey, label: 'Диалоги и чаты' },
  { key: 'featLeaderboard' as FeatKey, label: 'Лидерборд' },
  { key: 'featStreaks' as FeatKey, label: 'Серии и достижения' },
  { key: 'featVideoCalls' as FeatKey, label: 'Видеозвонки' },
];

const TRAINER_ONBOARDING_EXTRA_FEAT_KEYS = ['featTrainerTemplates', 'featTrainerLibrary'] as const;

function featFlagsFromPrefs(p: ClientPreferences): Partial<Record<FeatKey, boolean>> {
  const init: Partial<Record<FeatKey, boolean>> = {};
  for (const { key } of UNIQUE_FEAT_ITEMS) {
    const v = p[key];
    if (typeof v === 'boolean') init[key] = v;
  }
  for (const key of TRAINER_ONBOARDING_EXTRA_FEAT_KEYS) {
    const v = p[key];
    if (typeof v === 'boolean') init[key] = v;
  }
  return init;
}

/**
 * Тренеру в настройках не показывают athleteOnly-флаги (аналитика дневника, avatar, серии…).
 * Спойлер онбординга совпадает с тем, что реально есть в «Функции приложения» для кабинета тренера.
 */
const TRAINER_SPOILER_FLAG_MAP = {
  featAi: 'ai',
  featTrainerTemplates: 'trainerTemplates',
  featTrainerLibrary: 'trainerLibrary',
  featTeams: 'teams',
  featDialogs: 'dialogs',
  featLeaderboard: 'leaderboard',
  featVideoCalls: 'videoCalls',
} as const satisfies Record<string, keyof FeatureFlags>;

const TRAINER_SPOILER_ITEMS: Array<{
  key: keyof typeof TRAINER_SPOILER_FLAG_MAP;
  label: string;
  hint?: string;
}> = [
  {
    key: 'featAi',
    label: 'AI-функции',
    hint: 'Генерация, распознавание по фото, чат',
  },
  {
    key: 'featTrainerTemplates',
    label: 'Шаблоны тренировок',
    hint: 'Сохранённые программы',
  },
  {
    key: 'featTrainerLibrary',
    label: 'Каталог упражнений',
    hint: 'Справочник движений',
  },
  {
    key: 'featTeams',
    label: 'Атлеты и группы',
    hint: 'вкладка «Команда», приглашения, назначения',
  },
  { key: 'featDialogs', label: 'Диалоги и чаты' },
  { key: 'featLeaderboard', label: 'Лидерборд' },
  { key: 'featVideoCalls', label: 'Видеозвонки' },
];

function trainerSpoilerSwitchChecked(
  key: keyof typeof TRAINER_SPOILER_FLAG_MAP,
  local: Partial<Record<FeatKey, boolean>>,
  prefs: FeatureFlags
): boolean {
  const lv = local[key as FeatKey];
  if (typeof lv === 'boolean') return lv;
  return prefs[TRAINER_SPOILER_FLAG_MAP[key]];
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingScreen(): JSX.Element {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { activeMode } = useActiveMode();
  const isTrainerPath =
    !!user && (user.role === 'trainer' || (user.role === 'both' && activeMode === 'trainer'));

  const [step, setStep] = useState<Step>('scenario');
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [workoutInputMode, setWorkoutInputMode] = useState<'ai' | 'manual' | null>(null);
  const [spoilerOpen, setSpoilerOpen] = useState(false);
  const [localFlags, setLocalFlags] = useState<Partial<Record<FeatKey, boolean>>>({});
  const [copiedEmail, setCopiedEmail] = useState(false);
  /** Подзаголовок финального шага атлета (например после «пропустить тренировку»). */
  const [athleteDoneSubtitleOverride, setAthleteDoneSubtitleOverride] = useState<string | undefined>(
    undefined
  );

  // Redirect if onboarding already done
  useEffect(() => {
    if (!user || step === 'done') return;
    if (!shouldShowOnboarding(user, activeMode)) {
      navigate(isTrainerPath ? '/trainer' : '/home', { replace: true });
    }
  }, [user, activeMode, navigate, step, isTrainerPath]);

  // Sync local flags from prefs when mode step loads
  useEffect(() => {
    if (step === 'action' && user?.clientPreferences) {
      setLocalFlags(featFlagsFromPrefs(user.clientPreferences));
    }
  }, [step, user?.clientPreferences]);

  const { current: progress, total: totalSteps } = progressFor(step, isTrainerPath);

  // ─── Skip ─────────────────────────────────────────────────────────────────

  const handleSkip = useCallback(() => {
    if (!user) return;
    const patch = isTrainerPath
      ? { trainerOnboardingComplete: true }
      : { athleteOnboardingComplete: true };
    updateUser({ ...user, clientPreferences: { ...user.clientPreferences, ...patch } });
    navigate(isTrainerPath ? '/trainer' : '/home', { replace: true });
    void profileApi
      .patchClientPreferences(patch)
      .then((res) => {
        const raw = localStorage.getItem('user');
        if (!raw) return;
        const u = parseStoredAuthUserJson(raw);
        if (!u) return;
        updateUser({ ...u, clientPreferences: res.data.data.clientPreferences });
      })
      .catch(() => toast.error('Не удалось сохранить. Проверьте сеть.'));
  }, [user, updateUser, navigate, isTrainerPath]);

  // ─── Scenario select ──────────────────────────────────────────────────────

  const selectScenario = useCallback(
    async (s: Scenario) => {
      if (!user) return;
      setScenario(s);
      try {
        const isAthlete = !isTrainerPath;
        let patch: Partial<ClientPreferences>;
        if (isAthlete) {
          if (s !== 'solo' && s !== 'with_coach' && s !== 'in_team') return;
          patch = {
            athleteScenario: s,
            athleteCoachIntent: s === 'in_team' ? 'with_coach' : s,
          };
        } else {
          if (s !== 'individual' && s !== 'groups' && s !== 'both') return;
          patch = { trainerWorkStyle: s };
        }
        const res = await profileApi.patchClientPreferences(patch);
        updateUser({ ...user, clientPreferences: res.data.data.clientPreferences });
        setStep(isTrainerPath ? 'mode' : 'clarify');
      } catch {
        toast.error('Не удалось сохранить выбор. Проверьте сеть.');
      }
    },
    [user, updateUser, isTrainerPath]
  );

  // ─── Goal select (athlete solo) ───────────────────────────────────────────

  const selectGoal = useCallback(
    async (goal: NonNullable<ClientPreferences['athletePrimaryGoal']>) => {
      if (!user) return;
      try {
        const res = await profileApi.patchClientPreferences({ athletePrimaryGoal: goal });
        updateUser({ ...user, clientPreferences: res.data.data.clientPreferences });
        setStep('mode');
      } catch {
        toast.error('Не удалось сохранить. Проверьте сеть.');
      }
    },
    [user, updateUser]
  );

  // ─── Mode select ──────────────────────────────────────────────────────────

  const selectMode = useCallback(
    async (mode: NonNullable<ClientPreferences['uiMode']>) => {
      if (!user) return;
      try {
        const prefs = await applyUiMode(mode);
        updateUser({ ...user, clientPreferences: prefs });
        setStep('action');
      } catch {
        toast.error('Не удалось сохранить режим. Проверьте сеть.');
      }
    },
    [user, updateUser]
  );

  // ─── Feature flag toggle (spoiler) ───────────────────────────────────────

  const toggleFlag = useCallback(
    async (key: FeatKey, value: boolean) => {
      if (!user) return;
      const patch: Partial<ClientPreferences> = { [key]: value };
      if (!value && key === 'featTeams') {
        patch.featLeaderboard = false;
      }
      setLocalFlags((prev) => ({
        ...prev,
        [key]: value,
        ...(!value && key === 'featTeams' ? { featLeaderboard: false } : {}),
      }));
      try {
        const res = await profileApi.patchClientPreferences(patch);
        updateUser({ ...user, clientPreferences: res.data.data.clientPreferences });
      } catch {
        const p = user.clientPreferences ?? {};
        setLocalFlags(featFlagsFromPrefs(p));
        toast.error('Не удалось сохранить настройку.');
      }
    },
    [user, updateUser]
  );

  // ─── Complete onboarding ──────────────────────────────────────────────────

  const markComplete = useCallback(async () => {
    if (!user) return;
    const patch = isTrainerPath
      ? { trainerOnboardingComplete: true }
      : { athleteOnboardingComplete: true };
    const res = await profileApi.patchClientPreferences(patch);
    updateUser({ ...user, clientPreferences: res.data.data.clientPreferences });
  }, [user, updateUser, isTrainerPath]);

  // ─── First workout submit (athlete solo) ─────────────────────────────────

  const handleWorkoutSubmit = useCallback(
    async (data: WorkoutFormData) => {
      if (!user) return;
      if (!data.exercises.length) {
        toast.error('Добавьте хотя бы одно упражнение');
        return;
      }
      try {
        await workoutsApi.create({
          date: toApiDateTime(data.date, data.time),
          workoutType: data.workoutType,
          exercises: data.exercises.map((ex) =>
            exerciseDataToWorkoutExercise(ex, data.workoutType)
          ),
          notes: data.notes || undefined,
        });
        await markComplete();
        setAthleteDoneSubtitleOverride(undefined);
        toast.success('Первая тренировка сохранена 💪');
        checkForNewAchievements();
        setStep('done');
      } catch {
        toast.error('Ошибка сохранения тренировки');
        throw new Error('workout save failed');
      }
    },
    [user, markComplete]
  );

  const handleSkipFirstWorkout = useCallback(async () => {
    if (!user) return;
    try {
      await markComplete();
      setAthleteDoneSubtitleOverride(
        'Первую тренировку можно занести из календаря, когда будет удобно.'
      );
      setWorkoutInputMode(null);
      setStep('done');
    } catch {
      toast.error('Не удалось сохранить. Проверьте сеть.');
    }
  }, [user, markComplete]);

  if (!user) return <></>;

  const trainerWorkStyle =
    scenario === 'individual' || scenario === 'groups' || scenario === 'both'
      ? scenario
      : (user.clientPreferences?.trainerWorkStyle ?? null);
  const athletePrimaryGoal = user.clientPreferences?.athletePrimaryGoal;
  const onboardingWorkoutInitialType =
    athletePrimaryGoal && athletePrimaryGoal !== 'general'
      ? workoutTypeForAthletePrimaryGoal(athletePrimaryGoal)
      : DEFAULT_WORKOUT_TYPE;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Screen bottomInset="safe" enablePullToRefresh={false}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full text-white flex flex-col px-4 pt-4 pb-4"
      >
        {/* Progress bar + skip */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${(progress / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-[11px] text-white/40 shrink-0">
            {progress} / {totalSteps}
          </span>
          {step !== 'done' && (
            <button
              type="button"
              onClick={handleSkip}
              className="text-[11px] text-emerald-400/70 hover:text-emerald-300 underline-offset-2 hover:underline shrink-0"
            >
              Пропустить
            </button>
          )}
        </div>

        {/* ─── STEP: SCENARIO ─────────────────────────────────────────────── */}
        {step === 'scenario' && !isTrainerPath && (
          <AthleteScenarioStep onSelect={(s) => void selectScenario(s)} />
        )}
        {step === 'scenario' && isTrainerPath && (
          <TrainerScenarioStep onSelect={(s) => void selectScenario(s)} />
        )}

        {/* ─── STEP: CLARIFY ──────────────────────────────────────────────── */}
        {step === 'clarify' && !isTrainerPath && scenario === 'solo' && (
          <AthleteGoalStep
            onSelect={(g) => void selectGoal(g)}
            onBack={() => setStep('scenario')}
          />
        )}
        {step === 'clarify' && !isTrainerPath && scenario === 'with_coach' && (
          <AthleteCoachInfoStep
            user={user}
            copiedEmail={copiedEmail}
            setCopiedEmail={setCopiedEmail}
            onNext={() => setStep('mode')}
            onBack={() => setStep('scenario')}
          />
        )}
        {step === 'clarify' && !isTrainerPath && scenario === 'in_team' && (
          <AthleteTeamInfoStep
            user={user}
            copiedEmail={copiedEmail}
            setCopiedEmail={setCopiedEmail}
            onNext={() => setStep('mode')}
            onBack={() => setStep('scenario')}
          />
        )}
        {/* ─── STEP: MODE ─────────────────────────────────────────────────── */}
        {step === 'mode' && !isTrainerPath && (
          <ModeStep onSelect={(m) => void selectMode(m)} onBack={() => setStep('clarify')} />
        )}
        {step === 'mode' && isTrainerPath && (
          <TrainerCabinetModeStep
            onSelect={(m) => void selectMode(m)}
            onBack={() => setStep('scenario')}
          />
        )}

        {/* ─── STEP: ACTION ───────────────────────────────────────────────── */}
        {step === 'action' && !isTrainerPath && scenario === 'solo' && (
          <>
            {workoutInputMode === null ? (
              <AthleteWorkoutChoiceStep
                onSelectAi={() => setWorkoutInputMode('ai')}
                onSelectManual={() => setWorkoutInputMode('manual')}
                onBack={() => setStep('mode')}
                onSkipFirstWorkout={() => void handleSkipFirstWorkout()}
                spoilerOpen={spoilerOpen}
                setSpoilerOpen={setSpoilerOpen}
                localFlags={localFlags}
                onToggleFlag={(key, val) => void toggleFlag(key, val)}
              />
            ) : (
              <>
                <ScreenHeader
                  icon="💪"
                  title="Первая тренировка"
                  description={
                    workoutInputMode === 'ai'
                      ? 'Вставьте текст программы или выберите упражнения — остальное по желанию.'
                      : 'Дата, тип и упражнения из списка. AI на этом шаге отключён.'
                  }
                />
                <WorkoutFormBase
                  lightOnboarding
                  athletePrimaryGoal={athletePrimaryGoal}
                  initialType={onboardingWorkoutInitialType}
                  hideAiAssist={workoutInputMode === 'manual'}
                  notesLabel="Заметки (по желанию)"
                  notesPlaceholder="Как прошла сессия…"
                  submitLabel="Сохранить тренировку"
                  onSubmit={handleWorkoutSubmit}
                  onCancel={() => setWorkoutInputMode(null)}
                  onSkipFirstWorkout={() => void handleSkipFirstWorkout()}
                />
              </>
            )}
          </>
        )}
        {step === 'action' && !isTrainerPath && scenario !== 'solo' && (
          <AthleteTeamActionStep
            onNext={async () => {
              await markComplete();
              setStep('done');
            }}
            onBack={() => setStep('mode')}
            spoilerOpen={spoilerOpen}
            setSpoilerOpen={setSpoilerOpen}
            localFlags={localFlags}
            onToggleFlag={(key, val) => void toggleFlag(key, val)}
          />
        )}
        {step === 'action' && isTrainerPath && (
          <TrainerActionStep
            workStyle={trainerWorkStyle}
            onNext={async () => {
              await markComplete();
              setStep('done');
            }}
            onBack={() => setStep('mode')}
            spoilerOpen={spoilerOpen}
            setSpoilerOpen={setSpoilerOpen}
            localFlags={localFlags}
            onToggleFlag={(key, val) => void toggleFlag(key, val)}
          />
        )}

        {/* ─── STEP: DONE ─────────────────────────────────────────────────── */}
        {step === 'done' && (
          <DoneStep
            isTrainerPath={isTrainerPath}
            navigate={navigate}
            athleteSubtitle={athleteDoneSubtitleOverride}
          />
        )}
      </motion.div>
    </Screen>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Athlete: scenario ────────────────────────────────────────────────────────

function AthleteScenarioStep({ onSelect }: { onSelect: (s: AthleteScenario) => void }) {
  return (
    <>
      <ScreenHeader
        icon="👟"
        title="Как ты тренируешься?"
        description="Выбери сценарий — настроим всё под тебя. Не навсегда, в настройках можно изменить."
      />
      <div className="grid gap-3">
        {[
          {
            id: 'solo' as const,
            emoji: '🏠',
            title: 'Сам себе тренер',
            hint: 'Веду дневник сам, анализирую прогресс',
          },
          {
            id: 'with_coach' as const,
            emoji: '🤝',
            title: 'С тренером',
            hint: 'Тренер даёт задания, я выполняю и отчитываюсь',
          },
          {
            id: 'in_team' as const,
            emoji: '👥',
            title: 'В команде',
            hint: 'Тренируюсь в группе, важна динамика команды',
          },
        ].map((o) => (
          <ScenarioCard
            key={o.id}
            emoji={o.emoji}
            title={o.title}
            hint={o.hint}
            onClick={() => onSelect(o.id)}
          />
        ))}
      </div>
    </>
  );
}

// ─── Trainer: scenario ────────────────────────────────────────────────────────

function TrainerScenarioStep({ onSelect }: { onSelect: (s: TrainerScenario) => void }) {
  return (
    <>
      <ScreenHeader
        icon="🏋️"
        title="Как ведёшь работу?"
        description="Выбор сохраняем в профиль — так мы лучше подстроим подсказки под ваш стиль. Детали экрана можно разобрать уже в работе."
      />
      <div className="grid gap-3">
        {[
          {
            id: 'individual' as const,
            emoji: '👤',
            title: 'Индивидуально',
            hint: '1 на 1 — персональные программы и контроль',
          },
          {
            id: 'groups' as const,
            emoji: '👥',
            title: 'Группы',
            hint: 'Несколько человек вместе, общий план и чат',
          },
          {
            id: 'both' as const,
            emoji: '🔀',
            title: 'И то и другое',
            hint: 'Смешанный формат — как пойдёт',
          },
        ].map((o) => (
          <ScenarioCard
            key={o.id}
            emoji={o.emoji}
            title={o.title}
            hint={o.hint}
            onClick={() => onSelect(o.id)}
          />
        ))}
      </div>
    </>
  );
}

// ─── Athlete: goal ────────────────────────────────────────────────────────────

function AthleteGoalStep({
  onSelect,
  onBack,
}: {
  onSelect: (g: NonNullable<ClientPreferences['athletePrimaryGoal']>) => void;
  onBack: () => void;
}) {
  return (
    <>
      <ScreenHeader
        icon="🎯"
        title="Главная цель"
        description="Влияет на тип тренировки по умолчанию при создании новой. Можно изменить потом."
      />
      <div className="grid gap-3 mb-4">
        {[
          {
            id: 'strength' as const,
            emoji: '🏋️',
            title: 'Сила',
            hint: 'Жим, присед, становая — силовые приоритет',
          },
          {
            id: 'cardio' as const,
            emoji: '🏃',
            title: 'Кардио',
            hint: 'Бег, велосипед, плавание и кардио-нагрузки',
          },
          {
            id: 'flexibility' as const,
            emoji: '🧘',
            title: 'Гибкость',
            hint: 'Растяжка, йога, подвижность суставов',
          },
          {
            id: 'general' as const,
            emoji: '⚡',
            title: 'Общая форма',
            hint: 'Всего понемногу — без жёсткого приоритета',
          },
        ].map((o) => (
          <ScenarioCard
            key={o.id}
            emoji={o.emoji}
            title={o.title}
            hint={o.hint}
            onClick={() => onSelect(o.id)}
          />
        ))}
      </div>
      <GhostButton variant="solid" className="w-full" onClick={onBack}>
        Назад
      </GhostButton>
    </>
  );
}

// ─── Athlete: coach info ──────────────────────────────────────────────────────

function AthleteCoachInfoStep({
  user,
  copiedEmail,
  setCopiedEmail,
  onNext,
  onBack,
}: {
  user: { id: number; email: string; fullName: string };
  copiedEmail: boolean;
  setCopiedEmail: (v: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { teams } = useFeatureFlags();
  const handleCopyEmail = () => {
    void navigator.clipboard.writeText(user.email).then(() => {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    });
  };

  return (
    <>
      <ScreenHeader
        icon="🤝"
        title="Передай данные тренеру"
        description={
          teams
            ? 'Тренер добавляет тебя из своего кабинета. Вот три способа — выбери удобный.'
            : 'Тренер добавляет тебя из своего кабинета по email.'
        }
      />
      <div className="flex-1 min-h-0 overflow-y-auto pb-4 space-y-3">
        {teams && (
          <div className="rounded-2xl border border-(--color_border) bg-(--color_bg_card) p-4 flex flex-col items-center gap-3">
            <p className="text-xs text-(--color_text_muted) self-start">
              QR-код — тренер сканирует при добавлении
            </p>
            <AthleteQrCode athleteId={user.id} name={user.fullName} email={user.email} />
          </div>
        )}

        {/* Email — copy button */}
        <div className="rounded-2xl border border-(--color_border) bg-(--color_bg_card) p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Email аккаунта</p>
            <p className="text-xs text-(--color_text_muted) mt-0.5">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleCopyEmail}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
          >
            {copiedEmail ? '✓ Скопировано' : 'Скопировать'}
          </button>
        </div>

        {teams ? (
          <p className="text-[11px] text-(--color_text_muted) leading-relaxed px-0.5">
            После добавления тренером — раздел «Команда» и чаты появятся автоматически.
          </p>
        ) : (
          <p className="text-[11px] text-(--color_text_muted) leading-relaxed px-0.5">
            Раздел «Команда» и QR в профиле можно включить в настройках, если понадобятся.
          </p>
        )}
      </div>
      <div className="flex gap-2 shrink-0 pt-2">
        <GhostButton variant="solid" className="flex-1" onClick={onBack}>
          Назад
        </GhostButton>
        <AccentButton className="flex-1 font-semibold" onClick={onNext}>
          Понятно, дальше
        </AccentButton>
      </div>
    </>
  );
}

// ─── Athlete: in_team info ────────────────────────────────────────────────────

function AthleteTeamInfoStep({
  user,
  copiedEmail,
  setCopiedEmail,
  onNext,
  onBack,
}: {
  user: { id: number; email: string; fullName: string };
  copiedEmail: boolean;
  setCopiedEmail: (v: boolean) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { teams } = useFeatureFlags();
  const handleCopyEmail = () => {
    void navigator.clipboard.writeText(user.email).then(() => {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    });
  };

  return (
    <>
      <ScreenHeader
        icon="👥"
        title={teams ? 'Покажи QR тренеру' : 'Передай email тренеру'}
        description={
          teams
            ? 'Тренер добавляет тебя в команду — дай ему отсканировать QR или передай email.'
            : 'Тренер добавляет тебя в команду по email из своего кабинета.'
        }
      />
      <div className="flex-1 min-h-0 overflow-y-auto pb-4 space-y-3">
        {teams && (
          <div className="rounded-2xl border border-(--color_border) bg-(--color_bg_card) p-4 flex flex-col items-center gap-3">
            <AthleteQrCode athleteId={user.id} name={user.fullName} email={user.email} />
          </div>
        )}
        <div className="rounded-2xl border border-(--color_border) bg-(--color_bg_card) p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Email</p>
            <p className="text-xs text-(--color_text_muted) mt-0.5">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleCopyEmail}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
          >
            {copiedEmail ? '✓ Скопировано' : 'Скопировать'}
          </button>
        </div>
        {teams ? (
          <p className="text-[11px] text-(--color_text_muted) leading-relaxed px-0.5">
            После того как тренер добавит тебя — раздел «Команда» и чаты появятся автоматически.
          </p>
        ) : (
          <p className="text-[11px] text-(--color_text_muted) leading-relaxed px-0.5">
            Раздел «Команда» и QR в профиле можно включить в настройках, если понадобятся.
          </p>
        )}
      </div>
      <div className="flex gap-2 shrink-0 pt-2">
        <GhostButton variant="solid" className="flex-1" onClick={onBack}>
          Назад
        </GhostButton>
        <AccentButton className="flex-1 font-semibold" onClick={onNext}>
          Понятно, дальше
        </AccentButton>
      </div>
    </>
  );
}

// ─── Mode step ────────────────────────────────────────────────────────────────

function ModeStep({
  onSelect,
  onBack,
}: {
  onSelect: (m: NonNullable<ClientPreferences['uiMode']>) => void;
  onBack: () => void;
}) {
  return (
    <>
      <ScreenHeader
        icon="🎛️"
        title="Выбери режим"
        description="Управляет тем, какие разделы и функции видны в приложении. Можно изменить в любой момент."
      />
      <div className="grid gap-3 mb-4">
        {/* Starter */}
        <button
          type="button"
          onClick={() => onSelect('starter')}
          className="rounded-2xl border border-(--color_border) bg-(--color_bg_card) p-4 text-left hover:border-emerald-500/40 transition-colors"
        >
          <div className="text-2xl mb-1">🌱</div>
          <div className="font-semibold text-white">С нуля</div>
          <div className="text-xs text-(--color_text_muted) mt-1">
            Только самое главное — дневник, календарь, нагрузка. Остальное добавишь когда
            понадобится.
          </div>
        </button>

        {/* Pro */}
        <button
          type="button"
          onClick={() => onSelect('pro')}
          className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-left hover:bg-emerald-500/15 transition-colors"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">⚡</span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">
              Рекомендуем
            </span>
          </div>
          <div className="font-semibold text-white">В деле</div>
          <div className="text-xs text-(--color_text_muted) mt-1">
            Аналитика, AI, прогрессия, команды и диалоги — полный функционал без перегруза.
          </div>
        </button>

        {/* Unleash — the fire button */}
        <motion.button
          type="button"
          onClick={() => onSelect('unleash')}
          className="rounded-2xl border-2 border-orange-500 p-4 text-left relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(234,88,12,0.25), rgba(239,68,68,0.15))',
          }}
          animate={{
            boxShadow: [
              '0 0 16px rgba(249,115,22,0.3)',
              '0 0 32px rgba(239,68,68,0.55)',
              '0 0 16px rgba(249,115,22,0.3)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="text-2xl mb-1">🔥</div>
          <div className="font-black text-white text-lg tracking-tight">МНЕ НУЖНО ВСЁ</div>
          <div className="text-xs text-orange-200/80 mt-1">
            Весь функционал сразу. Без обучения. Периодизация, видеозвонки, всё включено.
          </div>
          <div className="absolute top-2 right-3 text-[10px] font-bold text-orange-400/80 uppercase tracking-widest">
            UNLEASH
          </div>
        </motion.button>
      </div>
      <GhostButton variant="solid" className="w-full" onClick={onBack}>
        Назад
      </GhostButton>
    </>
  );
}

// ─── Trainer: cabinet richness (same prefs as athlete uiMode, другие формулировки) ─

function TrainerCabinetModeStep({
  onSelect,
  onBack,
}: {
  onSelect: (m: NonNullable<ClientPreferences['uiMode']>) => void;
  onBack: () => void;
}) {
  return (
    <>
      <ScreenHeader
        icon="🎛️"
        title="Насыщенность кабинета"
        description="Сколько возможностей включить сразу: AI, аналитика, работа с командой, чаты. Потом всё это можно поменять в профиле."
      />
      <div className="grid gap-3 mb-4">
        <button
          type="button"
          onClick={() => onSelect('starter')}
          className="rounded-2xl border border-(--color_border) bg-(--color_bg_card) p-4 text-left hover:border-emerald-500/40 transition-colors"
        >
          <div className="text-2xl mb-1">🌱</div>
          <div className="font-semibold text-white">Минимум</div>
          <div className="text-xs text-(--color_text_muted) mt-1">
            Календарь и назначения без лишнего: без AI, аналитики и работы с командой на старте — меньше
            отвлечений, пока осваиваетесь.
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelect('pro')}
          className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-left hover:bg-emerald-500/15 transition-colors"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">⚡</span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-400">
              Рекомендуем
            </span>
          </div>
          <div className="font-semibold text-white">Рабочий набор</div>
          <div className="text-xs text-(--color_text_muted) mt-1">
            AI, аналитика, прогрессия, команда и диалоги — нормальный режим для ведения клиентов.
          </div>
        </button>

        <motion.button
          type="button"
          onClick={() => onSelect('unleash')}
          className="rounded-2xl border-2 border-orange-500 p-4 text-left relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(234,88,12,0.25), rgba(239,68,68,0.15))',
          }}
          animate={{
            boxShadow: [
              '0 0 16px rgba(249,115,22,0.3)',
              '0 0 32px rgba(239,68,68,0.55)',
              '0 0 16px rgba(249,115,22,0.3)',
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="text-2xl mb-1">🔥</div>
          <div className="font-black text-white text-lg tracking-tight">Всё включить</div>
          <div className="text-xs text-orange-200/80 mt-1">
            Периодизация, видеозвонки и остальные флаги — если уже знаете, что всем этим будете
            пользоваться.
          </div>
          <div className="absolute top-2 right-3 text-[10px] font-bold text-orange-400/80 uppercase tracking-widest">
            MAX
          </div>
        </motion.button>
      </div>
      <GhostButton variant="solid" className="w-full" onClick={onBack}>
        Назад
      </GhostButton>
    </>
  );
}

// ─── Feature spoiler ──────────────────────────────────────────────────────────

function FeatureSpoiler({
  open,
  setOpen,
  localFlags,
  onToggle,
  variant = 'athlete',
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  localFlags: Partial<Record<FeatKey, boolean>>;
  onToggle: (key: FeatKey, value: boolean) => void;
  /** Тренеру — только те же 5 флагов, что в профиле (без athleteOnly) */
  variant?: 'athlete' | 'trainer';
}) {
  const prefs = useFeatureFlags();
  const teamsOnTrainer =
    variant === 'trainer'
      ? typeof localFlags.featTeams === 'boolean'
        ? localFlags.featTeams
        : prefs.teams
      : true;
  const title =
    variant === 'trainer' ? 'Дополнительно: функции кабинета' : 'Посмотреть весь функционал';
  const subtitle =
    variant === 'trainer'
      ? 'Те же переключатели, что в настройках профиля для кабинета тренера.'
      : 'Это не реклама. Это просто то, что здесь уже есть.';

  return (
    <div className="rounded-2xl border border-(--color_border) bg-(--color_bg_card) overflow-hidden mt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center justify-between text-left"
      >
        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="text-[11px] text-(--color_text_muted) mt-0.5">{subtitle}</p>
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-white/40 text-sm shrink-0 ml-2"
        >
          ▾
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2 border-t border-(--color_border) pt-3">
              {variant === 'trainer'
                ? TRAINER_SPOILER_ITEMS.map((row) => {
                    const { key, label, hint } = row;
                    const enabled = trainerSpoilerSwitchChecked(key, localFlags, prefs);
                    const leaderboardBlocked = key === 'featLeaderboard' && !teamsOnTrainer;
                    return (
                      <div key={key} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-sm text-white">{label}</span>
                          {hint && (
                            <span className="text-[11px] text-(--color_text_muted) ml-2">{hint}</span>
                          )}
                          {leaderboardBlocked && (
                            <p className="text-[10px] text-(--color_text_muted) mt-0.5">
                              Сначала включите «Атлеты и группы»
                            </p>
                          )}
                        </div>
                        <Switch
                          size="sm"
                          checked={enabled}
                          disabled={leaderboardBlocked}
                          onCheckedChange={(v) => {
                            if (leaderboardBlocked) return;
                            onToggle(key, v);
                          }}
                        />
                      </div>
                    );
                  })
                : UNIQUE_FEAT_ITEMS.map((row) => {
                    const { key, label, hint } = row;
                    const enabled = localFlags[key] ?? false;
                    return (
                      <div key={key} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-sm text-white">{label}</span>
                          {hint && (
                            <span className="text-[11px] text-(--color_text_muted) ml-2">{hint}</span>
                          )}
                        </div>
                        <Switch
                          size="sm"
                          checked={enabled}
                          onCheckedChange={(v) => {
                            onToggle(key, v);
                          }}
                        />
                      </div>
                    );
                  })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Athlete: workout choice ──────────────────────────────────────────────────

function AthleteWorkoutChoiceStep({
  onSelectAi,
  onSelectManual,
  onBack,
  onSkipFirstWorkout,
  spoilerOpen,
  setSpoilerOpen,
  localFlags,
  onToggleFlag,
}: {
  onSelectAi: () => void;
  onSelectManual: () => void;
  onBack: () => void;
  onSkipFirstWorkout: () => void;
  spoilerOpen: boolean;
  setSpoilerOpen: (v: boolean) => void;
  localFlags: Partial<Record<FeatKey, boolean>>;
  onToggleFlag: (key: FeatKey, value: boolean) => void;
}) {
  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto pb-4">
        <ScreenHeader
          icon="💪"
          title="Первая тренировка"
          description="Как добавим? AI — быстрее и умнее. Вручную — если хочешь контроль над каждым полем."
        />
        <div className="grid gap-2 w-full">
          <button
            type="button"
            onClick={onSelectAi}
            className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3 text-left flex gap-3 items-start w-full transition-colors hover:bg-emerald-500/15"
          >
            <span className="text-xl shrink-0 leading-none pt-0.5">✨</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-semibold text-white">С помощью AI</span>
                <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-400/90">
                  Рекомендуем
                </span>
              </div>
              <p className="text-[11px] text-(--color_text_muted) mt-0.5 leading-snug">
                Фото, текст, описание — как в «Новой тренировке».
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={onSelectManual}
            className="rounded-xl border border-(--color_border) bg-(--color_bg_card) p-3 text-left flex gap-3 items-start w-full transition-colors hover:border-white/25"
          >
            <span className="text-xl shrink-0 leading-none pt-0.5">✏️</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white">Вручную</div>
              <p className="text-[11px] text-(--color_text_muted) mt-0.5 leading-snug">
                Дата, тип, упражнения из каталога, без AI.
              </p>
            </div>
          </button>
        </div>

        <button
          type="button"
          onClick={onSkipFirstWorkout}
          className="w-full py-2.5 text-xs text-(--color_text_muted) hover:text-emerald-400/90 transition-colors text-center rounded-xl border border-transparent hover:border-white/10"
        >
          Пропустить — добавлю тренировку из календаря
        </button>

        <FeatureSpoiler
          open={spoilerOpen}
          setOpen={setSpoilerOpen}
          localFlags={localFlags}
          onToggle={onToggleFlag}
        />
      </div>
      <div className="shrink-0 pt-2">
        <GhostButton variant="solid" className="w-full" onClick={onBack}>
          Назад
        </GhostButton>
      </div>
    </>
  );
}

// ─── Athlete: team action (with_coach / in_team) ──────────────────────────────

function AthleteTeamActionStep({
  onNext,
  onBack,
  spoilerOpen,
  setSpoilerOpen,
  localFlags,
  onToggleFlag,
}: {
  onNext: () => void;
  onBack: () => void;
  spoilerOpen: boolean;
  setSpoilerOpen: (v: boolean) => void;
  localFlags: Partial<Record<FeatKey, boolean>>;
  onToggleFlag: (key: FeatKey, value: boolean) => void;
}) {
  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto pb-4">
        <ScreenHeader
          icon="🎉"
          title="Всё настроено!"
          description="Раздел «Команда» открыт — можно найти тренера или дождаться инвайта. Первую тренировку добавишь из календаря."
        />
        <FeatureSpoiler
          open={spoilerOpen}
          setOpen={setSpoilerOpen}
          localFlags={localFlags}
          onToggle={onToggleFlag}
        />
      </div>
      <div className="flex gap-2 shrink-0 pt-2">
        <GhostButton variant="solid" className="flex-1" onClick={onBack}>
          Назад
        </GhostButton>
        <AccentButton className="flex-1 font-semibold" onClick={() => void onNext()}>
          Перейти в Команда
        </AccentButton>
      </div>
    </>
  );
}

// ─── Trainer: action step ─────────────────────────────────────────────────────

function TrainerActionStep({
  workStyle,
  onNext,
  onBack,
  spoilerOpen,
  setSpoilerOpen,
  localFlags,
  onToggleFlag,
}: {
  workStyle: TrainerScenario | null;
  onNext: () => void;
  onBack: () => void;
  spoilerOpen: boolean;
  setSpoilerOpen: (v: boolean) => void;
  localFlags: Partial<Record<FeatKey, boolean>>;
  onToggleFlag: (key: FeatKey, value: boolean) => void;
}) {
  const prefs = useFeatureFlags();
  const { teams } = prefs;
  const templatesOn =
    typeof localFlags.featTrainerTemplates === 'boolean'
      ? localFlags.featTrainerTemplates
      : prefs.trainerTemplates;
  const teamsOn =
    typeof localFlags.featTeams === 'boolean' ? localFlags.featTeams : prefs.teams;
  const steps = getTrainerGettingStartedSteps(workStyle, {
    templates: templatesOn,
    teams: teamsOn,
  });

  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto pb-4">
        <ScreenHeader
          icon="🧭"
          title="С чего начать в кабинете"
          description="Три шага под ваш формат. Остальное — по ходу: экраны откроете, когда понадобятся."
        />
        <div className="space-y-2">
          {steps.map((s) => (
            <div
              key={s.step}
              className="rounded-2xl border border-(--color_border) bg-(--color_bg_card) p-3.5 text-left"
            >
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-emerald-400/90 tabular-nums shrink-0 mt-0.5">
                  {s.step}.
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white leading-snug">{s.title}</div>
                  <p className="text-[11px] text-(--color_text_muted) mt-1 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-(--color_text_muted) mt-3 leading-relaxed px-0.5">
          Атлетов можно пригласить по email или ссылке
          {teams ? '; при необходимости — по QR из профиля атлета' : ''}.
        </p>
        <FeatureSpoiler
          variant="trainer"
          open={spoilerOpen}
          setOpen={setSpoilerOpen}
          localFlags={localFlags}
          onToggle={onToggleFlag}
        />
      </div>
      <div className="flex gap-2 shrink-0 pt-3">
        <GhostButton variant="solid" className="flex-1" onClick={onBack}>
          Назад
        </GhostButton>
        <AccentButton className="flex-1 font-semibold" onClick={() => void onNext()}>
          Завершить настройку
        </AccentButton>
      </div>
    </>
  );
}

// ─── Done step ────────────────────────────────────────────────────────────────

function DoneStep({
  isTrainerPath,
  navigate,
  athleteSubtitle,
}: {
  isTrainerPath: boolean;
  navigate: ReturnType<typeof useNavigate>;
  /** Для атлета: свой текст под заголовком (иначе дефолт про тренировку в календаре). */
  athleteSubtitle?: string;
}) {
  return (
    <div className="flex flex-col py-4">
      <div className="text-center shrink-0">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="text-5xl mb-3"
        >
          🚀
        </motion.div>
        <h2 className="text-xl font-bold text-white mb-2">
          {isTrainerPath ? 'Кабинет готов к работе' : 'Отличное начало'}
        </h2>
        <p className="text-sm text-(--color_text_muted) mb-4 max-w-sm mx-auto">
          {isTrainerPath
            ? 'Дальше — добавить атлетов и первые назначения.'
            : athleteSubtitle ?? 'Тренировка в календаре. Продолжаем!'}
        </p>
      </div>

      <OnboardingPwaPushSection />

      <div className="shrink-0 w-full max-w-md mx-auto space-y-2">
        <AccentButton
          className="w-full font-semibold py-3"
          onClick={() => navigate(isTrainerPath ? '/trainer' : '/calendar', { replace: true })}
        >
          {isTrainerPath ? 'Перейти на «Сегодня»' : 'Перейти в календарь'}
        </AccentButton>
        {isTrainerPath && (
          <button
            type="button"
            onClick={() => navigate('/trainer/team')}
            className="w-full py-2 text-sm text-emerald-400/90 hover:text-emerald-300 transition-colors"
          >
            Открыть «Команда» и добавить атлета
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate(isTrainerPath ? '/trainer' : '/home', { replace: true })}
          className="w-full text-sm text-(--color_text_muted) hover:text-white transition-colors py-2"
        >
          На главную
        </button>
        <button
          type="button"
          onClick={() => navigate('/profile?tab=settings')}
          className="w-full text-xs text-(--color_text_muted) hover:text-emerald-400/90 transition-colors py-1"
        >
          Настройки уведомлений и функций →
        </button>
      </div>
    </div>
  );
}

// ─── Reusable scenario card ───────────────────────────────────────────────────

function ScenarioCard({
  emoji,
  title,
  hint,
  onClick,
}: {
  emoji: string;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border border-(--color_border) bg-(--color_bg_card) p-4 text-left w-full transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5 active:scale-[0.98]"
    >
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="font-semibold text-white">{title}</div>
      <div className="text-xs text-(--color_text_muted) mt-1">{hint}</div>
    </button>
  );
}
