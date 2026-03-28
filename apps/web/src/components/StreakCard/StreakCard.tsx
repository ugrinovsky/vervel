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
      {/* Subtle background tint */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          background: isIntensive
            ? 'linear-gradient(135deg, #a855f7, #ec4899)'
            : 'linear-gradient(135deg, var(--color_primary), var(--color_primary_light))',
        }}
      />

      <div className="relative z-10">
        {/* Header: режим слева, число недель справа */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{isIntensive ? '⚡' : '🔥'}</span>
              <span className="text-sm font-medium text-(--color_text_primary)">
                {isIntensive ? 'Усиленный режим' : 'Обычный режим'}
              </span>
            </div>
            <div className="text-xs text-(--color_text_muted) mt-1">{getMotivationalMessage()}</div>
            {longestStreak > currentStreak && (
              <div className="text-xs text-(--color_text_muted) mt-0.5">
                Рекорд: {longestStreak} {getWeekWord(longestStreak)}
              </div>
            )}
            {isRecord && currentStreak > 1 && (
              <div className="text-xs text-(--color_primary_icon) mt-0.5 font-medium">⚡ Это ваш рекорд!</div>
            )}
          </div>

          <div className="text-right">
            <motion.div
              key={currentStreak}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-5xl font-black text-(--color_text_primary) leading-none"
            >
              {currentStreak}
            </motion.div>
            <div className="text-sm text-(--color_text_muted) mt-0.5">
              {getWeekWord(currentStreak)}
            </div>
          </div>
        </div>

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

      </div>
    </motion.button>
  );
}
