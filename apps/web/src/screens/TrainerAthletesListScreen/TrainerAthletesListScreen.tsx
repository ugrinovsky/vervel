import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import AddAthleteDrawer from '@/components/AddAthleteDrawer/AddAthleteDrawer';
import { trainerApi, type AthleteListItem, type UnreadCounts } from '@/api/trainer';
import InlineAthleteAvatar from '@/components/MiniAvatar/InlineAthleteAvatar';
import { PlusIcon, TrashIcon, CheckIcon, XMarkIcon, UsersIcon, ClockIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';

export default function TrainerAthletesListScreen() {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<AthleteListItem[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [athletesRes, unreadRes] = await Promise.all([
        trainerApi.listAthletes(),
        trainerApi.getUnreadCounts(),
      ]);
      setAthletes(athletesRes.data.data);
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

  const getAthleteUnread = (athleteId: number) =>
    unreadCounts?.athletes.find((a) => a.athleteId === athleteId)?.unread ?? 0;

  const handleRemoveAthlete = async (athleteId: number) => {
    try {
      await trainerApi.removeAthlete(athleteId);
      setConfirmRemoveId(null);
      toast.success('Атлет отвязан');
      loadData();
    } catch {
      toast.error('Ошибка при отвязке атлета');
    }
  };

  if (loading) {
    return (
      <Screen>
        <div className="p-4 flex items-center justify-center min-h-[60vh]">
          <div className="text-[var(--color_text_muted)]">Загрузка...</div>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="p-4 w-full max-w-2xl mx-auto">
        <ScreenHeader icon="🏃" title="Атлеты" description="Управление персональными атлетами" />

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) flex flex-col items-center gap-1.5">
            <UsersIcon className="w-5 h-5 text-(--color_primary_light)" />
            <div className="text-xl font-bold text-white">{athletes.length}</div>
            <div className="text-[11px] text-(--color_text_muted) text-center">Всего</div>
          </div>
          <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) flex flex-col items-center gap-1.5">
            <ClockIcon className={`w-5 h-5 ${athletes.filter((a) => a.status === 'pending').length > 0 ? 'text-amber-400' : 'text-(--color_text_muted)'}`} />
            <div className={`text-xl font-bold ${athletes.filter((a) => a.status === 'pending').length > 0 ? 'text-amber-400' : 'text-white'}`}>
              {athletes.filter((a) => a.status === 'pending').length}
            </div>
            <div className="text-[11px] text-(--color_text_muted) text-center">Ожидают</div>
          </div>
          <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) flex flex-col items-center gap-1.5">
            <ChatBubbleLeftEllipsisIcon className={`w-5 h-5 ${(unreadCounts?.athletes.reduce((s, a) => s + a.unread, 0) ?? 0) > 0 ? 'text-red-400' : 'text-(--color_text_muted)'}`} />
            <div className={`text-xl font-bold ${(unreadCounts?.athletes.reduce((s, a) => s + a.unread, 0) ?? 0) > 0 ? 'text-red-400' : 'text-white'}`}>
              {unreadCounts?.athletes.reduce((s, a) => s + a.unread, 0) ?? 0}
            </div>
            <div className="text-[11px] text-(--color_text_muted) text-center">Новых сообщ.</div>
          </div>
        </motion.div>

        {/* Athletes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--color_bg_card)] rounded-2xl p-5 border border-[var(--color_border)] mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Все атлеты</h2>
            <button
              onClick={() => setShowAddDrawer(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color_primary_light)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <PlusIcon className="w-4 h-4" />
              Добавить
            </button>
          </div>

          {athletes.length === 0 ? (
            <p className="text-sm text-(--color_text_muted) text-center py-4">
              Пока нет привязанных атлетов
            </p>
          ) : (
            <div className="space-y-2">
              {athletes.map((athlete) => {
                const unread = getAthleteUnread(athlete.id);
                return (
                  <div
                    key={athlete.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-(--color_bg_card_hover) hover:bg-(--color_border) transition-colors cursor-pointer"
                    onClick={() => navigate(`/trainer/athletes/${athlete.id}`)}
                  >
                    <InlineAthleteAvatar athleteId={athlete.id} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-white truncate">
                        {athlete.fullName || 'Без имени'}
                      </div>
                      <div className="text-xs text-(--color_text_muted) truncate">
                        {athlete.email}
                      </div>
                    </div>
                    {unread > 0 && confirmRemoveId !== athlete.id && (
                      <div className="min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {unread > 99 ? '99+' : unread}
                      </div>
                    )}
                    {confirmRemoveId === athlete.id ? (
                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-xs text-red-400 mr-1">Отвязать?</span>
                        <button
                          onClick={() => handleRemoveAthlete(athlete.id)}
                          className="p-1 text-red-400 hover:text-red-300 transition-colors"
                          title="Да"
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmRemoveId(null)}
                          className="p-1 text-(--color_text_muted) hover:text-white transition-colors"
                          title="Отмена"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmRemoveId(athlete.id);
                        }}
                        className="text-(--color_text_muted) hover:text-red-400 transition-colors p-1 shrink-0"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
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
