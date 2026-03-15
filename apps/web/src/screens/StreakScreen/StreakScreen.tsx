import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import StreakCard from '@/components/StreakCard/StreakCard';
import AchievementsList from '@/components/AchievementsList/AchievementsList';
import { profileApi, type ProfileData } from '@/api/profile';
import toast from 'react-hot-toast';

const MILESTONE_TIPS = [
  { days: 3,  emoji: '🥉', label: '3 дня' },
  { days: 7,  emoji: '🥈', label: '7 дней' },
  { days: 14, emoji: '🥇', label: '14 дней' },
  { days: 30, emoji: '🏆', label: '30 дней' },
  { days: 90, emoji: '💎', label: '90 дней' },
];

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
  const nextMilestone = MILESTONE_TIPS.find((m) => m.days > current);
  const daysLeft = nextMilestone ? nextMilestone.days - current : 0;

  return (
    <Screen className="streak-screen">
      <div className="p-4 w-full max-w-4xl mx-auto space-y-4">
        <ScreenHeader
          icon="🔥"
          title="Ударный режим"
          description="Ваша серия тренировочных дней и коллекция достижений — не пропускайте занятия, чтобы разблокировать новые"
        />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <StreakCard
            currentStreak={current}
            longestStreak={profileData.stats.longestStreak}
            onClick={() => navigate('/profile')}
          />
        </motion.div>

        {/* Next milestone */}
        {nextMilestone && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border) flex items-center gap-3"
          >
            <span className="text-3xl">{nextMilestone.emoji}</span>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">
                До достижения «{nextMilestone.label}» — {daysLeft} {daysLeft === 1 ? 'день' : daysLeft < 5 ? 'дня' : 'дней'}
              </div>
              <div className="text-xs text-(--color_text_muted) mt-0.5">
                Тренируйтесь каждый день, чтобы не прерывать серию
              </div>
            </div>
            <button
              onClick={() => navigate('/workouts/new')}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-(--color_primary_light) text-white text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Тренировка
            </button>
          </motion.div>
        )}

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border)"
        >
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-semibold text-white text-sm mb-1">Как работает ударный режим?</h3>
              <p className="text-xs text-(--color_text_muted)">
                Залогируйте хотя бы одну тренировку в день — серия продолжается.
                Пропустите день — серия обнуляется. Каждый новый рекорд остаётся навсегда.
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {MILESTONE_TIPS.map((m) => (
              <div
                key={m.days}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                  current >= m.days
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-(--color_bg_card_hover) border-(--color_border) text-(--color_text_muted)'
                }`}
              >
                {m.emoji} {m.label}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="grid grid-cols-2 gap-3"
        >
          {[
            { emoji: '📅', bg: 'bg-blue-500/20',  label: 'Календарь', sub: 'История тренировок', to: '/calendar' },
            { emoji: '📊', bg: 'bg-violet-500/20', label: 'Аналитика', sub: 'Прогресс и нагрузки', to: '/analytics' },
          ].map(({ emoji, bg, label, sub, to }) => (
            <button
              key={to}
              onClick={() => navigate(to)}
              className="flex items-center gap-3 p-3 rounded-xl bg-(--color_bg_card) border border-(--color_border) hover:bg-(--color_bg_card_hover) transition-colors text-left"
            >
              <span className={`w-10 h-10 shrink-0 rounded-xl ${bg} flex items-center justify-center text-xl`}>{emoji}</span>
              <div>
                <div className="text-sm font-medium text-white">{label}</div>
                <div className="text-xs text-(--color_text_muted)">{sub}</div>
              </div>
            </button>
          ))}
        </motion.div>

        {/* Achievements */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <AchievementsList />
        </motion.div>
      </div>
    </Screen>
  );
}
