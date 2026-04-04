import { CalendarIcon, ChartBarIcon, ChartPieIcon, FireIcon, ClockIcon } from '@heroicons/react/24/outline';
import StatCard from './StatCard';
import InfoRow from './InfoRow';
import { formatVolume, formatVolumeCompact } from '@/constants/AnalyticsConstants';
import type { MonthlyStatsData } from './useActivityData';

interface MonthlyStatsProps {
  stats: MonthlyStatsData;
}

export default function MonthlyStats({ stats }: MonthlyStatsProps) {
  return (
    <div className="glass p-5 rounded-xl mb-6">
      <h2 className="text-lg font-bold text-white mb-4">Статистика месяца</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          value={stats.workouts}
          label="Тренировок"
          color="emerald"
          icon={<CalendarIcon className="w-6 h-6" />}
          detail={`Активных дней: ${stats.activeDays}`}
        />
        <StatCard
          value={stats.activeDays}
          label="Активных дней"
          color="teal"
          icon={<ChartBarIcon className="w-6 h-6" />}
          detail={`${Math.round((stats.activeDays / 30) * 100)}% месяца`}
        />
        <StatCard
          value={formatVolumeCompact(stats.totalVolume)}
          label="Общий объем"
          color="yellow"
          icon={<ChartPieIcon className="w-6 h-6" />}
          title={`${stats.totalVolume.toLocaleString()} кг`}
          detail={`Средний объем: ${formatVolume(stats.avgVolume)}`}
        />
        <StatCard
          value={stats.streak}
          label="Текущая серия"
          color="orange"
          icon={<FireIcon className="w-6 h-6" />}
          unit="дн"
          detail={`Лучшая серия: ${stats.streak} дн`}
        />
      </div>

      <div className="mt-4 pt-4 border-t border-(--color_border) flex gap-3">
        <InfoRow
          icon={<FireIcon className="w-4 h-4 text-rose-400/80 shrink-0" />}
          value={`~${stats.totalCalories.toLocaleString()} ккал`}
          label="сожжено"
        />
        <InfoRow
          icon={<ClockIcon className="w-4 h-4 text-sky-400/80 shrink-0" />}
          value={`${stats.avgDuration} мин`}
          label="ср. тренировка"
        />
      </div>
    </div>
  );
}
