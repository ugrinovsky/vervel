import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenLinks from '@/components/ScreenLinks/ScreenLinks';
import ScreenHint from '@/components/ScreenHint/ScreenHint';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import { trainerApi, type TodayOverview, type UnreadCounts } from '@/api/trainer';
import { useAuth } from '@/contexts/AuthContext';
import { getCurrentHour } from '@/utils/date';

function getGreeting(fullName: string | null | undefined) {
  const hour = getCurrentHour();
  const firstName = fullName?.trim().split(' ')[0] ?? null;
  const base = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
  return firstName ? `${base}, ${firstName}` : base;
}

function getTrainerSubtitle(todayCount: number) {
  if (todayCount === 0) return 'Тренировок сегодня нет — можно выдохнуть.';
  if (todayCount === 1) return '1 тренировка запланирована на сегодня.';
  return `${todayCount} тренировки запланированы на сегодня.`;
}
import {
  ClockIcon,
  UserGroupIcon,
  UsersIcon,
  ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/outline';
import { WORKOUT_TYPE_CONFIG } from '@/constants/AnalyticsConstants';

export default function TrainerTodayScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Screen loading={loading} className="trainer-today-screen">
      <div className="p-4 w-full mx-auto">
        <ScreenHeader
          icon="☀️"
          title="Сегодня"
          description="Что происходит сегодня — запланированные тренировки, непрочитанные сообщения и активность атлетов"
        />

        {/* Greeting block */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full rounded-2xl p-4 mb-4 border border-(--color_primary_light)/30 bg-(--color_primary_light)/10"
        >
          <div className="flex items-center gap-3">
            <div className="text-2xl">
              {getCurrentHour() < 12 ? '☀️' : getCurrentHour() < 18 ? '🌤️' : '🌙'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-bold text-white">{getGreeting(user?.fullName)}</div>
              <div className="text-xs text-(--color_text_secondary) mt-0.5 min-h-[1rem]">
                {overview ? getTrainerSubtitle(overview.stats.todayWorkoutsCount) : ''}
              </div>
            </div>
          </div>
        </motion.div>

        <ScreenHint className="mb-4">
          Дашборд тренера на текущий день. Красные бейджи — непрочитанные сообщения от атлетов и групп.{' '}
          <span className="text-white font-medium">Тренировки на сегодня</span> — все запланированные
          занятия; нажмите, чтобы перейти в Календарь.
        </ScreenHint>

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
                      {groupsWithUnread.length} {groupsWithUnread.length === 1 ? 'группа' : 'групп'}{' '}
                      с непрочитанными
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
                      {athletesWithUnread.length}{' '}
                      {athletesWithUnread.length === 1 ? 'атлет' : 'атлетов'} с непрочитанными
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

        {overview && <>
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border) text-center">
            <ClockIcon className="w-6 h-6 text-(--color_primary_icon) mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{overview.stats.todayWorkoutsCount}</div>
            <div className="text-xs text-(--color_text_muted) mt-1">Тренировок</div>
          </div>
          <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border) text-center">
            <UsersIcon className="w-6 h-6 text-(--color_primary_icon) mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{overview.stats.athleteCount}</div>
            <div className="text-xs text-(--color_text_muted) mt-1">Атлетов</div>
          </div>
          <div className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border) text-center">
            <UserGroupIcon className="w-6 h-6 text-(--color_primary_icon) mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{overview.stats.groupCount}</div>
            <div className="text-xs text-(--color_text_muted) mt-1">Групп</div>
          </div>
        </motion.div>

        {/* Today's Workouts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border) mb-6"
        >
          <h2 className="text-lg font-semibold text-white mb-4">Тренировки на сегодня</h2>

          {overview.todayWorkouts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-sm text-(--color_text_muted)">
                Сегодня нет запланированных тренировок
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {overview.todayWorkouts.map((workout) => (
                <button
                  key={workout.id}
                  onClick={() => navigate('/trainer/calendar')}
                  className="w-full text-left p-4 rounded-xl bg-(--color_bg_card_hover) border border-(--color_border) hover:border-(--color_primary_light)/40 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="w-4 h-4 text-(--color_primary_icon)" />
                      <span className="text-sm font-medium text-white">
                        {formatTime(workout.scheduledDate)}
                      </span>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-(--color_primary_light) text-white">
                      {WORKOUT_TYPE_CONFIG[workout.workoutData.type] ?? workout.workoutData.type}
                    </span>
                  </div>

                  <div className="mb-2">
                    <div className="text-xs text-(--color_text_muted) mb-1">Назначено для:</div>
                    <div className="flex flex-wrap gap-1">
                      {workout.assignedTo.map((assigned) => (
                        <span
                          key={assigned.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(
                              assigned.type === 'group'
                                ? `/trainer/groups/${assigned.id}`
                                : `/trainer/athletes/${assigned.id}`
                            );
                          }}
                          className="text-xs px-2 py-1 rounded-lg bg-(--color_bg_card) text-white hover:bg-(--color_primary_light)/20 transition-colors cursor-pointer"
                        >
                          {assigned.type === 'group' ? '👥' : '🏃'} {assigned.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {workout.workoutData.exercises && workout.workoutData.exercises.length > 0 && (
                    <div>
                      <div className="text-xs text-(--color_text_muted) mb-1">Упражнения:</div>
                      <div className="text-xs text-white">
                        {workout.workoutData.exercises.map((ex) => ex.name).join(', ')}
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </motion.div>
        </>}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ScreenLinks
            links={[
              { emoji: '📅', bg: 'bg-emerald-500/20', label: 'Календарь', sub: 'Назначить тренировки', to: '/trainer/calendar' },
              { emoji: '👥', bg: 'bg-blue-500/20',    label: 'Группы',    sub: 'Управление группами',  to: '/trainer/groups' },
              { emoji: '🏃', bg: 'bg-violet-500/20',  label: 'Атлеты',    sub: 'Управление атлетами',  to: '/trainer/athletes' },
              { emoji: '📋', bg: 'bg-amber-500/20',   label: 'Шаблоны',   sub: 'Готовые тренировки',   to: '/trainer/templates' },
            ]}
          />
        </motion.div>
      </div>
    </Screen>
  );
}
