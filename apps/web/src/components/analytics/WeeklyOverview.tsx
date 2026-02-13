import { WorkoutStats } from '@/types/Analytics';
import { useMemo } from 'react';

interface WeeklyOverviewProps {
  period: 'week' | 'month' | 'year';
  data: WorkoutStats;
}

interface DayData {
  label: string;
  load: number;
  type: string;
}

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function WeeklyOverview({ period, data }: WeeklyOverviewProps) {
  const timeline: any[] = data?.timeline || [];

  const weekData: DayData[] = useMemo(() => {
    if (!timeline.length) {
      if (period === 'week') {
        return WEEK_DAYS.map((d) => ({ label: d, load: 0, type: '' }));
      }
      return [];
    }

    switch (period) {
      case 'week': {
        const last7 = timeline.slice(-7);
        const days: DayData[] = WEEK_DAYS.map((label, idx) => {
          const entry = last7[idx];
          if (!entry) return { label, load: 0, type: '' };
          return {
            label,
            load: Math.round((entry.intensity || 0) * 100),
            type: entry.type || '',
          };
        });
        return days;
      }

      case 'month': {
        const monthMap: Record<number, DayData> = {};
        timeline.forEach((t) => {
          const d = new Date(t.date).getDate();
          monthMap[d] = {
            label: `${d}`,
            load: Math.round((t.intensity || 0) * 100),
            type: t.type || '',
          };
        });
        const maxDay = Math.max(...timeline.map((t) => new Date(t.date).getDate()));
        const days: DayData[] = [];
        for (let d = 1; d <= maxDay; d++) {
          days.push(monthMap[d] || { label: `${d}`, load: 0, type: '' });
        }
        return days;
      }

      case 'year': {
        const monthMap: Record<number, DayData> = {};
        timeline.forEach((t) => {
          const m = new Date(t.date).getMonth();
          monthMap[m] = {
            label: [
              'Янв',
              'Фев',
              'Мар',
              'Апр',
              'Май',
              'Июн',
              'Июл',
              'Авг',
              'Сен',
              'Окт',
              'Ноя',
              'Дек',
            ][m],
            load: Math.round((t.intensity || 0) * 100),
            type: t.type || '',
          };
        });
        const days: DayData[] = [];
        for (let m = 0; m <= 11; m++) {
          days.push(
            monthMap[m] || {
              label: [
                'Янв',
                'Фев',
                'Мар',
                'Апр',
                'Май',
                'Июн',
                'Июл',
                'Авг',
                'Сен',
                'Окт',
                'Ноя',
                'Дек',
              ][m],
              load: 0,
              type: '',
            }
          );
        }
        return days;
      }

      default:
        return [];
    }
  }, [timeline, period]);

  return (
    <div className="space-y-3">
      {weekData.map((day) => (
        <div key={day.label} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 text-gray-300">{day.label}</div>
            {day.load > 0 ? (
              <>
                <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-yellow-500 rounded-full"
                    style={{ width: `${day.load}%` }}
                  />
                </div>
                <div className="text-sm text-gray-400">{day.type}</div>
              </>
            ) : (
              <div className="text-sm text-gray-500">{period === 'week' ? '—' : ''}</div>
            )}
          </div>
          <div className="font-bold text-white">{day.load > 0 ? `${day.load}%` : '—'}</div>
        </div>
      ))}
    </div>
  );
}
