import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import AvatarView from '@/components/AvatarView/AvatarView';
import { avatarApi, type ZoneState } from '@/api/avatar';
import { athleteApi } from '@/api/athlete';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedBlock from '@/components/ui/AnimatedBlock';
import { useAuth } from '@/contexts/AuthContext';
import { WORKOUT_TYPE_CONFIG } from '@/constants/AnalyticsConstants';
import ScreenHint from '@/components/ScreenHint/ScreenHint';
import { toDateKey, getCurrentHour } from '@/utils/date';


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

function getMotivation(lastWorkoutDaysAgo: number | null, totalWorkouts: number) {
  if (totalWorkouts === 0) return { text: 'Первая тренировка позади — это уже победа!', emoji: '🎉' };
  if (lastWorkoutDaysAgo === 0) return { text: 'Уже потренировались сегодня. Отличная работа!', emoji: '🔥' };
  if (lastWorkoutDaysAgo === 1) return { text: 'Вчера была тренировка — тело восстанавливается.', emoji: '💪' };
  if (lastWorkoutDaysAgo !== null && lastWorkoutDaysAgo <= 3) return { text: `${lastWorkoutDaysAgo} дня без тренировок — время вернуться!`, emoji: '⚡' };
  if (lastWorkoutDaysAgo !== null) return { text: `${lastWorkoutDaysAgo} дней перерыва — с возвращением!`, emoji: '👋' };
  return { text: 'Рады видеть вас снова!', emoji: '👋' };
}

export default function AvatarScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [zones, setZones] = useState<Record<string, ZoneState>>({});
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [lastWorkoutDaysAgo, setLastWorkoutDaysAgo] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayWorkout, setTodayWorkout] = useState<TodayWorkout | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [avatarRes, workoutsRes] = await Promise.all([
          avatarApi.getRecoveryState(),
          athleteApi.getUpcomingWorkouts(),
        ]);
        if (avatarRes.data.success) {
          setZones(avatarRes.data.data.zones);
          setTotalWorkouts(avatarRes.data.data.totalWorkouts);
          setLastWorkoutDaysAgo(avatarRes.data.data.lastWorkoutDaysAgo);
        }
        if (workoutsRes.data.success) {
          const todayStr = toDateKey(new Date());
          const found = workoutsRes.data.data.find(
            (w) => (w.date as string).slice(0, 10) === todayStr
          );
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

  const motivation = !loading ? getMotivation(lastWorkoutDaysAgo, totalWorkouts) : null;

  return (
    <Screen className="avatar-screen">
      <div className="p-4 w-full">
        <ScreenHeader
          icon="🏋️"
          title="Карта нагрузки"
          description="Визуализация восстановления мышц — красный цвет значит активная нагрузка, зелёный — мышцы готовы к следующей тренировке"
        />

        {/* Greeting block */}
        <AnimatedBlock className="w-full rounded-2xl p-4 mb-4 border border-(--color_primary_light)/30 bg-(--color_primary_light)/10">
          <div className="flex items-center gap-3">
            <div className="text-2xl">
              {getCurrentHour() < 12 ? '☀️' : getCurrentHour() < 18 ? '🌤️' : '🌙'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-bold text-(--color_text_primary)">{getGreeting(user?.fullName)}</div>
              <div className="text-xs text-(--color_text_secondary) mt-0.5 min-h-4">
                {motivation?.text ?? ''}
              </div>
            </div>
          </div>
        </AnimatedBlock>

        <ScreenHint className="mb-4">
          Карта обновляется автоматически после каждой тренировки.{' '}
          <span className="text-white font-medium">Нажмите на зону</span> — увидите детали нагрузки
          и статус восстановления. Чем ярче цвет — тем свежее нагрузка на эту группу мышц.
        </ScreenHint>

        {/* Тренировка от тренера сегодня */}
        <AnimatePresence>
          {todayWorkout && (
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              onClick={() => navigate('/calendar')}
              className="w-full text-left rounded-2xl p-4 mb-6 main-button relative overflow-hidden"
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
                  {todayWorkout.notes && (
                    <div className="text-xs text-white/70 mt-0.5 truncate">{todayWorkout.notes}</div>
                  )}
                </div>
                <div className="text-white/60 text-sm shrink-0">→</div>
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatedBlock delay={0.12}>
          <AvatarView
            zones={zones}
            totalWorkouts={totalWorkouts}
            lastWorkoutDaysAgo={lastWorkoutDaysAgo}
            loading={loading}
            gender={user?.gender ?? 'male'}
          />
        </AnimatedBlock>
      </div>
    </Screen>
  );
}
