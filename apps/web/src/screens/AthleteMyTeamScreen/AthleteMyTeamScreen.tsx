import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import FullScreenChat from '@/components/FullScreenChat/FullScreenChat';
import { athleteApi, type AthleteGroup, type AthleteTrainer } from '@/api/athlete';
import {
  ChatBubbleLeftIcon,
  UserGroupIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

type ActiveChat = { chatId: number; title: string } | null;

export default function AthleteMyTeamScreen() {
  const [groups, setGroups] = useState<AthleteGroup[]>([]);
  const [trainers, setTrainers] = useState<AthleteTrainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState<ActiveChat>(null);
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
        const [groupsRes, trainersRes] = await Promise.all([
          athleteApi.getMyGroups(),
          athleteApi.getMyTrainers(),
        ]);
        setGroups(groupsRes.data.data);
        setTrainers(trainersRes.data.data);
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

  if (loading) {
    return (
      <Screen>
        <div className="p-4 flex items-center justify-center min-h-[60vh]">
          <div className="text-(--color_text_muted)">Загрузка...</div>
        </div>
      </Screen>
    );
  }

  const isEmpty = groups.length === 0 && trainers.length === 0;

  return (
    <Screen>
      <FullScreenChat
        open={!!activeChat}
        chatId={activeChat?.chatId ?? null}
        title={activeChat?.title ?? ''}
        onClose={() => setActiveChat(null)}
      />

      <div className="p-4 w-full max-w-2xl mx-auto">
        <ScreenHeader icon="🤝" title="Моя команда" description="Тренеры и группы" />

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
                <div className="space-y-2">
                  {trainers.map((trainer) => {
                    const trainerUnread = trainer.chatId ? (unreadMap.get(trainer.chatId) ?? 0) : 0;
                    return (
                      <div
                        key={trainer.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-(--color_bg_card_hover) hover:bg-(--color_border) transition-colors"
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-(--color_primary_light) to-(--color_primary) flex items-center justify-center text-sm font-bold text-white shrink-0">
                          {(trainer.fullName || trainer.email)[0].toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-white truncate">
                            {trainer.fullName || 'Без имени'}
                          </div>
                          <div className="text-xs text-(--color_text_muted) truncate">
                            {trainer.email}
                          </div>
                        </div>
                        <button
                          onClick={() => openTrainerChat(trainer)}
                          disabled={openingChatFor === trainer.id}
                          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--color_primary_light) text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
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
          </>
        )}
      </div>
    </Screen>
  );
}
