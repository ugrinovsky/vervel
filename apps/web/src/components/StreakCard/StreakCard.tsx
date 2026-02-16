import { motion } from 'framer-motion';

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
  onClick?: () => void;
}

export default function StreakCard({
  currentStreak,
  longestStreak,
  onClick,
}: StreakCardProps) {
  const isRecord = currentStreak === longestStreak && currentStreak > 0;

  const getMotivationalMessage = () => {
    if (currentStreak === 0) return 'Начните новую серию сегодня!';
    if (currentStreak >= 1 && currentStreak < 3) return 'Продолжайте в том же духе!';
    if (currentStreak >= 3 && currentStreak < 7)
      return 'Отличное начало! Не останавливайтесь!';
    if (currentStreak >= 7 && currentStreak < 14) return 'Невероятно! Вы в огне!';
    if (currentStreak >= 14 && currentStreak < 30) return 'Потрясающая дисциплина!';
    return 'Вы — легенда!';
  };

  const getDayWord = (num: number) => {
    if (num === 1) return 'день';
    if (num >= 2 && num <= 4) return 'дня';
    return 'дней';
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full bg-[var(--color_bg_card)] rounded-2xl p-6 border border-[var(--color_border)] text-left relative overflow-hidden"
    >
      {/* Animated background */}
      <div className="absolute inset-0 opacity-5">
        <motion.div
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            background:
              'linear-gradient(90deg, var(--color_primary), var(--color_primary_light), var(--color_primary))',
            backgroundSize: '200% 100%',
          }}
          className="w-full h-full"
        />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <span className="text-sm font-medium text-white">Ударный режим</span>
          </div>
        </div>

        {/* Main streak number */}
        <div className="flex items-end gap-3 mb-2">
          <motion.div
            key={currentStreak}
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-5xl font-black text-white"
          >
            {currentStreak}
          </motion.div>
          <div className="text-lg text-[var(--color_primary_light)] pb-2">
            {getDayWord(currentStreak)}
          </div>
        </div>

        {/* Record indicator */}
        {isRecord && currentStreak > 3 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-[var(--color_primary_light)] text-sm font-medium mb-2"
          >
            <span>⚡</span>
            <span>Это ваш рекорд!</span>
          </motion.div>
        )}

        {/* Longest streak */}
        {longestStreak > 0 && (
          <div className="text-xs text-[var(--color_text_muted)]">
            Лучшая серия: {longestStreak} {getDayWord(longestStreak)}
          </div>
        )}

        {/* Motivational message */}
        <div className="mt-4 pt-4 border-t border-[var(--color_border)] text-xs text-[var(--color_text_muted)]">
          {getMotivationalMessage()}
        </div>
      </div>
    </motion.button>
  );
}
