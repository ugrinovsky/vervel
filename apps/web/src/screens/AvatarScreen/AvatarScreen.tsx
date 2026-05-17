import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import AvatarView from '@/components/AvatarView/AvatarView';
import { avatarApi, type ZoneState } from '@/api/avatar';
import { athleteApi } from '@/api/athlete';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedBlock from '@/components/ui/AnimatedBlock';
import SectionGroup from '@/components/ui/SectionGroup';
import { useAuth } from '@/contexts/AuthContext';
import { WORKOUT_TYPE_CONFIG } from '@/constants/AnalyticsConstants';
import ScreenHint from '@/components/ScreenHint/ScreenHint';
import AccentButton from '@/components/ui/AccentButton';
import Button, { MotionButton } from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { toDateKey, getCurrentHour } from '@/utils/date';
import { useAthleteWorkoutDraftLocal } from '@/hooks/useAthleteWorkoutDraftLocal';

interface TodayWorkout {
  id: number;
  workoutType: string;
  exerciseCount: number;
  notes: string | null;
}

function getGreeting(fullName: string | null | undefined) {
  const hour = getCurrentHour();
  const firstName = fullName?.trim().split(' ')[0] ?? null;
  const base = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
  return firstName ? `${base}, ${firstName}` : base;
}

function getMotivation(lastWorkoutDaysAgo: number | null, allTimeWorkouts: number) {
  if (allTimeWorkouts === 0)
    return { text: 'Добавьте первую тренировку — карта оживёт!', emoji: '🚀' };
  if (lastWorkoutDaysAgo === 0)
    return { text: 'Уже потренировались сегодня. Отличная работа!', emoji: '🔥' };
  if (lastWorkoutDaysAgo === 1)
    return { text: 'Вчера была тренировка — тело восстанавливается.', emoji: '💪' };
  if (lastWorkoutDaysAgo !== null && lastWorkoutDaysAgo <= 3)
    return { text: `${lastWorkoutDaysAgo} дня без тренировок — время вернуться!`, emoji: '⚡' };
  if (lastWorkoutDaysAgo !== null)
    return { text: `${lastWorkoutDaysAgo} дней перерыва — с возвращением!`, emoji: '👋' };
  return { text: 'Рады видеть вас снова!', emoji: '👋' };
}

const ONBOARDING_FEATURES = [
  {
    emoji: '📸',
    title: 'ИИ-распознавание',
    desc: 'По фото ИИ сам занесёт упражнения',
  },
  {
    emoji: '🗺️',
    title: 'Карта мышц',
    desc: 'Видно, какие мышцы нагружены сейчас, а какие уже готовы к следующей тренировке',
  },
  {
    emoji: '🔥',
    title: 'Серия недель',
    desc: 'Тренируйся 3 раза в неделю — копи серию и соревнуйся с командой',
  },
];

export default function AvatarScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { draft: workoutDraft } = useAthleteWorkoutDraftLocal(user?.id);
  const [zones, setZones] = useState<Record<string, ZoneState>>({});
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [allTimeWorkouts, setAllTimeWorkouts] = useState(0);
  const [thisWeekWorkouts, setThisWeekWorkouts] = useState(0);
  const [lastWorkoutDaysAgo, setLastWorkoutDaysAgo] = useState<number | null>(null);
  const [missingWeights, setMissingWeights] = useState<{
    workoutsCount: number;
    setsCount: number;
    lastWorkoutId: number | null;
    lastWorkoutDate: string | null;
  } | null>(null);
  const [missingRpe, setMissingRpe] = useState<{
    workoutsCount: number;
    lastWorkoutId: number | null;
    lastWorkoutDate: string | null;
  } | null>(null);
  const [emptyWorkouts, setEmptyWorkouts] = useState<{ workoutsCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayWorkout, setTodayWorkout] = useState<TodayWorkout | null>(null);

  const reloadAvatarStats = useCallback(async () => {
    try {
      const avatarRes = await avatarApi.getRecoveryState();
      if (avatarRes.data.success) {
        const d = avatarRes.data.data;
        setZones(d.zones);
        setTotalWorkouts(d.totalWorkouts);
        setAllTimeWorkouts(d.allTimeWorkouts ?? d.totalWorkouts);
        setThisWeekWorkouts(d.thisWeekWorkouts ?? 0);
        setLastWorkoutDaysAgo(d.lastWorkoutDaysAgo);
        setMissingWeights(d.missingWeights ?? null);
        setMissingRpe(d.missingRpe ?? null);
        setEmptyWorkouts(d.emptyWorkouts ?? null);
      }
    } catch (error) {
      console.error('Failed to refresh avatar stats:', error);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [avatarRes, workoutsRes] = await Promise.all([
          avatarApi.getRecoveryState(),
          athleteApi.getUpcomingWorkouts(),
        ]);
        if (avatarRes.data.success) {
          const d = avatarRes.data.data;
          setZones(d.zones);
          setTotalWorkouts(d.totalWorkouts);
          setAllTimeWorkouts(d.allTimeWorkouts ?? d.totalWorkouts);
          setThisWeekWorkouts(d.thisWeekWorkouts ?? 0);
          setLastWorkoutDaysAgo(d.lastWorkoutDaysAgo);
          setMissingWeights(d.missingWeights ?? null);
          setMissingRpe(d.missingRpe ?? null);
          setEmptyWorkouts(d.emptyWorkouts ?? null);
        }
        if (workoutsRes.data.success) {
          const todayStr = toDateKey(new Date());
          const found = workoutsRes.data.data.find((w) => w.date.slice(0, 10) === todayStr);
          setTodayWorkout(found ?? null);
        }
      } catch (error) {
        console.error('Failed to load avatar stats:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const motivation = !loading ? getMotivation(lastWorkoutDaysAgo, allTimeWorkouts) : null;
  const isNewUser = !loading && allTimeWorkouts === 0;
  // Показываем прогресс-баннер новым пользователям (есть хоть 1 тренировка, но серия ещё не устойчива)
  const showStreakProgress = !loading && allTimeWorkouts > 0 && allTimeWorkouts <= 10;

  return (
    <Screen className="avatar-screen">
      <div className="p-4 w-full">
        <ScreenHeader
          icon="🏋️"
          title="Карта нагрузки"
          description="Визуализация восстановления мышц — красный цвет значит активная нагрузка, зелёный — мышцы готовы к следующей тренировке"
        />

        <SectionGroup showLabel={false} showBreakAfter={false} bodyClassName="space-y-4">
          <AnimatedBlock className="card-shadow w-full rounded-2xl p-4 border border-(--color_primary_light)/30 bg-(--color_primary_light)/10">
            <div className="flex items-center gap-3">
              <div className="text-2xl">
                {getCurrentHour() < 12 ? '☀️' : getCurrentHour() < 18 ? '🌤️' : '🌙'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold text-(--color_text_primary)">
                  {getGreeting(user?.fullName)}
                </div>
                <div className="text-xs text-(--color_text_secondary) mt-0.5 min-h-4">
                  {motivation?.text ?? ''}
                </div>
              </div>
            </div>
          </AnimatedBlock>

          {workoutDraft && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="draft-banner flex items-center justify-between gap-3 px-4 py-3 rounded-xl"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-amber-300">Незаконченная тренировка</p>
                <p className="text-xs text-amber-400/70 mt-0.5 truncate">
                  {workoutDraft.exercises.length} упр. ·{' '}
                  {workoutDraft.workoutType === 'bodybuilding'
                    ? 'Силовая'
                    : workoutDraft.workoutType === 'crossfit'
                      ? 'CrossFit'
                      : 'Кардио'}
                </p>
              </div>
              <AccentButton
                size="sm"
                onClick={() => navigate('/workouts/new')}
                className="shrink-0"
              >
                Продолжить
              </AccentButton>
            </motion.div>
          )}

          {/* Тренировка от тренера сегодня */}
          <AnimatePresence>
            {todayWorkout && (
              <MotionButton
                type="button"
                variant="unstyled"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onClick={() => navigate('/calendar')}
                className="w-full text-left rounded-2xl p-4 bg-(--color_primary_light) text-white relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative flex items-center gap-3">
                  <div className="text-2xl">📋</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white/70 uppercase tracking-wider mb-0.5">
                      Тренировка от тренера · Сегодня
                    </div>
                    <div className="text-base font-bold text-white truncate">
                      {WORKOUT_TYPE_CONFIG[todayWorkout.workoutType] ?? todayWorkout.workoutType}
                      {' · '}
                      {todayWorkout.exerciseCount} упр.
                    </div>
                  </div>
                  <div className="text-white/60 text-sm shrink-0">→</div>
                </div>
              </MotionButton>
            )}
          </AnimatePresence>

          {/* Streak progress banner — для новых пользователей */}
          <AnimatePresence>
            {showStreakProgress && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="glass rounded-2xl p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-white">Эта неделя</span>
                  <span className="text-xs text-(--color_text_muted)">
                    {thisWeekWorkouts} / 3 тренировок
                  </span>
                </div>
                <div className="flex gap-1.5 mb-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded-full transition-colors ${
                        i < thisWeekWorkouts ? 'bg-(--color_primary_light)' : 'bg-white/25'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-(--color_text_muted)">
                  {thisWeekWorkouts === 0
                    ? 'Начни неделю — первая тренировка запускает серию'
                    : thisWeekWorkouts === 1
                      ? 'Хорошее начало! Ещё 2 тренировки — и серия засчитана'
                      : thisWeekWorkouts === 2
                        ? 'Почти! Одна тренировка до завершения недели'
                        : 'Неделя выполнена — серия идёт! 🔥'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Единый инфоблок с подсказками по качеству данных */}
          {!loading &&
            (() => {
              const items: Array<{
                color: 'amber' | 'sky' | 'white';
                title: string;
                body: string;
                action?: { label: string; to: string };
              }> = [];

              if (missingWeights && missingWeights.setsCount > 0) {
                items.push({
                  color: 'amber',
                  title: 'Точность карты снижена',
                  body: `В последних тренировках есть подходы без веса (${missingWeights.setsCount}). Заполните веса — нагрузка по мышцам станет точнее.`,
                  action: { label: 'Заполнить', to: '/calendar' },
                });
              }
              if (missingRpe && missingRpe.workoutsCount > 0) {
                items.push({
                  color: 'sky',
                  title: 'Оцените тренировки',
                  body: `Укажите, как ощущалась нагрузка (шкала 1–5 в карточке) — так карта и прогресс будут точнее.${missingRpe.workoutsCount > 1 ? ` Не хватает оценки у ${missingRpe.workoutsCount} тренировок.` : ''}`,
                  action: { label: 'К календарю', to: '/calendar' },
                });
              }
              if (emptyWorkouts && emptyWorkouts.workoutsCount > 0) {
                items.push({
                  color: 'white',
                  title: 'Есть тренировки без упражнений',
                  body: `${emptyWorkouts.workoutsCount === 1 ? '1 тренировка сохранена' : `${emptyWorkouts.workoutsCount} тренировки сохранены`} без упражнений. Добавьте упражнения — и карта нагрузки станет полнее.`,
                  action: { label: 'К календарю', to: '/calendar' },
                });
              }

              if (items.length === 0) return null;

              const colorMap = {
                amber: {
                  bg: 'bg-amber-500/8',
                  border: 'border-amber-500/20',
                  dot: 'bg-amber-400',
                  title: 'text-amber-300',
                  body: 'text-amber-400/70',
                  divider: 'border-amber-500/15',
                },
                sky: {
                  bg: 'bg-sky-500/8',
                  border: 'border-sky-500/20',
                  dot: 'bg-sky-400',
                  title: 'text-sky-200',
                  body: 'text-sky-300/70',
                  divider: 'border-sky-500/15',
                },
                white: {
                  bg: 'bg-white/4',
                  border: 'border-white/10',
                  dot: 'bg-white/40',
                  title: 'text-white/80',
                  body: 'text-white/45',
                  divider: 'border-white/8',
                },
              };

              return (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-2xl overflow-hidden"
                >
                  {items.map((item, idx) => {
                    const c = colorMap[item.color];
                    return (
                      <div
                        key={idx}
                        className={`${c.bg} px-4 py-3 ${idx < items.length - 1 ? `border-b ${c.divider}` : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-1.5 h-1.5 rounded-full ${c.dot} mt-1.5 shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${c.title}`}>{item.title}</p>
                            <p className={`text-xs ${c.body} mt-0.5 leading-snug`}>{item.body}</p>
                          </div>
                          {item.action && (
                            <Button
                              type="button"
                              variant="link"
                              onClick={() => navigate(item.action!.to)}
                              className={`text-xs font-medium shrink-0 mt-0.5 !no-underline ${c.title} hover:opacity-80`}
                            >
                              {item.action.label} →
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              );
            })()}
          {/* Athlete Copilot — временно скрыт */}
        </SectionGroup>

        <SectionGroup title="Карта нагрузки" showBreakAfter={false}>
          {/* Пока грузим статистику — не показываем карту: иначе новый пользователь сначала видит аватар, потом онбординг */}
          {loading ? (
            <AnimatedBlock delay={0.12}>
              <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-(--color_border) bg-(--color_bg_card)/40">
                <LoadingSpinner size="md" variant="light" />
              </div>
            </AnimatedBlock>
          ) : isNewUser ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-5 space-y-4"
            >
              <div className="text-center">
                <div className="text-4xl mb-2">👋</div>
                <h2 className="text-base font-bold text-white">Добро пожаловать в Vervel!</h2>
                <p className="text-xs text-(--color_text_muted) mt-1">
                  Начните отслеживать тренировки — и карта нагрузки оживёт
                </p>
              </div>

              <div className="space-y-3">
                {ONBOARDING_FEATURES.map(({ emoji, title, desc }) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-(--color_primary_light)/20 flex items-center justify-center text-lg shrink-0">
                      {emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{title}</div>
                      <div className="text-xs text-(--color_text_muted) mt-0.5">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <AccentButton onClick={() => navigate('/workouts/new')} className="w-full">
                Добавить первую тренировку
              </AccentButton>
            </motion.div>
          ) : (
            <>
              <ScreenHint>
                Карта обновляется автоматически после каждой тренировки.{' '}
                <span className="text-white font-medium">Нажмите на зону</span> — увидите детали
                нагрузки и статус восстановления. Чем ярче цвет — тем свежее нагрузка на эту группу
                мышц.
              </ScreenHint>

              <AnimatedBlock delay={0.12}>
                <AvatarView
                  zones={zones}
                  totalWorkouts={totalWorkouts}
                  lastWorkoutDaysAgo={lastWorkoutDaysAgo}
                  loading={false}
                  gender={user?.gender ?? 'male'}
                  onWorkoutsMutated={reloadAvatarStats}
                />
              </AnimatedBlock>
            </>
          )}
        </SectionGroup>
      </div>
    </Screen>
  );
}
