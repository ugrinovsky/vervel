import { useEffect, useState, type JSX } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import AccentButton from '@/components/ui/AccentButton';
import GhostButton from '@/components/ui/GhostButton';
import AppInput from '@/components/ui/AppInput';
import PhoneInput from '@/components/ui/PhoneInput';
import { useAuth, useActiveMode } from '@/contexts/AuthContext';
import { parseStoredAuthUserJson } from '@/util/parseStoredAuthUser';
import {
  getTrainerWorkStyleIntent,
  markTrainerOnboardingComplete,
  setTrainerWorkStyleIntent,
  shouldShowTrainerOnboarding,
  type TrainerWorkStyleIntent,
} from '@/util/trainerOnboarding';
import OnboardingPwaPushSection from '@/components/OnboardingPwaPushSection/OnboardingPwaPushSection';
import { profileApi } from '@/api/profile';
import { trainerApi } from '@/api/trainer';

type Step = 'focus' | 'overview' | 'first_lead' | 'done';

const STYLE_OPTIONS: { id: TrainerWorkStyleIntent; title: string; hint: string; emoji: string }[] =
  [
    {
      id: 'individual',
      title: 'В основном индивидуально',
      hint: 'Один на один с атлетами',
      emoji: '👤',
    },
    { id: 'groups', title: 'Группы', hint: 'Несколько человек вместе', emoji: '👥' },
    { id: 'both', title: 'И то и другое', hint: 'Смешанный формат', emoji: '🔀' },
  ];

function progressForStep(step: Step): { current: number; total: number } {
  const map: Record<Step, number> = { focus: 1, overview: 2, first_lead: 3, done: 4 };
  return { current: map[step], total: 4 };
}

export default function TrainerOnboardingScreen(): JSX.Element {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const { activeMode } = useActiveMode();
  const [step, setStep] = useState<Step>('focus');
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [savingLead, setSavingLead] = useState(false);

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
      clientPreferences: { ...user.clientPreferences, trainerOnboardingComplete: true },
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
      setStep('overview');
    } catch {
      toast.error('Не удалось сохранить. Проверьте сеть и попробуйте снова.');
    }
  };

  const handleCreateLead = async () => {
    if (!leadName.trim() || !leadPhone.trim()) return;
    setSavingLead(true);
    try {
      await trainerApi.createLead({
        name: leadName.trim(),
        phone: leadPhone.trim(),
        note: null,
        source: null,
      });
      await markTrainerOnboardingComplete(user!, updateUser);
      setStep('done');
    } catch {
      toast.error('Не удалось сохранить заявку');
    } finally {
      setSavingLead(false);
    }
  };

  const handleSkipLead = async () => {
    try {
      await markTrainerOnboardingComplete(user!, updateUser);
      setStep('done');
    } catch {
      toast.error('Не удалось сохранить. Проверьте сеть.');
    }
  };

  if (!user) return <></>;

  const workStyle = getTrainerWorkStyleIntent(user);

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

        {/* ── Шаг 1: стиль работы ─────────────────────────────────────────── */}
        {step === 'focus' && (
          <>
            <ScreenHeader
              icon="🏋️"
              title="Кабинет тренера"
              description="Как в целом ведёте работу? Подстроим подсказки и порядок разделов на «Сегодня»."
            />
            <p className="text-sm text-(--color_text_muted) mb-3">Формат работы</p>
            <div className="grid gap-2 w-full shrink-0">
              {STYLE_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => void selectWorkStyle(o.id)}
                  className="glass rounded-xl p-3 text-left w-full transition-colors hover:border-emerald-500/40"
                >
                  <div className="text-2xl mb-1">{o.emoji}</div>
                  <div className="font-semibold text-white">{o.title}</div>
                  <div className="text-xs text-(--color_text_muted) mt-1">{o.hint}</div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Шаг 2: обзор возможностей ───────────────────────────────────── */}
        {step === 'overview' && (
          <>
            <ScreenHeader
              icon="📋"
              title="Что умеет кабинет"
              description="Три инструмента для работы с клиентами — всё в одном месте."
            />
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="grid gap-3">
                {[
                  {
                    emoji: '🗂️',
                    title: 'CRM — заявки',
                    desc: 'Записывайте потенциальных клиентов сразу: имя, телефон, статус. Без аккаунта в приложении.',
                  },
                  {
                    emoji: '💳',
                    title: 'Абонементы',
                    desc: 'Сколько занятий оплачено и сколько осталось. Спишите занятие после тренировки — остаток уменьшится.',
                  },
                  {
                    emoji: '📊',
                    title: 'Аналитика',
                    desc: 'Воронка заявок, конверсия, откуда приходят клиенты и кто требует внимания.',
                  },
                ].map(({ emoji, title, desc }) => (
                  <div key={title} className="glass rounded-xl flex gap-3 p-3">
                    <span className="text-2xl shrink-0 mt-0.5">{emoji}</span>
                    <div>
                      <div className="text-sm font-semibold text-white mb-0.5">{title}</div>
                      <div className="text-xs text-(--color_text_muted) leading-relaxed">
                        {desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 shrink-0 pt-3">
              <GhostButton variant="solid" className="flex-1" onClick={() => setStep('focus')}>
                Назад
              </GhostButton>
              <AccentButton className="flex-1 font-semibold" onClick={() => setStep('first_lead')}>
                Понятно, дальше
              </AccentButton>
            </div>
          </>
        )}

        {/* ── Шаг 3: первая заявка ────────────────────────────────────────── */}
        {step === 'first_lead' && (
          <>
            <ScreenHeader
              icon="📝"
              title="Запишите первого клиента"
              description="Есть кто-то на примете? Зафиксируйте прямо сейчас — имя и телефон, остальное потом."
            />
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="space-y-3">
                <AppInput
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="Имя клиента"
                />
                <PhoneInput
                  value={leadPhone}
                  onChange={setLeadPhone}
                  onKeyDown={(e) => e.key === 'Enter' && void handleCreateLead()}
                />
                {workStyle === 'individual' && (
                  <p className="text-xs text-(--color_text_muted) leading-relaxed">
                    После — откройте CRM и переведите клиента по воронке: Новый → Связался → Пробное
                    → Клиент.
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0 pt-3">
              <AccentButton
                onClick={() => void handleCreateLead()}
                disabled={savingLead || !leadName.trim() || !leadPhone.trim()}
                loading={savingLead}
                loadingText="Сохраняем..."
              >
                Записать и завершить
              </AccentButton>
              <GhostButton variant="solid" className="w-full" onClick={() => void handleSkipLead()}>
                Пропустить, добавлю позже
              </GhostButton>
            </div>
          </>
        )}

        {/* ── Done ────────────────────────────────────────────────────────── */}
        {step === 'done' && (
          <div className="flex flex-col py-2">
            <div className="text-center shrink-0">
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-xl font-bold text-white mb-2">Кабинет готов к работе</h2>
              <p className="text-sm text-(--color_text_muted) mb-4 max-w-sm mx-auto px-1">
                {leadName.trim()
                  ? `Заявка на ${leadName.trim()} сохранена в CRM. Откройте её и продолжайте работу.`
                  : 'Добавьте первого клиента в CRM и начните работу.'}
              </p>
            </div>
            <OnboardingPwaPushSection />
            <div className="shrink-0 w-full max-w-md mx-auto space-y-2">
              <AccentButton
                className="w-full font-semibold py-3"
                onClick={() => navigate('/trainer/crm')}
              >
                📋 Открыть CRM
              </AccentButton>
              <button
                type="button"
                onClick={() => navigate('/trainer', { replace: true })}
                className="w-full py-2 text-sm text-(--color_text_muted) hover:text-white transition-colors"
              >
                На главную тренера
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </Screen>
  );
}
