import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import ScreenHint from '@/components/ScreenHint/ScreenHint';
import AddAthleteDrawer from '@/components/AddAthleteDrawer/AddAthleteDrawer';
import { trainerApi, type AthleteListItem } from '@/api/trainer';
import { useTrainerUnreadCounts } from '@/hooks/useTrainerUnreadCounts';
import UserAvatar from '@/components/UserAvatar/UserAvatar';
import AccentButton from '@/components/ui/AccentButton';
import {
  PlusIcon,
  UsersIcon,
  ClockIcon,
  ChatBubbleLeftEllipsisIcon,
  Squares2X2Icon,
  ViewColumnsIcon,
  Bars3Icon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton';

export default function TrainerAthletesListScreen() {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<AthleteListItem[]>([]);
  const { data: unreadCounts, refresh: refreshUnread } = useTrainerUnreadCounts();
  const [loading, setLoading] = useState(true);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [search, setSearch] = useState('');
  type ViewMode = '2' | '3' | 'list';
  const [view, setView] = useState<ViewMode>(() => {
    const stored = localStorage.getItem('athletes_view_mode');
    return stored === '3' || stored === 'list' ? (stored as ViewMode) : '2';
  });

  const setViewMode = (v: ViewMode) => {
    setView(v);
    localStorage.setItem('athletes_view_mode', v);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const athletesRes = await trainerApi.listAthletes();
      setAthletes(athletesRes.data.data);
      refreshUnread();
    } catch {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredAthletes = useMemo(() => {
    if (!search.trim()) return athletes;
    const q = search.toLowerCase();
    return athletes.filter(
      (a) =>
        (a.fullName ?? '').toLowerCase().includes(q) ||
        (a.email ?? '').toLowerCase().includes(q) ||
        (a.nickname ?? '').toLowerCase().includes(q)
    );
  }, [athletes, search]);

  const getAthleteUnread = (athleteId: number) =>
    unreadCounts?.athletes.find((a) => a.athleteId === athleteId)?.unread ?? 0;

  const handleRemoveAthlete = async (athleteId: number) => {
    try {
      await trainerApi.removeAthlete(athleteId);
      toast.success('Атлет отвязан');
      loadData();
    } catch {
      toast.error('Ошибка при отвязке атлета');
    }
  };


  return (
    <Screen loading={loading} className="trainer-athletes-list-screen">
      <div className="p-4 w-full mx-auto">
        <ScreenHeader
          icon="🏃"
          title="Атлеты"
          description="Атлеты на индивидуальном ведении — смотрите аналитику, переписывайтесь и назначайте персональные тренировки"
        />

        <ScreenHint className="mb-4">
          Здесь атлеты на персональном ведении. Нажмите на карточку — увидите аналитику нагрузок,
          историю тренировок и личный чат.{' '}
          <span className="text-white font-medium">Назначить тренировку</span> можно через Календарь,
          выбрав атлета при создании.
        </ScreenHint>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) flex flex-col items-center gap-1.5">
            <UsersIcon className="w-5 h-5 text-(--color_primary_icon)" />
            <div className="text-xl font-bold text-white">{athletes.length}</div>
            <div className="text-[11px] text-(--color_text_muted) text-center">Всего</div>
          </div>
          <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) flex flex-col items-center gap-1.5">
            <ClockIcon
              className={`w-5 h-5 ${athletes.filter((a) => a.status === 'pending').length > 0 ? 'text-amber-400' : 'text-(--color_text_muted)'}`}
            />
            <div
              className={`text-xl font-bold ${athletes.filter((a) => a.status === 'pending').length > 0 ? 'text-amber-400' : 'text-white'}`}
            >
              {athletes.filter((a) => a.status === 'pending').length}
            </div>
            <div className="text-[11px] text-(--color_text_muted) text-center">Ожидают</div>
          </div>
          <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) flex flex-col items-center gap-1.5">
            <ChatBubbleLeftEllipsisIcon
              className={`w-5 h-5 ${(unreadCounts?.athletes.reduce((s, a) => s + a.unread, 0) ?? 0) > 0 ? 'text-red-400' : 'text-(--color_text_muted)'}`}
            />
            <div
              className={`text-xl font-bold ${(unreadCounts?.athletes.reduce((s, a) => s + a.unread, 0) ?? 0) > 0 ? 'text-red-400' : 'text-white'}`}
            >
              {unreadCounts?.athletes.reduce((s, a) => s + a.unread, 0) ?? 0}
            </div>
            <div className="text-[11px] text-(--color_text_muted) text-center">Новых сообщ.</div>
          </div>
        </motion.div>

        {/* Athletes grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Search */}
          {athletes.length > 0 && (
            <div className="relative mb-3">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--color_text_muted) pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по имени или email…"
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-(--color_bg_card) border border-(--color_border) text-white placeholder:text-(--color_text_muted) focus:outline-none focus:border-(--color_primary_light)/60"
              />
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-(--color_text_muted) uppercase tracking-wide">
              Атлеты
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg bg-(--color_bg_card) border border-(--color_border) overflow-hidden">
                {(
                  [
                    { v: '2', icon: <Squares2X2Icon className="w-4 h-4" />, title: '2 колонки' },
                    { v: '3', icon: <ViewColumnsIcon className="w-4 h-4" />, title: '3 колонки' },
                    { v: 'list', icon: <Bars3Icon className="w-4 h-4" />, title: 'Список' },
                  ] as const
                ).map(({ v, icon, title }) => (
                  <button
                    key={v}
                    onClick={() => setViewMode(v)}
                    title={title}
                    className={`p-1.5 transition-colors ${view === v ? 'bg-(--color_primary_light) text-white' : 'text-(--color_text_muted) hover:text-white'}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <AccentButton size="sm" onClick={() => setShowAddDrawer(true)}>
                <PlusIcon className="w-4 h-4" />
                Добавить
              </AccentButton>
            </div>
          </div>

          {athletes.length === 0 ? (
            <div className="py-4 space-y-3">
              <div className="text-center">
                <div className="text-3xl mb-2">🏃</div>
                <p className="text-sm font-medium text-white mb-1">Пока нет атлетов</p>
                <p className="text-xs text-(--color_text_muted)">Пригласите атлета — он увидит ваш профиль, расписание и сможет писать вам в чат</p>
              </div>
              <div className="space-y-2 pt-1">
                {[
                  { emoji: '1️⃣', text: 'Нажмите «Добавить» и отправьте атлету ссылку-приглашение' },
                  { emoji: '2️⃣', text: 'Атлет принимает приглашение — вы появляетесь в его «Моя команда»' },
                  { emoji: '3️⃣', text: 'Назначайте персональные тренировки через Календарь' },
                ].map(({ emoji, text }) => (
                  <div key={emoji} className="flex items-start gap-2 text-xs text-(--color_text_muted)">
                    <span className="shrink-0">{emoji}</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowAddDrawer(true)}
                className="w-full py-2.5 rounded-xl bg-(--color_primary_light) text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Пригласить первого атлета
              </button>
            </div>
          ) : filteredAthletes.length === 0 ? (
            <p className="text-sm text-(--color_text_muted) text-center py-8">Ничего не найдено</p>
          ) : view === 'list' ? (
            <div className="flex flex-col gap-2">
              {filteredAthletes.map((athlete) => {
                const unread = getAthleteUnread(athlete.id);
                return (
                  <motion.div
                    key={athlete.id}
                    whileTap={{ scale: 0.99 }}
                    className="relative flex items-start gap-3 px-4 py-3 rounded-xl bg-(--color_bg_card) border border-(--color_border) hover:bg-(--color_bg_card_hover) transition-colors"
                  >
                    <ConfirmDeleteButton
                      variant="overlay"
                      label="Отвязать?"
                      overlayRounded="rounded-xl"
                      overlayLayout="column"
                      onConfirm={() => handleRemoveAthlete(athlete.id)}
                      className="absolute top-2 left-2 z-10 p-0.5"
                    />
                    <div className="flex-1 min-w-0 pl-6" onClick={() => navigate(`/trainer/athletes/${athlete.id}`)}>
                      {/* Никнейм */}
                      <div className="text-sm font-semibold text-white truncate leading-snug">
                        {athlete.nickname || athlete.fullName || 'Без имени'}
                      </div>
                      {/* Имя (если задан никнейм) */}
                      {athlete.nickname && (
                        <div className="text-[11px] text-(--color_text_muted) truncate leading-snug">
                          {athlete.fullName || ''}
                        </div>
                      )}
                      {/* Email — всегда */}
                      <div className="text-[11px] text-(--color_text_muted)/70 truncate leading-snug">
                        {athlete.status === 'pending' ? '⏳ Ожидает' : athlete.email}
                      </div>
                    </div>
                    {unread > 0 && (
                      <div className="min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {unread > 99 ? '99+' : unread}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className={`grid gap-3 ${view === '2' ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {filteredAthletes.map((athlete) => {
                const unread = getAthleteUnread(athlete.id);
                return (
                  <motion.div
                    key={athlete.id}
                    whileTap={{ scale: 0.97 }}
                    className="relative flex flex-col items-center gap-2 p-4 rounded-2xl bg-(--color_bg_card) border border-(--color_border) hover:bg-(--color_bg_card_hover) transition-colors"
                  >
                    {unread > 0 && (
                      <div className="absolute top-2.5 right-2.5 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center z-10">
                        {unread > 99 ? '99+' : unread}
                      </div>
                    )}
                    <ConfirmDeleteButton
                      variant="overlay"
                      label="Отвязать?"
                      overlayRounded="rounded-2xl"
                      overlayLayout="column"
                      onConfirm={() => handleRemoveAthlete(athlete.id)}
                      className="absolute top-2.5 left-2.5 z-10 p-0.5"
                    />
                    <div className="cursor-pointer w-full flex flex-col items-center gap-2" onClick={() => navigate(`/trainer/athletes/${athlete.id}`)}>
                      <UserAvatar photoUrl={athlete.photoUrl} name={athlete.fullName} size={view === '2' ? 56 : 40} />
                      <div className="w-full text-center">
                        {athlete.nickname && (
                          <div className={`leading-tight truncate font-semibold text-white ${view === '2' ? 'text-sm' : 'text-xs'}`}>
                            {athlete.nickname}
                          </div>
                        )}
                        <div className={`text-(--color_text_muted) truncate ${view === '2' ? 'text-xs' : 'text-[10px]'}`}>
                          {athlete.fullName || 'Без имени'}
                        </div>
                        {view === '2' && (
                          <div className="text-[10px] text-(--color_text_muted)/60 truncate">
                            {athlete.status === 'pending' ? '⏳ Ожидает' : athlete.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      <AddAthleteDrawer
        open={showAddDrawer}
        onClose={() => setShowAddDrawer(false)}
        onAdded={loadData}
      />
    </Screen>
  );
}
