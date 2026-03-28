import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import StreakCard from '@/components/StreakCard/StreakCard';
import AchievementsList from '@/components/AchievementsList/AchievementsList';
import ScreenLinks from '@/components/ScreenLinks/ScreenLinks';
import { profileApi, type ProfileData } from '@/api/profile';
import { streakApi } from '@/api/streak';
import ToggleGroup from '@/components/ui/ToggleGroup';
import toast from 'react-hot-toast';
import ScreenHint from '@/components/ScreenHint/ScreenHint';

export default function StreakScreen() {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modeLoading, setModeLoading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await profileApi.getProfile();
      if (response.data.success) {
        setProfileData(response.data.data);
      }
    } catch {
      toast.error('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const handleSetMode = async (mode: 'simple' | 'intensive') => {
    if (!profileData || modeLoading) return;
    if (profileData.stats.streakMode === mode) return;
    try {
      setModeLoading(true);
      await streakApi.setMode(mode);
      setProfileData((prev) =>
        prev
          ? {
              ...prev,
              stats: {
                ...prev.stats,
                streakMode: mode,
                weeklyRequired: mode === 'intensive' ? 5 : 3,
              },
            }
          : prev
      );
      toast.success(mode === 'intensive' ? 'Усиленный режим включён' : 'Обычный режим включён');
    } catch {
      toast.error('Не удалось сменить режим');
    } finally {
      setModeLoading(false);
    }
  };

  if (!profileData) return <Screen loading={loading} className="streak-screen" />;

  const { stats } = profileData;
  const mode = stats.streakMode ?? 'simple';

  return (
    <Screen className="streak-screen">
      <div className="p-4 w-full max-w-4xl mx-auto space-y-4">
        <ScreenHeader
          icon={mode === 'intensive' ? '⚡' : '🔥'}
          title="Ударный режим"
          description="Тренируйтесь регулярно каждую неделю — счётчик растёт, пропустите неделю — сбросится"
        />

        {/* Mode selector */}
        <ToggleGroup
          cols={2}
          value={mode}
          onChange={(m) => handleSetMode(m as 'simple' | 'intensive')}
          options={[
            { value: 'simple',    label: <span className="flex items-center justify-center gap-1.5">🔥 Обычный <span className="opacity-60 text-xs">3/нед</span></span> },
            { value: 'intensive', label: <span className="flex items-center justify-center gap-1.5">⚡ Усиленный <span className="opacity-60 text-xs">5/нед</span></span> },
          ]}
        />

        {/* How it works */}
        <ScreenHint>
          {mode === 'simple' ? (
            <>
              <span className="text-(--color_text_primary) font-medium">Обычный режим:</span>{' '}
              тренируйтесь{' '}
              <span className="text-(--color_text_primary) font-medium">3 раза в неделю</span>.
              Завершили неделю — счётчик растёт. Не успели — серия сбросится.{' '}
              Счётчик считает недели, а не дни.
            </>
          ) : (
            <>
              <span className="text-(--color_text_primary) font-medium">Усиленный режим:</span>{' '}
              тренируйтесь{' '}
              <span className="text-(--color_text_primary) font-medium">5 раз в неделю</span>.
              Сложнее, но результат быстрее. Пропустите неделю — серия сбросится.
            </>
          )}
        </ScreenHint>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3"
        >
          <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border) text-center">
            <div className="text-2xl font-bold text-(--color_text_primary)">{stats.totalWorkouts}</div>
            <div className="text-xs text-(--color_text_muted) mt-1">Тренировок</div>
          </div>
          <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border) text-center">
            <div className="text-2xl font-bold text-(--color_text_primary)">{stats.streak}</div>
            <div className="text-xs text-(--color_text_muted) mt-1">Недель подряд</div>
          </div>
          <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border) text-center">
            <div className="text-2xl font-bold text-(--color_text_primary)">{stats.longestStreak}</div>
            <div className="text-xs text-(--color_text_muted) mt-1">Рекорд недель</div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <StreakCard
            currentStreak={stats.streak}
            longestStreak={stats.longestStreak}
            mode={mode}
            currentWeekWorkouts={stats.currentWeekWorkouts ?? 0}
            weeklyRequired={stats.weeklyRequired ?? 3}
            onClick={() => navigate('/profile')}
          />
        </motion.div>

        {/* Achievements */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <AchievementsList />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <ScreenLinks links={[
            { emoji: '💪', bg: 'bg-orange-500/20', label: 'Добавить тренировку', sub: 'Чтобы не прервать серию', to: '/workouts/new' },
            { emoji: '📅', bg: 'bg-blue-500/20',   label: 'Календарь',           sub: 'История тренировок',    to: '/calendar' },
            { emoji: '📊', bg: 'bg-violet-500/20', label: 'Аналитика',           sub: 'Прогресс и нагрузки',   to: '/analytics' },
          ]} />
        </motion.div>
      </div>
    </Screen>
  );
}
