import { motion } from 'framer-motion';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';

export default function TrainerCalendarScreen() {
  return (
    <Screen>
      <div className="p-4 w-full max-w-2xl mx-auto">
        <ScreenHeader icon="📅" title="Календарь тренера" description="Расписание тренировок" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--color_bg_card)] rounded-2xl p-8 border border-[var(--color_border)] text-center"
        >
          <div className="text-4xl mb-4">🚧</div>
          <p className="text-[var(--color_text_muted)] text-sm">
            Раздел в разработке
          </p>
        </motion.div>
      </div>
    </Screen>
  );
}
