import { motion } from 'framer-motion';

const MILESTONES = [
  { weeks: 1,  emoji: '🥉', label: '1 нед' },
  { weeks: 4,  emoji: '🥈', label: '4 нед' },
  { weeks: 8,  emoji: '🥇', label: '8 нед' },
  { weeks: 16, emoji: '🏆', label: '16 нед' },
  { weeks: 52, emoji: '💎', label: '52 нед' },
];

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  mode: 'simple' | 'intensive';
  currentWeekWorkouts: number;
  weeklyRequired: number;
  onClick?: () => void;
}

export default function StreakCard({
  currentStreak,
  longestStreak,
  mode,
  currentWeekWorkouts,
  weeklyRequired,
  onClick,
}: StreakCardProps) {
  const isRecord = currentStreak === longestStreak && currentStreak > 0;
  const isIntensive = mode === 'intensive';

  const getMotivationalMessage = () => {
    if (currentStreak === 0) return 'Завершите неделю, чтобы начать серию!';
    if (currentStreak < 2) return 'Хорошее начало! Держитесь!';
    if (currentStreak < 4) return 'Отличный ритм! Продолжайте!';
    if (currentStreak < 8) return 'Невероятно! Вы в огне!';
    if (currentStreak < 16) return 'Потрясающая дисциплина!';
    return 'Вы — легенда!';
  };

  const getWeekWord = (num: number) => {
    if (num === 1) return 'неделя';
    if (num >= 2 && num <= 4) return 'недели';
    return 'недель';
  };

  const weekProgress = Math.min(currentWeekWorkouts, weeklyRequired);
  const progressPct = weeklyRequired > 0 ? (weekProgress / weeklyRequired) * 100 : 0;

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full bg-(--color_bg_card) rounded-2xl p-6 border border-(--color_border) text-left relative overflow-hidden"
    >
      {/* Animated background */}
      <div className="absolute inset-0 opacity-5">
        <motion.div
          animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          style={{
            background: isIntensive
              ? 'linear-gradient(90deg, #a855f7, #ec4899, #a855f7)'
              : 'linear-gradient(90deg, var(--color_primary), var(--color_primary_light), var(--color_primary))',
            backgroundSize: '200% 100%',
          }}
          className="w-full h-full"
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{isIntensive ? '⚡' : '🔥'}</span>
            <span className="text-sm font-medium text-(--color_text_primary)">
              {isIntensive ? 'Усиленный режим' : 'Обычный режим'}
            </span>
          </div>
          <span className="text-xs text-(--color_text_muted) bg-(--color_bg_card_hover) px-2 py-0.5 rounded-full">
            {weeklyRequired}/нед
          </span>
        </div>

        {/* Main streak number */}
        <div className="flex items-end gap-3 mb-2">
          <motion.div
            key={currentStreak}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-5xl font-black text-(--color_text_primary)"
          >
            {currentStreak}
          </motion.div>
          <div className="text-lg text-(--color_primary_icon) pb-2">
            {getWeekWord(currentStreak)}
          </div>
        </div>

        {/* Record indicator */}
        {isRecord && currentStreak > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-(--color_primary_icon) text-sm font-medium mb-2"
          >
            <span>⚡</span>
            <span>Это ваш рекорд!</span>
          </motion.div>
        )}

        {/* Longest streak — показываем только когда текущая серия хуже рекорда */}
        {longestStreak > currentStreak && (
          <div className="text-xs text-(--color_text_muted)">
            Лучшая серия: {longestStreak} {getWeekWord(longestStreak)}
          </div>
        )}

        {/* Current week progress */}
        <div className="mt-4 pt-4 border-t border-(--color_border)">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-(--color_text_muted)">Эта неделя</span>
            <span className="text-xs font-medium text-(--color_text_secondary)">
              {weekProgress}/{weeklyRequired}
            </span>
          </div>
          <div className="h-1.5 bg-(--color_bg_card_hover) rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                progressPct >= 100
                  ? 'bg-emerald-500'
                  : isIntensive
                    ? 'bg-purple-500'
                    : 'bg-(--color_primary)'
              }`}
            />
          </div>
        </div>

        {/* Milestones */}
        <div className="mt-4 flex items-center gap-1.5 flex-wrap">
          {MILESTONES.map((m, i) => {
            const active = currentStreak >= m.weeks;
            const lost = !active && longestStreak >= m.weeks;
            return (
              <div key={m.weeks} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span className={`text-xs ${active ? 'text-emerald-500/60' : 'text-(--color_text_muted) opacity-40'}`}>›</span>
                )}
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                    active
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : lost
                        ? 'bg-white/5 border-white/10 text-(--color_text_muted) opacity-50'
                        : 'bg-white/5 border-white/10 text-(--color_text_muted)'
                  }`}
                >
                  <span className={lost ? 'grayscale' : ''}>{m.emoji}</span>
                  <span className={lost ? 'line-through' : ''}>{m.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Motivational message */}
        <div className="mt-3 text-xs text-(--color_text_muted)">
          {getMotivationalMessage()}
        </div>
      </div>
    </motion.button>
  );
}
