import { useMemo } from 'react';
import { WorkoutStats } from '@/types/Analytics';
import { AnalyticsSheetIntro } from './AnalyticsSheetIntro';

interface Props {
  data: WorkoutStats;
  period: 'week' | 'month' | 'year';
}

const WEEK_DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const WEEK_DAYS_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

function isoToLocalDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Форматирует локальную Date в строку YYYY-MM-DD без UTC-сдвига */
function toLocalISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function StreakBlock({ data, period }: Props) {
  const timeline = data.timeline ?? [];

  const { currentStreak, bestStreak, favDayIdx, avgPerWeek, dotGrid, trainedSet } = useMemo(() => {
    if (!timeline.length) {
      return { currentStreak: 0, bestStreak: 0, favDayIdx: -1, avgPerWeek: 0, dotGrid: [], trainedSet: new Set<string>() };
    }

    // Build set of trained dates — only real workouts (intensity > 0 or volume > 0)
    const trainedSet = new Set<string>(
      timeline
        .filter((t) => (t.intensity ?? 0) > 0 || (t.volume ?? 0) > 0)
        .map((t) => t.date.slice(0, 10))
    );

    // Current streak: go backwards from most recent date in timeline
    const sortedDates = [...trainedSet].sort();
    let streak = 0;
    let best = 0;
    let cur = 0;
    let prevDate: Date | null = null;

    for (const iso of sortedDates) {
      const d = isoToLocalDate(iso);
      if (prevDate) {
        const diff = Math.round((d.getTime() - prevDate.getTime()) / 86400000);
        if (diff === 1) {
          cur++;
        } else {
          best = Math.max(best, cur);
          cur = 1;
        }
      } else {
        cur = 1;
      }
      prevDate = d;
    }
    best = Math.max(best, cur);
    streak = cur;

    // Favourite training day (ISO weekday: Mon=1...Sun=7, JS: 0=Sun)
    const dayCounts = [0, 0, 0, 0, 0, 0, 0]; // Mon...Sun
    for (const iso of sortedDates) {
      const jsDay = isoToLocalDate(iso).getDay(); // 0=Sun, 1=Mon...
      const idx = jsDay === 0 ? 6 : jsDay - 1; // convert to Mon=0..Sun=6
      dayCounts[idx]++;
    }
    const favDayIdx = dayCounts.indexOf(Math.max(...dayCounts));

    // Avg per week — computed from actual date range in trainedSet
    const dateRange =
      sortedDates.length >= 2
        ? Math.max(
            1,
            Math.round(
              (isoToLocalDate(sortedDates[sortedDates.length - 1]).getTime() -
                isoToLocalDate(sortedDates[0]).getTime()) /
                86400000
            ) + 1
          )
        : 7;
    const avgPerWeek = +((trainedSet.size / dateRange) * 7).toFixed(1);

    // Last 28 days dot grid (4 rows × 7 cols = Mon..Sun)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dotGrid: { date: string; trained: boolean; future: boolean }[][] = [];
    // Start from Monday 4 weeks ago
    const startDay = new Date(today);
    const dow = today.getDay(); // 0=Sun
    const daysBack = (dow === 0 ? 6 : dow - 1) + 21; // back to 4 weeks ago Monday
    startDay.setDate(startDay.getDate() - daysBack);

    for (let row = 0; row < 4; row++) {
      const week: { date: string; trained: boolean; future: boolean }[] = [];
      for (let col = 0; col < 7; col++) {
        const d = new Date(startDay);
        d.setDate(d.getDate() + row * 7 + col);
        const iso = toLocalISO(d); // локальная дата, без UTC-сдвига
        week.push({
          date: iso,
          trained: trainedSet.has(iso),
          future: d > today,
        });
      }
      dotGrid.push(week);
    }

    return { currentStreak: streak, bestStreak: best, favDayIdx, avgPerWeek, dotGrid, trainedSet };
  }, [timeline]);

  const totalDays = trainedSet.size;

  return (
    <div className="space-y-4">
      <AnalyticsSheetIntro>
        Календарь точек строится по последним 28 дням; серии и «в неделю» считаются по фактическим датам
        тренировок в загруженном периоде. Для полноценной сетки переключитесь на «Месяц».
      </AnalyticsSheetIntro>
      {/* Streak cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border) text-center">
          <div className="text-3xl font-bold text-orange-400">{currentStreak}</div>
          <div className="text-xs text-(--color_text_muted) mt-1">текущая серия</div>
          <div className="text-[11px] text-(--color_text_muted)/60 mt-0.5">дн. подряд</div>
        </div>
        <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border) text-center">
          <div className="text-3xl font-bold text-emerald-400">{bestStreak}</div>
          <div className="text-xs text-(--color_text_muted) mt-1">лучшая серия</div>
          <div className="text-[11px] text-(--color_text_muted)/60 mt-0.5">дн. подряд</div>
        </div>
        <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border) text-center">
          <div className="text-3xl font-bold text-emerald-400">{avgPerWeek}</div>
          <div className="text-xs text-(--color_text_muted) mt-1">в неделю</div>
          <div className="text-[11px] text-(--color_text_muted)/60 mt-0.5">тренировок</div>
        </div>
        <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border) text-center">
          <div className="text-3xl font-bold text-amber-400">{totalDays}</div>
          <div className="text-xs text-(--color_text_muted) mt-1">тренировок</div>
          <div className="text-[11px] text-(--color_text_muted)/60 mt-0.5">за период</div>
        </div>
      </div>

      {/* Favourite day */}
      {favDayIdx >= 0 && (
        <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="text-sm font-semibold text-white">{WEEK_DAYS_FULL[favDayIdx]}</p>
            <p className="text-xs text-(--color_text_muted)">любимый день для тренировок</p>
          </div>
        </div>
      )}

      {/* 28-day dot calendar */}
      {dotGrid.length > 0 && (
        <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border)">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-(--color_text_muted) uppercase tracking-wide">
              Последние 4 недели
            </p>
            {period === 'week' && (
              <span className="text-[11px] text-amber-400/80">переключитесь на Месяц</span>
            )}
          </div>
          {/* Header days */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEK_DAYS_SHORT.map((d) => (
              <div key={d} className="text-center text-[11px] text-(--color_text_muted)">
                {d}
              </div>
            ))}
          </div>
          {/* Dots */}
          <div className="space-y-1">
            {dotGrid.map((week, ri) => (
              <div key={ri} className="grid grid-cols-7 gap-1">
                {week.map((cell) => (
                  <div
                    key={cell.date}
                    title={cell.date}
                    className="aspect-square rounded-[4px] transition-all"
                    style={{
                      backgroundColor: cell.future
                        ? 'var(--color_bg_card)'
                        : cell.trained
                          ? 'var(--color_primary_light)'
                          : 'var(--color_bg_card_hover)',
                      opacity: cell.future ? 0.4 : 1,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-[3px]" style={{ backgroundColor: 'var(--color_primary_light)' }} />
              <span className="text-[11px] text-(--color_text_muted)">Тренировка</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-[3px] bg-white/6" />
              <span className="text-[11px] text-(--color_text_muted)">Отдых</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
