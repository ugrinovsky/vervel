import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

interface AchievementNotificationProps {
  achievements: Array<{
    id: number;
    key: string;
    title: string;
    icon: string;
  }>;
  onClose: () => void;
}

export default function AchievementNotification({
  achievements,
  onClose,
}: AchievementNotificationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  if (achievements.length === 0) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.8 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
        >
          <div className="bg-gradient-to-br from-yellow-500/30 to-orange-500/30 backdrop-blur-xl rounded-2xl p-4 border border-yellow-400/50 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🎉</span>
                  <h3 className="font-bold text-white">
                    {achievements.length === 1
                      ? 'Новое достижение!'
                      : `${achievements.length} новых достижения!`}
                  </h3>
                </div>

                <div className="space-y-2">
                  {achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="text-xl">{achievement.icon}</span>
                      <span className="text-white font-medium">
                        {achievement.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setVisible(false);
                  setTimeout(onClose, 300);
                }}
                className="text-white/70 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
