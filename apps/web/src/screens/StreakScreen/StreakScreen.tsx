import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import StreakCard from '@/components/StreakCard/StreakCard';
import AchievementsList from '@/components/AchievementsList/AchievementsList';
import ScreenLinks from '@/components/ScreenLinks/ScreenLinks';
import { profileApi, type ProfileData } from '@/api/profile';
import toast from 'react-hot-toast';
import ScreenHint from '@/components/ScreenHint/ScreenHint';

export default function StreakScreen() {
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (!profileData) return <Screen loading={loading} className="streak-screen" />;

  const current = profileData.stats.streak;

  return (
    <Screen className="streak-screen">
      <div className="p-4 w-full max-w-4xl mx-auto space-y-4">
        <ScreenHeader
          icon="🔥"
          title="Ударный режим"
          description="Ваша серия тренировочных дней и коллекция достижений — не пропускайте занятия, чтобы разблокировать новые"
        />

        <ScreenHint className="mb-4">
          Тренируйтесь каждый день — серия растёт. Пропустите день —{' '}
          <span className="text-white font-medium">счётчик сбросится</span>, но рекорд останется.
          Достигайте вех в 3, 7, 14, 30 и 90 дней, чтобы разблокировать достижения.
        </ScreenHint>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3"
        >
          <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border) text-center">
            <div className="text-2xl font-bold text-white">{profileData.stats.totalWorkouts}</div>
            <div className="text-xs text-(--color_text_muted) mt-1">Тренировок</div>
          </div>
          <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border) text-center">
            <div className="text-2xl font-bold text-white">{profileData.stats.streak}</div>
            <div className="text-xs text-(--color_text_muted) mt-1">Дней подряд</div>
          </div>
          <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border) text-center">
            <div className="text-2xl font-bold text-white">{profileData.stats.longestStreak}</div>
            <div className="text-xs text-(--color_text_muted) mt-1">Рекорд дней</div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <StreakCard
            currentStreak={current}
            longestStreak={profileData.stats.longestStreak}
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
