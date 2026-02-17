import { motion } from 'framer-motion';
import { UserGroupIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface GroupCardProps {
  id: number;
  name: string;
  athleteCount: number;
  lastMessage?: string | null;
  nextWorkout?: string | null;
  onClick?: () => void;
}

export default function GroupCard({
  name,
  athleteCount,
  lastMessage,
  nextWorkout,
  onClick,
}: GroupCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-[var(--color_bg_card)] rounded-2xl p-4 border border-[var(--color_border)] hover:bg-[var(--color_bg_card_hover)] transition-colors cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--color_primary_light)] flex items-center justify-center">
            <UserGroupIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-base font-semibold text-white">{name}</div>
            <div className="text-xs text-[var(--color_text_muted)]">{athleteCount} атлетов</div>
          </div>
        </div>
        <ChevronRightIcon className="w-5 h-5 text-[var(--color_text_muted)]" />
      </div>

      {lastMessage && (
        <div className="mb-2 px-3 py-2 rounded-lg bg-[var(--color_bg_input)]">
          <div className="text-xs text-[var(--color_text_muted)] mb-0.5">Последнее сообщение:</div>
          <div className="text-sm text-white truncate">{lastMessage}</div>
        </div>
      )}

      {nextWorkout && (
        <div className="px-3 py-2 rounded-lg bg-[var(--color_bg_input)]">
          <div className="text-xs text-[var(--color_text_muted)] mb-0.5">Следующая тренировка:</div>
          <div className="text-sm text-white">{nextWorkout}</div>
        </div>
      )}
    </motion.div>
  );
}
