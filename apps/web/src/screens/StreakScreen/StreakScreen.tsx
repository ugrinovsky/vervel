import { useState, useEffect } from 'react';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import StreakCard from '@/components/StreakCard/StreakCard';
import AchievementsList from '@/components/AchievementsList/AchievementsList';
import ScreenLinks from '@/components/ScreenLinks/ScreenLinks';
import { profileApi, type ProfileData } from '@/api/profile';
import { streakApi } from '@/api/streak';
import ToggleGroup from '@/components/ui/ToggleGroup';
import AnimatedBlock from '@/components/ui/AnimatedBlock';
import toast from 'react-hot-toast';
import ScreenHint from '@/components/ScreenHint/ScreenHint';
import ShareResultCard from '@/components/ShareResultCard/ShareResultCard';
import { cardClass } from '@/components/ui/Card';

export default function StreakScreen() {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modeLoading, setModeLoading] = useState(false);

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await profileApi.getProfile();
      if (response.data.success) setProfileData(response.data.data);
    } catch {
      toast.error('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const handleSetMode = async (mode: 'simple' | 'intensive') => {
    if (!profileData || modeLoading || profileData.stats.streakMode === mode) return;
    try {
      setModeLoading(true);
      await streakApi.setMode(mode);
      setProfileData((prev) =>
        prev ? { ...prev, stats: { ...prev.stats, streakMode: mode, weeklyRequired: mode === 'intensive' ? 5 : 3 } } : prev
      );
      toast.success(mode === 'intensive' ? 'Усиленный режим включён' : 'Обычный режим включён');
    } catch {
      toast.error('Не удалось сменить режим');
    } finally {
      setModeLoading(false);
    }
  };

  if (!profileData) return <Screen loading={loading} className="streak-screen" />;

  const { stats } = profileData;
  const mode = stats.streakMode ?? 'simple';

  return (
    <Screen className="streak-screen">
      <div className="p-4 w-full max-w-4xl mx-auto space-y-6">
        <ScreenHeader
          icon={mode === 'intensive' ? '⚡' : '🔥'}
          title="Ударный режим"
          description="Тренируйтесь регулярно каждую неделю — счётчик растёт, пропустите неделю — сбросится"
        />

        {/* ── Режим ── */}
        <div className="space-y-2">
          <ToggleGroup
            cols={2}
            value={mode}
            onChange={(m) => handleSetMode(m as 'simple' | 'intensive')}
            options={[
              { value: 'simple',    label: <span className="flex items-center justify-center gap-1.5">🔥 Обычный <span className="opacity-60 text-xs">3/нед</span></span> },
              { value: 'intensive', label: <span className="flex items-center justify-center gap-1.5">⚡ Усиленный <span className="opacity-60 text-xs">5/нед</span></span> },
            ]}
          />
          <ScreenHint>
            {mode === 'simple' ? (
              <><span className="text-(--color_text_primary) font-medium">Обычный режим:</span>{' '}
              тренируйтесь <span className="text-(--color_text_primary) font-medium">3 раза в неделю</span>.
              Завершили неделю — счётчик растёт. Не успели — серия сбросится. Счётчик считает недели, а не дни.</>
            ) : (
              <><span className="text-(--color_text_primary) font-medium">Усиленный режим:</span>{' '}
              тренируйтесь <span className="text-(--color_text_primary) font-medium">5 раз в неделю</span>.
              Сложнее, но результат быстрее. Пропустите неделю — серия сбросится.</>
            )}
          </ScreenHint>
        </div>

        {/* ── Текущая неделя ── */}
        <AnimatedBlock delay={0.05}>
          <StreakCard
            currentStreak={stats.streak}
            longestStreak={stats.longestStreak}
            mode={mode}
            currentWeekWorkouts={stats.currentWeekWorkouts ?? 0}
            weeklyRequired={stats.weeklyRequired ?? 3}
          />
        </AnimatedBlock>

        {/* ── Прогресс: XP + статистика ── */}
        <AnimatedBlock delay={0.1} className={`${cardClass} rounded-2xl p-4 space-y-4`}>
          {/* XP / Level */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-semibold text-white">⭐ {stats.xp} XP · Lv {stats.level}</div>
                <div className="text-xs text-(--color_text_muted) mt-0.5">{stats.levelName}</div>
              </div>
              <div className="text-xs text-(--color_text_muted)">
                до Lv {stats.level + 1}: {stats.xpForNextLevel - stats.xp} XP
              </div>
            </div>
            <div className="h-2 rounded-full bg-white/8">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${stats.xpProgressPct}%`, backgroundColor: 'var(--color_primary_light)' }}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-(--color_border)" />

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: stats.totalWorkouts, label: 'Тренировок' },
              { value: stats.streak,        label: 'Недель подряд' },
              { value: stats.longestStreak, label: 'Рекорд' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold text-(--color_text_primary)">{value}</div>
                <div className="text-xs text-(--color_text_muted) mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </AnimatedBlock>

        {/* ── Достижения ── */}
        <AnimatedBlock delay={0.15}>
          <AchievementsList />
        </AnimatedBlock>

        {/* ── Действия ── */}
        <AnimatedBlock delay={0.2} className="space-y-3">
          <ShareResultCard profileData={profileData} />
          <ScreenLinks links={[
            { emoji: '💪', bg: 'bg-orange-500/20', label: 'Добавить тренировку', sub: 'Чтобы не прервать серию', to: '/workouts/new' },
            { emoji: '📅', bg: 'bg-blue-500/20',   label: 'Календарь',           sub: 'История тренировок',    to: '/calendar' },
            { emoji: '📊', bg: 'bg-violet-500/20', label: 'Аналитика',           sub: 'Прогресс и нагрузки',   to: '/analytics' },
          ]} />
        </AnimatedBlock>
      </div>
    </Screen>
  );
}
