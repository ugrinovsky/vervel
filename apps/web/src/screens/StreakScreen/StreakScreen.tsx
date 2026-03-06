import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import StreakCard from '@/components/StreakCard/StreakCard';
import AchievementsList from '@/components/AchievementsList/AchievementsList';
import { profileApi, type ProfileData } from '@/api/profile';
import toast from 'react-hot-toast';

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

  return (
    <Screen className="streak-screen">
      <div className="p-4 w-full max-w-4xl mx-auto space-y-6">
        <ScreenHeader
          icon="🔥"
          title="Ударный режим"
          description="Ваша серия тренировочных дней и коллекция достижений — не пропускайте занятия, чтобы разблокировать новые"
        />

        {/* Streak Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <StreakCard
            currentStreak={profileData.stats.streak}
            longestStreak={profileData.stats.longestStreak}
            onClick={() => navigate('/profile')}
          />
        </motion.div>

        {/* Info block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--color_bg_card)] rounded-xl p-4 border border-[var(--color_border)]"
        >
          <div className="flex items-start gap-3">
            <div className="text-2xl">💡</div>
            <div>
              <h3 className="font-semibold text-white text-sm mb-1">
                Как работает ударный режим?
              </h3>
              <p className="text-xs text-[var(--color_text_muted)]">
                Тренируйтесь каждый день, чтобы продолжить серию. Достигайте новых
                рекордов и зарабатывайте достижения за 3, 7, 14, 30 и более дней подряд!
              </p>
            </div>
          </div>
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AchievementsList />
        </motion.div>
      </div>
    </Screen>
  );
}
