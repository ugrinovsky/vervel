import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LockClosedIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';
import { streakApi, type AchievementsData } from '@/api/streak';
import toast from 'react-hot-toast';

type AchievementItem = AchievementsData['unlocked'][number] | (AchievementsData['locked'][number] & { locked: true });

const CATEGORY_META: Record<string, { label: string; emoji: string }> = {
  streak: { label: 'Серии тренировок', emoji: '🔥' },
  workout: { label: 'Всего тренировок', emoji: '💪' },
  usage: { label: 'Использование функций', emoji: '🤖' },
  social: { label: 'Общение и команда', emoji: '👥' },
};

export default function AchievementsList() {
  const [data, setData] = useState<AchievementsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      setLoading(true);
      const response = await streakApi.getAchievements();
      if (response.data.success) {
        setData(response.data.data);

        const unseenIds = response.data.data.unlocked
          .filter((a) => !a.isSeen)
          .map((a) => a.id);

        if (unseenIds.length > 0) {
          await streakApi.markAchievementsSeen(unseenIds);
        }
      }
    } catch {
      toast.error('Не удалось загрузить достижения');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="bg-(--color_bg_card) rounded-2xl p-6 border border-(--color_border) flex justify-center">
        <div className="w-6 h-6 border-2 border-white/20 border-t-(--color_primary_light) rounded-full animate-spin" />
      </div>
    );
  }

  // Группируем все достижения по категории
  const allItems: AchievementItem[] = [
    ...data.unlocked,
    ...data.locked,
  ];

  const byCategory = allItems.reduce<Record<string, AchievementItem[]>>((acc, item) => {
    const cat = item.category ?? 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const categories = Object.keys(byCategory).sort();

  const getColorClass = (color: string, locked: boolean) => {
    if (locked) return 'bg-gray-500/20 border-gray-500/30';

    const colorMap: Record<string, string> = {
      orange: 'bg-orange-500/20 border-orange-500/30',
      emerald: 'bg-emerald-500/20 border-emerald-500/30',
      blue: 'bg-blue-500/20 border-blue-500/30',
      yellow: 'bg-yellow-500/20 border-yellow-500/30',
      purple: 'bg-purple-500/20 border-purple-500/30',
      pink: 'bg-pink-500/20 border-pink-500/30',
      gold: 'bg-yellow-600/20 border-yellow-600/30',
      cyan: 'bg-cyan-500/20 border-cyan-500/30',
      indigo: 'bg-indigo-500/20 border-indigo-500/30',
      green: 'bg-green-500/20 border-green-500/30',
    };

    return colorMap[color] || 'bg-gray-500/20 border-gray-500/30';
  };

  return (
    <div className="bg-(--color_bg_card) rounded-2xl p-6 border border-(--color_border)">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Достижения</h2>
          <p className="text-xs text-[var(--color_text_muted)] mt-1">
            {data.totalUnlocked} из {data.totalAchievements} получено
          </p>
        </div>

        {/* Progress */}
        <div className="text-right">
          <div className="text-2xl font-bold text-white">
            {Math.round((data.totalUnlocked / data.totalAchievements) * 100)}%
          </div>
          <div className="w-24 h-2 bg-[var(--color_bg_input)] rounded-full overflow-hidden mt-1">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${(data.totalUnlocked / data.totalAchievements) * 100}%`,
              }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-[var(--color_primary)] to-[var(--color_primary_light)]"
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-6">
        <AnimatePresence>
          {categories.map((cat, catIdx) => {
            const items = byCategory[cat];
            const meta = CATEGORY_META[cat] ?? { label: cat, emoji: '🏅' };
            const unlockedCount = items.filter((i) => !('locked' in i && i.locked)).length;

            return (
              <motion.div
                key={cat}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: catIdx * 0.05 }}
              >
                {/* Category header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">{meta.emoji}</span>
                  <span className="text-sm font-semibold text-white">{meta.label}</span>
                  <span className="text-xs text-[var(--color_text_muted)] ml-auto">
                    {unlockedCount}/{items.length}
                  </span>
                </div>

                {/* Achievement cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {items.map((achievement) => {
                    const isLocked = 'locked' in achievement && !!achievement.locked;

                    return (
                      <div
                        key={achievement.id}
                        className={`rounded-xl p-4 border ${getColorClass(achievement.color, isLocked)} ${
                          isLocked ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className="text-3xl shrink-0 relative">
                            {achievement.icon}
                            {isLocked && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                                <LockClosedIcon className="w-5 h-5 text-white" />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-semibold text-white text-sm">
                                {achievement.title}
                              </h3>
                              {!isLocked && (
                                <CheckBadgeIcon className="w-5 h-5 text-green-400 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-[var(--color_text_muted)] mt-1">
                              {achievement.description}
                            </p>
                            {'unlockedAt' in achievement && achievement.unlockedAt && (
                              <p className="text-xs text-[var(--color_text_muted)] mt-2">
                                Получено:{' '}
                                {new Date(achievement.unlockedAt).toLocaleDateString('ru-RU')}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
