import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import FullScreenChat from '@/components/FullScreenChat/FullScreenChat';
import AiChat from '@/components/AiChat/AiChat';
import { athleteApi, type AthleteGroup, type AthleteTrainer } from '@/api/athlete';
import {
  ChatBubbleLeftIcon,
  UserGroupIcon,
  UsersIcon,
  UserCircleIcon,
  CalendarDaysIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

type ActiveChat = { chatId: number; title: string } | null;

type UpcomingWorkout = {
  id: number;
  date: string;
  workoutType: string;
  exerciseCount: number;
  notes: string | null;
};

const WORKOUT_LABELS: Record<string, string> = {
  crossfit: 'CrossFit',
  bodybuilding: 'Бодибилдинг',
  cardio: 'Кардио',
};

const WORKOUT_COLORS: Record<string, string> = {
  crossfit: 'text-orange-400',
  bodybuilding: 'text-blue-400',
  cardio: 'text-green-400',
};

function formatWorkoutDate(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return 'Сегодня';
  if (d.getTime() === tomorrow.getTime()) return 'Завтра';
  return date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function AthleteMyTeamScreen() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<AthleteGroup[]>([]);
  const [trainers, setTrainers] = useState<AthleteTrainer[]>([]);
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<UpcomingWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<ActiveChat>(null);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [openingChatFor, setOpeningChatFor] = useState<number | null>(null);
  const [unreadMap, setUnreadMap] = useState<Map<number, number>>(new Map());

  const fetchUnread = useCallback(async () => {
    try {
      const res = await athleteApi.getUnreadCounts();
      const map = new Map(res.data.data.chats.map((c) => [c.chatId, c.unread]));
      setUnreadMap(map);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [groupsRes, trainersRes, upcomingRes] = await Promise.all([
          athleteApi.getMyGroups(),
          athleteApi.getMyTrainers(),
          athleteApi.getUpcomingWorkouts(),
        ]);
        setGroups(groupsRes.data.data);
        setTrainers(trainersRes.data.data);
        setUpcomingWorkouts(upcomingRes.data.data);
      } catch {
        toast.error('Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    };
    load();
    fetchUnread();
    const interval = setInterval(fetchUnread, 15_000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  const openGroupChat = async (group: AthleteGroup) => {
    if (group.chatId) {
      setActiveChat({ chatId: group.chatId, title: `Группа: ${group.name}` });
      setUnreadMap((prev) => {
        const m = new Map(prev);
        m.set(group.chatId!, 0);
        return m;
      });
      setTimeout(fetchUnread, 3000);
      return;
    }
    try {
      setOpeningChatFor(group.id);
      const res = await athleteApi.getGroupChat(group.id);
      setActiveChat({ chatId: res.data.data.chatId, title: `Группа: ${group.name}` });
    } catch {
      toast.error('Чат ещё не открыт тренером');
    } finally {
      setOpeningChatFor(null);
    }
  };

  const openTrainerChat = async (trainer: AthleteTrainer) => {
    const name = trainer.fullName || trainer.email;
    if (trainer.chatId) {
      setActiveChat({ chatId: trainer.chatId, title: `Тренер: ${name}` });
      setUnreadMap((prev) => {
        const m = new Map(prev);
        m.set(trainer.chatId!, 0);
        return m;
      });
      setTimeout(fetchUnread, 3000);
      return;
    }
    try {
      setOpeningChatFor(trainer.id);
      const res = await athleteApi.getTrainerChat(trainer.id);
      setActiveChat({ chatId: res.data.data.chatId, title: `Тренер: ${name}` });
    } catch {
      toast.error('Ошибка открытия чата');
    } finally {
      setOpeningChatFor(null);
    }
  };

  const isEmpty = groups.length === 0 && trainers.length === 0;

  return (
    <Screen loading={loading}>
      <FullScreenChat
        open={!!activeChat}
        chatId={activeChat?.chatId ?? null}
        title={activeChat?.title ?? ''}
        onClose={() => setActiveChat(null)}
      />
      <AiChat open={aiChatOpen} onClose={() => setAiChatOpen(false)} />

      <div className="p-4 w-full max-w-2xl mx-auto">
        <ScreenHeader icon="🤝" title="Моя команда" description="Тренеры и группы, с которыми вы работаете — покажите QR-код тренеру или введите код приглашения, чтобы присоединиться" />

        {/* AI Assistant card */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => setAiChatOpen(true)}
          className="w-full flex items-center gap-3 p-4 bg-(--color_bg_card) rounded-2xl border border-(--color_border) mb-4 hover:bg-(--color_bg_card_hover) transition-colors text-left"
        >
          <div className="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-500/20 shrink-0">
            <SparklesIcon className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">AI-помощник</span>
            </div>
            <p className="text-xs text-(--color_text_muted) mt-0.5">
              Вопросы про тренировки, питание, восстановление
            </p>
          </div>
          <span className="text-xs text-(--color_text_muted) shrink-0">6₽/сообщение</span>
        </motion.button>

        {isEmpty ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-(--color_bg_card) rounded-2xl p-10 border border-(--color_border) text-center"
          >
            <div className="text-4xl mb-3">🏋️</div>
            <p className="text-white font-medium mb-1">Пока нет тренера или группы</p>
            <p className="text-sm text-(--color_text_muted)">
              Попросите тренера добавить вас или вступите в группу по QR-коду из профиля
            </p>
          </motion.div>
        ) : (
          <>
            {/* Personal trainers */}
            {trainers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border) mb-4"
              >
                <div className="flex items-center gap-2 mb-4">
                  <UsersIcon className="w-5 h-5 text-(--color_primary_icon)" />
                  <h2 className="text-lg font-semibold text-white">Персональные тренеры</h2>
                </div>
                <div className="space-y-3">
                  {trainers.map((trainer) => {
                    const trainerUnread = trainer.chatId ? (unreadMap.get(trainer.chatId) ?? 0) : 0;
                    const initials = (trainer.fullName || trainer.email)[0].toUpperCase();
                    return (
                      <div
                        key={trainer.id}
                        className="p-4 rounded-xl bg-(--color_bg_card_hover) hover:bg-(--color_border) transition-colors"
                      >
                        {/* Top row: photo + name/specs */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-(--color_primary_light) to-(--color_primary) flex items-center justify-center text-base font-bold text-white shrink-0">
                            {trainer.photoUrl ? (
                              <img
                                src={trainer.photoUrl}
                                alt={trainer.fullName || 'trainer'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              initials
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-white">
                              {trainer.fullName || 'Без имени'}
                            </div>
                            <div className="text-xs text-(--color_text_muted) mb-1.5">
                              {trainer.email}
                            </div>
                            {trainer.specializations && trainer.specializations.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {trainer.specializations.map((s) => (
                                  <span
                                    key={s}
                                    className="px-2 py-0.5 rounded-full bg-(--color_primary_light)/15 text-(--color_primary_light) text-[10px] font-medium"
                                  >
                                    {s}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Bio snippet */}
                        {trainer.bio && (
                          <p className="text-xs text-(--color_text_muted) leading-relaxed mb-3 line-clamp-2">
                            {trainer.bio}
                          </p>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/trainer/profile/${trainer.id}`)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--color_bg_card) text-(--color_text_secondary) text-xs font-medium hover:text-white transition-colors"
                          >
                            <UserCircleIcon className="w-3.5 h-3.5" />
                            Профиль
                          </button>
                          <button
                            onClick={() => openTrainerChat(trainer)}
                            disabled={openingChatFor === trainer.id}
                            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--color_primary_light) text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                          >
                            {trainerUnread > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                                {trainerUnread > 99 ? '99+' : trainerUnread}
                              </span>
                            )}
                            <ChatBubbleLeftIcon className="w-3.5 h-3.5" />
                            Чат
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Groups */}
            {groups.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border)"
              >
                <div className="flex items-center gap-2 mb-4">
                  <UserGroupIcon className="w-5 h-5 text-(--color_primary_icon)" />
                  <h2 className="text-lg font-semibold text-white">Мои группы</h2>
                </div>
                <div className="space-y-2">
                  {groups.map((group) => {
                    const groupUnread = group.chatId ? (unreadMap.get(group.chatId) ?? 0) : 0;
                    return (
                      <div
                        key={group.id}
                        className="p-3 rounded-xl bg-(--color_bg_card_hover) hover:bg-(--color_border) transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-(--color_primary_light)/20 flex items-center justify-center shrink-0">
                            <UserGroupIcon className="w-4 h-4 text-(--color_primary_icon)" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-white truncate">
                              {group.name}
                            </div>
                            <div className="text-xs text-(--color_text_muted)">
                              Тренер: {group.trainer.fullName || group.trainer.email} ·{' '}
                              {group.memberCount} участников
                            </div>
                          </div>
                          <button
                            onClick={() => openGroupChat(group)}
                            disabled={openingChatFor === group.id}
                            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--color_primary_light) text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
                          >
                            {groupUnread > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                                {groupUnread > 99 ? '99+' : groupUnread}
                              </span>
                            )}
                            <ChatBubbleLeftIcon className="w-3.5 h-3.5" />
                            Чат
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Upcoming workouts */}
            {upcomingWorkouts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border) mt-4"
              >
                <div className="flex items-center gap-2 mb-4">
                  <CalendarDaysIcon className="w-5 h-5 text-(--color_primary_icon)" />
                  <h2 className="text-lg font-semibold text-white">Расписание</h2>
                  <span className="ml-auto text-xs text-(--color_text_muted)">
                    Следующие 14 дней
                  </span>
                </div>
                <div className="space-y-2">
                  {upcomingWorkouts.map((w) => {
                    const label = WORKOUT_LABELS[w.workoutType] ?? w.workoutType;
                    const color = WORKOUT_COLORS[w.workoutType] ?? 'text-white';
                    const dateStr = formatWorkoutDate(w.date);
                    const isToday = dateStr === 'Сегодня';
                    return (
                      <div
                        key={w.id}
                        onClick={() => navigate('/calendar')}
                        className="flex items-center gap-3 p-3 rounded-xl bg-(--color_bg_card_hover) hover:bg-(--color_border) transition-colors cursor-pointer"
                      >
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ${isToday ? 'bg-(--color_primary_light)' : 'bg-white/20'}`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${color}`}>{label}</span>
                            {isToday && (
                              <span className="px-1.5 py-0.5 rounded bg-(--color_primary_light)/20 text-(--color_primary_light) text-[10px] font-medium">
                                Сегодня
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-(--color_text_muted) mt-0.5">
                            {w.exerciseCount} упражнений
                            {w.notes ? ` · ${w.notes}` : ''}
                          </div>
                        </div>
                        <div
                          className={`text-xs font-medium shrink-0 ${isToday ? 'text-white' : 'text-(--color_text_muted)'}`}
                        >
                          {dateStr}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </Screen>
  );
}
