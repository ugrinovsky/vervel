import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import { trainerApi, type TodayOverview, type UnreadCounts } from '@/api/trainer';
import { ClockIcon, UserGroupIcon, UsersIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';

export default function TrainerTodayScreen() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<TodayOverview | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const [overviewRes, unreadRes] = await Promise.all([
        trainerApi.getTodayOverview(),
        trainerApi.getUnreadCounts(),
      ]);
      setOverview(overviewRes.data.data);
      setUnreadCounts(unreadRes.data.data);
    } catch {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (!overview) return <Screen loading={loading} />;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Screen loading={loading}>
      <div className="p-4 w-full max-w-2xl mx-auto">
        <ScreenHeader icon="☀️" title="Сегодня" description="Обзор дня" />

        {/* Unread messages banners */}
        {unreadCounts && (
          <>
            {(() => {
              const groupsWithUnread = unreadCounts.groups.filter((g) => g.unread > 0);
              const groupsTotal = groupsWithUnread.reduce((s, g) => s + g.unread, 0);
              if (groupsTotal === 0) return null;
              return (
                <motion.button
                  key="groups-unread"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => navigate('/trainer/groups')}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-(--color_bg_card) border border-(--color_border) mb-3 hover:bg-(--color_bg_card_hover) transition-colors text-left"
                >
                  <ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-(--color_primary_icon) shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">Группы</div>
                    <div className="text-xs text-(--color_text_muted)">
                      {groupsWithUnread.length} {groupsWithUnread.length === 1 ? 'группа' : 'групп'} с непрочитанными
                    </div>
                  </div>
                  <div className="min-w-6 h-6 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {groupsTotal > 99 ? '99+' : groupsTotal}
                  </div>
                </motion.button>
              );
            })()}
            {(() => {
              const athletesWithUnread = unreadCounts.athletes.filter((a) => a.unread > 0);
              const athletesTotal = athletesWithUnread.reduce((s, a) => s + a.unread, 0);
              if (athletesTotal === 0) return null;
              return (
                <motion.button
                  key="athletes-unread"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  onClick={() => navigate('/trainer/athletes')}
                  className="w-full flex items-center gap-3 p-4 rounded-xl bg-(--color_bg_card) border border-(--color_border) mb-3 hover:bg-(--color_bg_card_hover) transition-colors text-left"
                >
                  <ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-(--color_primary_icon) shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">Персоналки</div>
                    <div className="text-xs text-(--color_text_muted)">
                      {athletesWithUnread.length} {athletesWithUnread.length === 1 ? 'атлет' : 'атлетов'} с непрочитанными
                    </div>
                  </div>
                  <div className="min-w-6 h-6 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {athletesTotal > 99 ? '99+' : athletesTotal}
                  </div>
                </motion.button>
              );
            })()}
          </>
        )}

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <div className="bg-[var(--color_bg_card)] rounded-xl p-4 border border-[var(--color_border)] text-center">
            <ClockIcon className="w-6 h-6 text-(--color_primary_icon) mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{overview.stats.todayWorkoutsCount}</div>
            <div className="text-xs text-[var(--color_text_muted)] mt-1">Тренировок</div>
          </div>
          <div className="bg-[var(--color_bg_card)] rounded-xl p-4 border border-[var(--color_border)] text-center">
            <UsersIcon className="w-6 h-6 text-(--color_primary_icon) mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{overview.stats.athleteCount}</div>
            <div className="text-xs text-[var(--color_text_muted)] mt-1">Атлетов</div>
          </div>
          <div className="bg-[var(--color_bg_card)] rounded-xl p-4 border border-[var(--color_border)] text-center">
            <UserGroupIcon className="w-6 h-6 text-(--color_primary_icon) mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{overview.stats.groupCount}</div>
            <div className="text-xs text-[var(--color_text_muted)] mt-1">Групп</div>
          </div>
        </motion.div>

        {/* Today's Workouts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--color_bg_card)] rounded-2xl p-5 border border-[var(--color_border)] mb-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Тренировки на сегодня</h2>

          {overview.todayWorkouts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-sm text-[var(--color_text_muted)]">
                Сегодня нет запланированных тренировок
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {overview.todayWorkouts.map((workout) => (
                <div
                  key={workout.id}
                  className="p-4 rounded-xl bg-[var(--color_bg_card_hover)] border border-[var(--color_border)]"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="w-4 h-4 text-(--color_primary_icon)" />
                      <span className="text-sm font-medium text-white">
                        {formatTime(workout.scheduledDate)}
                      </span>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-[var(--color_primary_light)] text-white">
                      {workout.workoutData.type}
                    </span>
                  </div>

                  <div className="mb-2">
                    <div className="text-xs text-[var(--color_text_muted)] mb-1">
                      Назначено для:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {workout.assignedTo.map((assigned, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 rounded-lg bg-[var(--color_bg_card)] text-white"
                        >
                          {assigned.type === 'group' ? '👥' : '🏃'} {assigned.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {workout.workoutData.exercises && workout.workoutData.exercises.length > 0 && (
                    <div>
                      <div className="text-xs text-[var(--color_text_muted)] mb-1">Упражнения:</div>
                      <div className="text-xs text-white">
                        {workout.workoutData.exercises.map((ex, idx) => ex.name).join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 gap-3"
        >
          <button
            onClick={() => navigate('/trainer/groups')}
            className="p-4 rounded-xl bg-[var(--color_bg_card)] border border-[var(--color_border)] hover:bg-[var(--color_bg_card_hover)] transition-colors text-left"
          >
            <UserGroupIcon className="w-5 h-5 text-(--color_primary_icon) mb-2" />
            <div className="text-sm font-medium text-white">Группы</div>
            <div className="text-xs text-[var(--color_text_muted)]">Управление группами</div>
          </button>
          <button
            onClick={() => navigate('/trainer/athletes')}
            className="p-4 rounded-xl bg-[var(--color_bg_card)] border border-[var(--color_border)] hover:bg-[var(--color_bg_card_hover)] transition-colors text-left"
          >
            <UsersIcon className="w-5 h-5 text-(--color_primary_icon) mb-2" />
            <div className="text-sm font-medium text-white">Атлеты</div>
            <div className="text-xs text-[var(--color_text_muted)]">Управление атлетами</div>
          </button>
        </motion.div>
      </div>
    </Screen>
  );
}
