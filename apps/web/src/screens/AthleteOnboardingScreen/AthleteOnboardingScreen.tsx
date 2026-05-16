import { useEffect, useState, type JSX } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import AccentButton from '@/components/ui/AccentButton';
import GhostButton from '@/components/ui/GhostButton';
import WorkoutFormBase from '@/components/WorkoutFormBase/WorkoutFormBase';
import { useAuth, useActiveMode } from '@/contexts/AuthContext';
import {
  markAthleteOnboardingComplete,
  setAthleteCoachIntent,
  shouldShowAthleteOnboarding,
} from '@/util/athleteOnboarding';
import { workoutsApi } from '@/api/workouts';
import { toApiDateTime } from '@/utils/date';
import { exerciseDataToWorkoutExercise } from '@/util/workoutExerciseConversions';
import { checkForNewAchievements } from '@/hooks/useAchievementToast';
import type { WorkoutFormData } from '@/components/WorkoutFormBase/WorkoutFormBase';
import OnboardingPwaPushSection from '@/components/OnboardingPwaPushSection/OnboardingPwaPushSection';
import { profileApi } from '@/api/profile';
import { parseStoredAuthUserJson } from '@/util/parseStoredAuthUser';
import { workoutTypeForAthletePrimaryGoal } from '@/util/athletePrimaryGoalWorkoutType';
import { DEFAULT_WORKOUT_TYPE } from '@/constants/workoutTypes';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

type Step = 'context' | 'coach_connect' | 'workout' | 'done';

function progressForStep(
  step: Step,
  showCoachConnect: boolean
): { current: number; total: number } {
  const total = showCoachConnect ? 4 : 3;
  if (showCoachConnect) {
    const map: Record<Step, number> = { context: 1, coach_connect: 2, workout: 3, done: 4 };
    return { current: map[step], total };
  }
  const map: Record<Step, number> = { context: 1, coach_connect: 1, workout: 2, done: 3 };
  return { current: map[step], total };
}

export default function AthleteOnboardingScreen(): JSX.Element {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { activeMode } = useActiveMode();
  const { teams } = useFeatureFlags();
  const [step, setStep] = useState<Step>('context');
  const [coachContext, setCoachContext] = useState<'solo' | 'with_coach' | null>(null);
  const [aiMode, setAiMode] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (step === 'done') return;
    if (!shouldShowAthleteOnboarding(user, activeMode)) {
      navigate('/home', { replace: true });
    }
  }, [user, activeMode, navigate, step]);

  const showCoachConnect = coachContext === 'with_coach';
  const { current: progress, total: totalSteps } = progressForStep(step, showCoachConnect);
  const athletePrimaryGoal = user?.clientPreferences?.athletePrimaryGoal;
  const initialWorkoutType =
    athletePrimaryGoal && athletePrimaryGoal !== 'general'
      ? workoutTypeForAthletePrimaryGoal(athletePrimaryGoal)
      : DEFAULT_WORKOUT_TYPE;

  const handleSkip = () => {
    if (!user) return;
    updateUser({
      ...user,
      clientPreferences: { ...user.clientPreferences, athleteOnboardingComplete: true },
    });
    navigate('/home', { replace: true });
    void profileApi
      .patchClientPreferences({ athleteOnboardingComplete: true })
      .then((res) => {
        try {
          const raw = localStorage.getItem('user');
          if (!raw) return;
          const u = parseStoredAuthUserJson(raw);
          if (!u) return;
          updateUser({ ...u, clientPreferences: res.data.data.clientPreferences });
          localStorage.removeItem(`vervel_athlete_onboarding_v1_${user.id}`);
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        toast.error('Не удалось сохранить на сервере. Проверьте сеть.');
      });
  };

  const handleWorkoutSubmit = async (data: WorkoutFormData) => {
    if (!user) return;
    if (!data.exercises.length) {
      toast.error('Добавьте хотя бы одно упражнение');
      return;
    }
    try {
      await workoutsApi.create({
        date: toApiDateTime(data.date, data.time),
        workoutType: data.workoutType,
        exercises: data.exercises.map((ex) => exerciseDataToWorkoutExercise(ex, data.workoutType)),
        notes: data.notes || undefined,
      });
      await markAthleteOnboardingComplete(user, updateUser);
      toast.success('Первая тренировка сохранена 💪');
      checkForNewAchievements();
      setStep('done');
    } catch (err: unknown) {
      const msg =
        err !== null &&
        typeof err === 'object' &&
        'response' in err &&
        err.response !== null &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data !== null &&
        typeof err.response.data === 'object' &&
        'message' in err.response.data &&
        typeof err.response.data.message === 'string'
          ? err.response.data.message
          : err instanceof Error
            ? err.message
            : 'Ошибка сохранения';
      toast.error(msg);
      throw err;
    }
  };

  if (!user) return <></>;

  return (
    <Screen bottomInset="safe" enablePullToRefresh={false}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full text-white flex flex-col px-4 pt-4 pb-4"
      >
        <div className="flex items-center justify-between gap-2 mb-3 text-[11px] text-white/45">
          <span>
            Шаг {progress} / {totalSteps}
          </span>
          {step !== 'done' && (
            <button
              type="button"
              onClick={handleSkip}
              className="text-emerald-400/90 hover:text-emerald-300 underline-offset-2 hover:underline"
            >
              Пропустить
            </button>
          )}
        </div>

        {/* ── Шаг 1: контекст ─────────────────────────────────────────────── */}
        {step === 'context' && (
          <>
            <ScreenHeader
              icon="👋"
              title="Добро пожаловать"
              description="Пара вопросов — и календарь сразу будет подстроен под вас."
            />
            <p className="text-sm text-(--color_text_muted) mb-4">Как тренируетесь?</p>
            <div className="grid gap-3 mb-6">
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    try {
                      await setAthleteCoachIntent(user, updateUser, 'solo');
                      setCoachContext('solo');
                      setStep('workout');
                    } catch {
                      toast.error('Не удалось сохранить выбор. Проверьте сеть.');
                    }
                  })();
                }}
                className="rounded-2xl border border-(--color_border) bg-(--color_bg_card) p-4 text-left transition-colors hover:border-emerald-500/40"
              >
                <div className="text-2xl mb-1">🏠</div>
                <div className="font-semibold text-white">Самостоятельно</div>
                <div className="text-xs text-(--color_text_muted) mt-1">
                  Веду дневник сам, без тренера в приложении
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    try {
                      await setAthleteCoachIntent(user, updateUser, 'with_coach');
                      setCoachContext('with_coach');
                      setStep('coach_connect');
                    } catch {
                      toast.error('Не удалось сохранить выбор. Проверьте сеть.');
                    }
                  })();
                }}
                className="rounded-2xl border border-(--color_border) bg-(--color_bg_card) p-4 text-left transition-colors hover:border-emerald-500/40"
              >
                <div className="text-2xl mb-1">🤝</div>
                <div className="font-semibold text-white">С тренером</div>
                <div className="text-xs text-(--color_text_muted) mt-1">
                  Тренер добавит меня в приложение — покажи как
                </div>
              </button>
            </div>
          </>
        )}

        {/* ── Шаг 2 (only with_coach): связь с тренером ──────────────────── */}
        {step === 'coach_connect' && (
          <>
            <ScreenHeader
              icon="🤝"
              title="Как тренер вас добавит"
              description="Тренер добавляет вас со своей стороны. Дайте ему один из вариантов:"
            />
            <div className="flex-1 min-h-0 overflow-y-auto pb-4">
              <div className="space-y-2">
                <div className="flex gap-3 rounded-xl border border-(--color_border) bg-(--color_bg_card) p-3">
                  <span className="text-xl shrink-0">📧</span>
                  <div>
                    <div className="text-sm font-semibold text-white mb-0.5">
                      Email этого аккаунта
                    </div>
                    <div className="text-xs text-(--color_text_muted) leading-relaxed">
                      Тренер введёт почту — вы появитесь у него в команде автоматически.
                    </div>
                    <div className="mt-1.5 px-2.5 py-1 rounded-lg bg-(--color_bg_card_hover) text-xs text-white/80 font-mono break-all select-all">
                      {user.email}
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 rounded-xl border border-(--color_border) bg-(--color_bg_card) p-3">
                  <span className="text-xl shrink-0">🔗</span>
                  <div>
                    <div className="text-sm font-semibold text-white mb-0.5">
                      Ссылка-приглашение
                    </div>
                    <div className="text-xs text-(--color_text_muted) leading-relaxed">
                      Тренер генерирует ссылку и отправляет вам. Просто откройте её.
                    </div>
                  </div>
                </div>
                {teams && (
                  <div className="flex gap-3 rounded-xl border border-(--color_border) bg-(--color_bg_card) p-3">
                    <span className="text-xl shrink-0">📷</span>
                    <div>
                      <div className="text-sm font-semibold text-white mb-0.5">
                        QR-код из профиля
                      </div>
                      <div className="text-xs text-(--color_text_muted) leading-relaxed">
                        Откройте Профиль → покажите QR тренеру для сканирования.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0 pt-2">
              <GhostButton
                variant="solid"
                className="flex-1"
                onClick={() => {
                  setCoachContext(null);
                  setStep('context');
                }}
              >
                Назад
              </GhostButton>
              <AccentButton className="flex-1 font-semibold" onClick={() => setStep('workout')}>
                Понятно, дальше
              </AccentButton>
            </div>
          </>
        )}

        {/* ── Шаг workout: первая тренировка ──────────────────────────────── */}
        {step === 'workout' && (
          <>
            <ScreenHeader
              icon="💪"
              title="Первая тренировка"
              description="Занесите последнюю тренировку или создайте новую — так в календаре сразу появятся данные."
            />

            {/* Тогл AI / вручную */}
            <div className="flex gap-1 bg-(--color_bg_card) border border-(--color_border) rounded-xl p-1 mb-4">
              <button
                type="button"
                onClick={() => setAiMode(true)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  aiMode
                    ? 'bg-(--color_primary_light) text-white'
                    : 'text-(--color_text_muted) hover:text-white'
                }`}
              >
                ✨ С помощью ИИ
              </button>
              <button
                type="button"
                onClick={() => setAiMode(false)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  !aiMode
                    ? 'bg-(--color_bg_card_hover) text-white'
                    : 'text-(--color_text_muted) hover:text-white'
                }`}
              >
                ✏️ Вручную
              </button>
            </div>

            <div className="min-w-0 w-full">
              <WorkoutFormBase
                key={aiMode ? 'ai' : 'manual'}
                lightOnboarding
                athletePrimaryGoal={athletePrimaryGoal}
                initialType={initialWorkoutType}
                hideAiAssist={!aiMode}
                notesLabel="Заметки (по желанию)"
                notesPlaceholder="Как прошла сессия…"
                submitLabel="Сохранить тренировку"
                onSubmit={handleWorkoutSubmit}
                onCancel={() => setStep(showCoachConnect ? 'coach_connect' : 'context')}
              />
            </div>
          </>
        )}

        {/* ── Done ────────────────────────────────────────────────────────── */}
        {step === 'done' && (
          <div className="flex flex-col py-4">
            <div className="text-center shrink-0">
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-xl font-bold text-white mb-2">Отличное начало!</h2>
              <p className="text-sm text-(--color_text_muted) mb-4 max-w-sm mx-auto">
                Тренировка в календаре. Включите уведомления — будем напоминать о занятиях.
              </p>
            </div>

            <OnboardingPwaPushSection />

            <div className="shrink-0 w-full max-w-md mx-auto space-y-2">
              <AccentButton
                className="w-full font-semibold py-3"
                onClick={() => navigate('/calendar')}
              >
                Открыть календарь
              </AccentButton>
              <button
                type="button"
                onClick={() => navigate('/home', { replace: true })}
                className="w-full text-sm text-(--color_text_muted) hover:text-white transition-colors py-2"
              >
                На главную
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </Screen>
  );
}
