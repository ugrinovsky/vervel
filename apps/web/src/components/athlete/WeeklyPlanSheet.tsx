import { motion } from 'framer-motion';
import type { CopilotWeekItem } from '@/api/workouts';

const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const WORKOUT_TYPE_LABEL: Record<string, string> = {
  bodybuilding: 'Силовая',
  cardio: 'Кардио',
  crossfit: 'CrossFit',
};

function DayCell({ item, isToday }: { item: CopilotWeekItem; isToday: boolean }) {
  const date = new Date(item.date);
  // getDay() returns 0=Sun, so convert to Mon-based index
  const dow = (date.getDay() + 6) % 7;
  const dayLabel = WEEKDAY_SHORT[dow] ?? '';
  const dayNum = date.getDate();

  const isTrain = item.kind === 'train';
  const isTrainer = item.source === 'trainer';

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex-1 min-w-0 flex flex-col items-center gap-1 py-2 px-1 rounded-xl transition-colors ${
        isToday
          ? 'bg-(--color_primary_light)/20 border border-(--color_primary_light)/40'
          : 'bg-white/5'
      }`}
    >
      <div
        className={`text-xs font-medium ${isToday ? 'text-white/80' : 'text-(--color_text_muted)'}`}
      >
        {dayLabel}
      </div>
      <div className={`text-sm font-bold ${isToday ? 'text-white' : 'text-white/70'}`}>
        {dayNum}
      </div>

      {isTrain ? (
        <div className="flex flex-col items-center gap-0.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${isTrainer ? 'bg-(--color_primary_light)' : 'bg-white/50'}`}
          />
          {item.workoutType && (
            <div className="text-[10px] text-(--color_text_muted) text-center leading-tight">
              {WORKOUT_TYPE_LABEL[item.workoutType] ?? item.workoutType}
            </div>
          )}
          {isTrainer && (
            <div className="text-[9px] text-(--color_primary_light) leading-tight">тренер</div>
          )}
        </div>
      ) : item.kind === 'rest' ? (
        <div className="text-[10px] text-white/20">—</div>
      ) : null}
    </motion.div>
  );
}

interface Props {
  items: CopilotWeekItem[];
}

export default function WeeklyPlanSheet({ items }: Props) {
  if (items.length === 0) return null;

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-2">
      <div className="text-xs text-(--color_text_muted) font-semibold uppercase tracking-wider">
        Неделя
      </div>
      <div className="flex gap-1">
        {items.map((item) => (
          <DayCell key={item.date} item={item} isToday={item.date === todayStr} />
        ))}
      </div>
      <div className="flex items-center gap-3 text-[10px] text-(--color_text_muted)">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-(--color_primary_light) inline-block" />
          от тренера
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white/50 inline-block" />
          своя тренировка
        </span>
      </div>
    </div>
  );
}
