import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import BackButton from '@/components/BackButton/BackButton';
import AnimatedBlock from '@/components/ui/AnimatedBlock';
import { cardClass } from '@/components/ui/Card';
import { athleteApi, type StrengthLogEntry } from '@/api/athlete';
import { epley1RM } from '@/utils/epley';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function best1RM(sets: { reps?: number; weight?: number }[]): number | null {
  let best = 0;
  for (const s of sets) {
    if (s.weight && s.reps) {
      const rm = epley1RM(s.weight, s.reps);
      if (rm > best) best = rm;
    }
  }
  return best > 0 ? Math.round(best * 10) / 10 : null;
}

function ExerciseCard({ entry }: { entry: StrengthLogEntry }) {
  const sessions = [...entry.sessions].reverse(); // oldest → newest
  const maxSets = Math.max(...sessions.map((s) => s.sets.length), 0);

  return (
    <AnimatedBlock className={`${cardClass} rounded-2xl overflow-hidden`}>
      <div className="px-4 pt-3 pb-2 border-b border-(--color_border)">
        <div className="text-sm font-bold text-white">{entry.exerciseName}</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-max">
          <thead>
            <tr className="border-b border-(--color_border)">
              <td className="px-3 py-2 text-(--color_text_muted) font-medium w-14">Подход</td>
              {sessions.map((s) => (
                <td
                  key={s.workoutId}
                  className="px-3 py-2 text-(--color_text_muted) font-medium text-center whitespace-nowrap"
                >
                  {formatDate(s.date)}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxSets }).map((_, setIdx) => (
              <tr key={setIdx} className="border-b border-(--color_border)/50 last:border-0">
                <td className="px-3 py-2 text-(--color_text_muted) font-medium">{setIdx + 1}</td>
                {sessions.map((s) => {
                  const set = s.sets[setIdx];
                  return (
                    <td key={s.workoutId} className="px-3 py-2 text-center">
                      {set?.weight && set?.reps ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-white font-semibold">{set.weight} кг</span>
                          <span className="text-(--color_text_muted)">{set.reps} повт</span>
                        </div>
                      ) : (
                        <span className="text-(--color_border)">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {/* 1RM row */}
            <tr className="bg-(--color_bg_card_hover)/30">
              <td className="px-3 py-2 text-(--color_text_muted) font-medium">1RM</td>
              {sessions.map((s) => {
                const rm = best1RM(s.sets);
                return (
                  <td key={s.workoutId} className="px-3 py-2 text-center">
                    {rm !== null ? (
                      <span className="text-(--color_primary_light) font-bold">{rm}</span>
                    ) : (
                      <span className="text-(--color_border)">—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Notes for latest session */}
      {sessions[sessions.length - 1]?.notes && (
        <div className="px-4 py-2 text-xs text-(--color_text_muted) border-t border-(--color_border)">
          {sessions[sessions.length - 1].notes}
        </div>
      )}
    </AnimatedBlock>
  );
}

export default function StrengthLogScreen() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<StrengthLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    athleteApi
      .getStrengthLog()
      .then((res) => {
        if (res.data.success) setEntries(res.data.data);
      })
      .catch(() => toast.error('Ошибка загрузки'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = search.trim()
    ? entries.filter((e) =>
        e.exerciseName.toLowerCase().includes(search.trim().toLowerCase())
      )
    : entries;

  return (
    <Screen loading={loading} className="strength-log-screen">
      <div className="p-4 w-full max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between mb-2">
          <BackButton onClick={() => navigate(-1)} />
        </div>

        <ScreenHeader
          icon="📒"
          title="Силовой журнал"
          description="История подходов по каждому упражнению — последние 6 сессий"
        />

        {entries.length > 4 && (
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск упражнения..."
            className="w-full px-4 py-2.5 rounded-xl bg-(--color_bg_card) border border-(--color_border) text-sm text-white placeholder-text-(--color_text_muted) outline-none focus:border-(--color_primary_light)/50"
          />
        )}

        {filtered.length === 0 && !loading && (
          <div className="text-center py-16 text-(--color_text_muted) text-sm">
            {search ? 'Упражнение не найдено' : 'Нет данных о силовых тренировках'}
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((entry, i) => (
            <AnimatedBlock key={entry.exerciseId} delay={i * 0.03}>
              <ExerciseCard entry={entry} />
            </AnimatedBlock>
          ))}
        </div>
      </div>
    </Screen>
  );
}
