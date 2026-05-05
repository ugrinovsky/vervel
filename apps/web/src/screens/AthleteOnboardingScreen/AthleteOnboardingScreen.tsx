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

function progressForStep(step: Step, showCoachConnect: boolean): { current: number; total: number } {
  const total = showCoachConnect ? 4 : 3;
  if (showCoachConnect) {
    const map: Record<Step, number> = {
      context: 1,
      coach_connect: 2,
      workout: 3,
      done: 4,
    };
    return { current: map[step], total };
  }
  const map: Record<Step, number> = {
    context: 1,
    coach_connect: 1,
    workout: 2,
    done: 3,
  };
  return { current: map[step], total };
}

export default function AthleteOnboardingScreen(): JSX.Element {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { activeMode } = useActiveMode();
  const { teams } = useFeatureFlags();
  const [step, setStep] = useState<Step>('context');
  const [coachContext, setCoachContext] = useState<'solo' | 'with_coach' | null>(null);
  /** workout: сначала способ ввода, потом форма */
  const [workoutInputMode, setWorkoutInputMode] = useState<'ai' | 'manual' | null>(null);

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
  const legacyOnboardingWorkoutInitialType =
    athletePrimaryGoal && athletePrimaryGoal !== 'general'
      ? workoutTypeForAthletePrimaryGoal(athletePrimaryGoal)
      : DEFAULT_WORKOUT_TYPE;

  const handleSkip = () => {
    if (!user) return;
    updateUser({
      ...user,
      clientPreferences: {
        ...user.clientPreferences,
        athleteOnboardingComplete: true,
      },
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

  const finishToCalendar = () => {
    navigate('/calendar');
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

  if (!user) {
    return <></>;
  }

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

        {step === 'context' && (
          <>
            <ScreenHeader
              icon="👋"
              title="Добро пожаловать"
              description="За пару минут настроим профиль и первую тренировку — так быстрее появится ценность в календаре."
            />
            <p className="text-sm text-(--color_text_muted) mb-4">Как вы тренируетесь?</p>
            <div className="grid gap-3 mb-6">
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    try {
                      await setAthleteCoachIntent(user, updateUser, 'solo');
                      setCoachContext('solo');
                      setWorkoutInputMode(null);
                      setStep('workout');
                    } catch {
                      toast.error('Не удалось сохранить выбор. Проверьте сеть.');
                    }
                  })();
                }}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  coachContext === 'solo'
                    ? 'border-emerald-400 bg-emerald-500/15'
                    : 'border-(--color_border) bg-(--color_bg_card) hover:border-emerald-500/40'
                }`}
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
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  coachContext === 'with_coach'
                    ? 'border-emerald-400 bg-emerald-500/15'
                    : 'border-(--color_border) bg-(--color_bg_card) hover:border-emerald-500/40'
                }`}
              >
                <div className="text-2xl mb-1">🤝</div>
                <div className="font-semibold text-white">С тренером</div>
                <div className="text-xs text-(--color_text_muted) mt-1">
                  Дальше — как связаться с тренером по шагам
                </div>
              </button>
            </div>
          </>
        )}

        {step === 'coach_connect' && (
          <>
            <ScreenHeader
              icon="🤝"
              title="Связь с тренером"
              description="Вас к команде добавляет тренер из своего кабинета. Коротко — что ему понадобится от вас."
            />
            <div className="flex-1 min-h-0 overflow-y-auto pb-4">
              <div className="rounded-2xl border border-(--color_border) bg-(--color_bg_card) p-4 text-sm text-(--color_text_muted) leading-relaxed space-y-3">
                <p className="text-white font-medium text-[15px]">Дайте тренеру один из вариантов</p>
                <ul className="space-y-2 pl-0.5">
                  <li>
                    <span className="text-white/90 font-medium">Email</span> — почта этого аккаунта Vervel.
                  </li>
                  <li>
                    <span className="text-white/90 font-medium">Ссылка</span> — тренер пришлёт приглашение,
                    вы откроете и примете.
                  </li>
                  {teams && (
                    <li>
                      <span className="text-white/90 font-medium">QR</span> — покажите код из{' '}
                      <span className="text-white/90">Профиля</span>, тренер отсканирует при добавлении атлета.
                    </li>
                  )}
                </ul>
                {teams ? (
                  <p className="text-xs border-t border-white/10 pt-3">
                    После связи тренер и чаты появятся в{' '}
                    <span className="text-white font-medium">«Команда»</span>. Подробности снова покажем там,
                    если вы ещё не в команде.
                  </p>
                ) : (
                  <p className="text-xs border-t border-white/10 pt-3">
                    Передайте тренеру email — дальнейшие шаги по договорённости. Раздел «Команда» и QR в
                    профиле можно включить в настройках, если понадобятся.
                  </p>
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
              <AccentButton
                className="flex-1 font-semibold"
                onClick={() => {
                  setWorkoutInputMode(null);
                  setStep('workout');
                }}
              >
                Понятно, дальше
              </AccentButton>
            </div>
          </>
        )}

        {step === 'workout' && workoutInputMode === null && (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto pb-4">
              <ScreenHeader
                icon="💪"
                title="Первая тренировка"
                description="Как удобнее занести упражнения? ИИ — как в обычной форме (фото, текст, описание). Вручную — только поля и список, без списаний за ИИ."
              />
              <p className="text-[11px] text-(--color_text_muted) mb-2 leading-snug">
                Каталог названий слабее ИИ — если не хотите ковыряться в списке, берите ИИ.
              </p>
              <div className="grid gap-2 w-full shrink-0">
                <button
                  type="button"
                  onClick={() => setWorkoutInputMode('ai')}
                  className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3 text-left flex gap-3 items-start self-start w-full transition-colors hover:bg-emerald-500/15"
                >
                  <span className="text-xl shrink-0 leading-none pt-0.5" aria-hidden>
                    ✨
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white">С помощью ИИ</span>
                      <span className="text-[9px] font-semibold uppercase tracking-wide text-emerald-400/90">
                        Рекомендуем
                      </span>
                    </div>
                    <p className="text-[11px] text-(--color_text_muted) mt-0.5 leading-snug">
                      Фото, текст, описание — как в «Новой тренировке». Платёж с кошелька за правилами
                      сервиса.
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setWorkoutInputMode('manual')}
                  className="rounded-xl border border-(--color_border) bg-(--color_bg_card) p-3 text-left flex gap-3 items-start self-start w-full transition-colors hover:border-white/25"
                >
                  <span className="text-xl shrink-0 leading-none pt-0.5" aria-hidden>
                    ✏️
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white">Вручную</div>
                    <p className="text-[11px] text-(--color_text_muted) mt-0.5 leading-snug">
                      Дата, тип, упражнения из списка, без ИИ.
                    </p>
                  </div>
                </button>
              </div>
            </div>
            <div className="shrink-0 pt-2">
              <GhostButton
                variant="solid"
                className="w-full"
                onClick={() => setStep(showCoachConnect ? 'coach_connect' : 'context')}
              >
                Назад
              </GhostButton>
            </div>
          </>
        )}

        {step === 'workout' && workoutInputMode !== null && (
          <>
            <ScreenHeader
              icon="💪"
              title="Первая тренировка"
              description={
                workoutInputMode === 'ai'
                  ? 'Сначала вставьте текст программы или выберите упражнения вручную — остальное по желанию.'
                  : 'Дата, тип и упражнения из списка. ИИ на этом шаге отключён.'
              }
            />
            {/* Без вложенного overflow-y-auto — иначе dnd по упражнениям режется; скролл даёт .screen */}
            <div className="min-w-0 w-full">
              <WorkoutFormBase
                lightOnboarding
                athletePrimaryGoal={athletePrimaryGoal}
                initialType={legacyOnboardingWorkoutInitialType}
                hideAiAssist={workoutInputMode === 'manual'}
                notesLabel="Заметки (по желанию)"
                notesPlaceholder="Как прошла сессия…"
                submitLabel="Сохранить тренировку"
                onSubmit={handleWorkoutSubmit}
                onCancel={() => setWorkoutInputMode(null)}
              />
            </div>
          </>
        )}

        {step === 'done' && (
          <div className="flex flex-col py-4">
            <div className="text-center shrink-0">
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-xl font-bold text-white mb-2">Отличное начало</h2>
              <p className="text-sm text-(--color_text_muted) mb-4 max-w-sm mx-auto">
                Тренировка в календаре. Ниже — по желанию: установка на экран и уведомления (как в
                настройках профиля).
              </p>
            </div>

            <OnboardingPwaPushSection />

            <div className="shrink-0 w-full max-w-md mx-auto space-y-2">
              <AccentButton className="w-full font-semibold py-3" onClick={finishToCalendar}>
                Перейти в календарь
              </AccentButton>
              <button
                type="button"
                onClick={() => navigate('/home', { replace: true })}
                className="w-full text-sm text-(--color_text_muted) hover:text-white transition-colors py-2"
              >
                На главную
              </button>
              <button
                type="button"
                onClick={() => navigate('/profile?tab=settings')}
                className="w-full text-xs text-(--color_text_muted) hover:text-emerald-400/90 transition-colors"
              >
                Все настройки уведомлений и ярлыка на экране → Настройки
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </Screen>
  );
}
