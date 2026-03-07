import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import AvatarView from '@/components/AvatarView/AvatarView';
import { avatarApi, type ZoneState } from '@/api/avatar';
import { athleteApi } from '@/api/athlete';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { TYPE_LABELS } from '@/constants/AnalyticsConstants';


interface TodayWorkout {
  id: number;
  workoutType: string;
  exerciseCount: number;
  notes: string | null;
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
          const todayStr = new Date().toISOString().slice(0, 10);
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

  return (
    <Screen className="avatar-screen">
      <div className="p-4 w-full">
        <ScreenHeader
          icon="🏋️"
          title="Карта нагрузки"
          description="Визуализация восстановления мышц — красный цвет значит активная нагрузка, зелёный — мышцы готовы к следующей тренировке"
        />

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
                    {TYPE_LABELS[todayWorkout.workoutType] ?? todayWorkout.workoutType}
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

        <AvatarView
          zones={zones}
          totalWorkouts={totalWorkouts}
          lastWorkoutDaysAgo={lastWorkoutDaysAgo}
          loading={loading}
          gender={user?.gender ?? 'male'}
        />
      </div>
    </Screen>
  );
}
