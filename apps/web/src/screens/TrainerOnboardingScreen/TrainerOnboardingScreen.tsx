import { useEffect, useState, type JSX } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import AccentButton from '@/components/ui/AccentButton';
import GhostButton from '@/components/ui/GhostButton';
import { useAuth, useActiveMode } from '@/contexts/AuthContext';
import { parseStoredAuthUserJson } from '@/util/parseStoredAuthUser';
import {
  getTrainerOnboardingAthletesStep,
  getTrainerOnboardingWorkflowStep,
  getTrainerWorkStyleIntent,
  markTrainerOnboardingComplete,
  setTrainerWorkStyleIntent,
  shouldShowTrainerOnboarding,
  type TrainerWorkStyleIntent,
} from '@/util/trainerOnboarding';
import OnboardingPwaPushSection from '@/components/OnboardingPwaPushSection/OnboardingPwaPushSection';
import { profileApi } from '@/api/profile';

type Step = 'focus' | 'athletes' | 'workflow' | 'done';

const STYLE_OPTIONS: { id: TrainerWorkStyleIntent; title: string; hint: string; emoji: string }[] = [
  { id: 'individual', title: 'В основном индивидуально', hint: 'Один на один с атлетами', emoji: '👤' },
  { id: 'groups', title: 'Группы', hint: 'Несколько человек вместе, общий чат', emoji: '👥' },
  { id: 'both', title: 'И то и другое', hint: 'Смешанный формат', emoji: '🔀' },
];

function progressForStep(step: Step): { current: number; total: number } {
  const map: Record<Step, number> = {
    focus: 1,
    athletes: 2,
    workflow: 3,
    done: 4,
  };
  return { current: map[step], total: 4 };
}

export default function TrainerOnboardingScreen(): JSX.Element {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { activeMode } = useActiveMode();
  const [step, setStep] = useState<Step>('focus');

  useEffect(() => {
    if (!user) return;
    if (step === 'done') return;
    if (!shouldShowTrainerOnboarding(user, activeMode)) {
      navigate('/home', { replace: true });
    }
  }, [user, activeMode, navigate, step]);

  const { current: progress, total: totalSteps } = progressForStep(step);

  const handleSkip = () => {
    if (!user) return;
    updateUser({
      ...user,
      clientPreferences: {
        ...user.clientPreferences,
        trainerOnboardingComplete: true,
      },
    });
    navigate('/trainer', { replace: true });
    void profileApi
      .patchClientPreferences({ trainerOnboardingComplete: true })
      .then((res) => {
        try {
          const raw = localStorage.getItem('user');
          if (!raw) return;
          const u = parseStoredAuthUserJson(raw);
          if (!u) return;
          updateUser({ ...u, clientPreferences: res.data.data.clientPreferences });
          localStorage.removeItem(`vervel_trainer_onboarding_v1_${user.id}`);
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        toast.error('Не удалось сохранить на сервере. Проверьте сеть.');
      });
  };

  const selectWorkStyle = async (style: TrainerWorkStyleIntent) => {
    if (!user) return;
    try {
      await setTrainerWorkStyleIntent(user, updateUser, style);
      setStep('athletes');
    } catch {
      toast.error('Не удалось сохранить. Проверьте сеть и попробуйте снова.');
    }
  };

  const completeWorkflowStep = async () => {
    if (!user) return;
    try {
      await markTrainerOnboardingComplete(user, updateUser);
      setStep('done');
    } catch {
      toast.error('Не удалось сохранить. Проверьте сеть и попробуйте снова.');
    }
  };

  const finishToTrainerHome = () => {
    navigate('/trainer', { replace: true });
  };

  if (!user) {
    return <></>;
  }

  const workStyle = getTrainerWorkStyleIntent(user);
  const athletesOnboarding = getTrainerOnboardingAthletesStep(workStyle);
  const workflowOnboarding = getTrainerOnboardingWorkflowStep(workStyle);

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

        {step === 'focus' && (
          <>
            <ScreenHeader
              icon="🏋️"
              title="Кабинет тренера"
              description="Как в целом ведёте работу? На экране «Сегодня» подстроим подсказки, порядок быстрых ссылок и шаги «С чего начать», пока нет атлетов."
            />
            <p className="text-sm text-(--color_text_muted) mb-3">Формат работы</p>
            <div className="grid gap-2 w-full shrink-0">
              {STYLE_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => void selectWorkStyle(o.id)}
                  className="rounded-xl border border-(--color_border) bg-(--color_bg_card) p-3 text-left self-start w-full transition-colors hover:border-emerald-500/40"
                >
                  <div className="text-2xl mb-1">{o.emoji}</div>
                  <div className="font-semibold text-white">{o.title}</div>
                  <div className="text-xs text-(--color_text_muted) mt-1">{o.hint}</div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-(--color_text_muted) mt-3 leading-snug">
              После клика вы перейдёте на следующий шаг. Чтобы сменить вариант и увидеть другой порядок на
              «Сегодня», вернитесь на этот шаг кнопкой «Назад» на следующих экранах и выберите снова —
              сохранится <span className="text-white/80">последний</span> выбор перед завершением мастера.
            </p>
          </>
        )}

        {step === 'athletes' && (
          <>
            <ScreenHeader
              icon={athletesOnboarding.icon}
              title={athletesOnboarding.title}
              description={athletesOnboarding.description}
            />
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="rounded-2xl border border-(--color_border) bg-(--color_bg_card) p-4 text-sm text-(--color_text_muted) leading-relaxed space-y-3">
                <p className="leading-snug">{athletesOnboarding.cardLead}</p>
                <p className="text-white font-medium text-[15px]">{athletesOnboarding.cardHowTitle}</p>
                <p>Раздел «Команда» → список атлетов → «Добавить»:</p>
                <ul className="space-y-2 pl-0.5">
                  <li>
                    <span className="text-white/90 font-medium">По email</span> — атлет уже зарегистрирован
                    в Vervel.
                  </li>
                  <li>
                    <span className="text-white/90 font-medium">Ссылка</span> — сгенерировать и отправить
                    атлету, он откроет и примет.
                  </li>
                  <li>
                    <span className="text-white/90 font-medium">QR</span> — сканировать код из профиля атлета.
                  </li>
                </ul>
              </div>
            </div>
            <div className="flex gap-2 shrink-0 pt-3">
              <GhostButton variant="solid" className="flex-1" onClick={() => setStep('focus')}>
                Назад
              </GhostButton>
              <AccentButton className="flex-1 font-semibold" onClick={() => setStep('workflow')}>
                Дальше
              </AccentButton>
            </div>
          </>
        )}

        {step === 'workflow' && (
          <>
            <ScreenHeader
              icon="📅"
              title={workflowOnboarding.title}
              description={workflowOnboarding.description}
            />
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="rounded-2xl border border-(--color_border) bg-(--color_bg_card) p-4 text-sm text-(--color_text_muted) leading-relaxed space-y-3">
                <p className="leading-snug">{workflowOnboarding.pointsIntro}</p>
                <ol className="list-decimal list-inside space-y-2">
                  {workflowOnboarding.points.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ol>
                <p className="text-xs border-t border-white/10 pt-3">{workflowOnboarding.footer}</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0 pt-3">
              <GhostButton variant="solid" className="flex-1" onClick={() => setStep('athletes')}>
                Назад
              </GhostButton>
              <AccentButton className="flex-1 font-semibold" onClick={() => void completeWorkflowStep()}>
                Понятно, дальше
              </AccentButton>
            </div>
          </>
        )}

        {step === 'done' && (
          <div className="flex flex-col py-2">
            <div className="text-center shrink-0">
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-xl font-bold text-white mb-2">Кабинет готов к работе</h2>
              <p className="text-sm text-(--color_text_muted) mb-4 max-w-sm mx-auto px-1">
                Дальше — добавить атлетов и первые назначения. Ниже по желанию: приложение на экран и
                уведомления.
              </p>
            </div>
            <OnboardingPwaPushSection />
            <div className="shrink-0 w-full max-w-md mx-auto space-y-2">
              <AccentButton className="w-full font-semibold py-3" onClick={finishToTrainerHome}>
                Перейти на «Сегодня»
              </AccentButton>
              <button
                type="button"
                onClick={() => navigate('/trainer/team')}
                className="w-full py-2 text-sm text-emerald-400/90 hover:text-emerald-300 transition-colors"
              >
                Открыть «Команда» и добавить атлета
              </button>
              <button
                type="button"
                onClick={() => navigate('/profile?tab=settings')}
                className="w-full text-xs text-(--color_text_muted) hover:text-emerald-400/90 transition-colors py-1"
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
