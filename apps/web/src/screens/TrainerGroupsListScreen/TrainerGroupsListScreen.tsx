import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import { trainerApi, type TrainerGroupItem, type UnreadCounts } from '@/api/trainer';
import { PlusIcon, UserGroupIcon, UsersIcon, ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';
import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton';

export default function TrainerGroupsListScreen() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<TrainerGroupItem[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGroupInput, setShowGroupInput] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsRes, unreadRes] = await Promise.all([
        trainerApi.listGroups(),
        trainerApi.getUnreadCounts(),
      ]);
      setGroups(groupsRes.data.data);
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

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await trainerApi.createGroup(newGroupName.trim());
      setNewGroupName('');
      setShowGroupInput(false);
      toast.success('Группа создана');
      loadData();
    } catch {
      toast.error('Ошибка создания группы');
    }
  };

  const handleDeleteGroup = async (id: number) => {
    try {
      await trainerApi.deleteGroup(id);
      toast.success('Группа удалена');
      loadData();
    } catch {
      toast.error('Ошибка удаления группы');
    }
  };

  const getGroupUnread = (groupId: number) =>
    unreadCounts?.groups.find((g) => g.groupId === groupId)?.unread ?? 0;

  return (
    <Screen loading={loading} className="trainer-groups-list-screen">
      <div className="p-4 w-full max-w-2xl mx-auto">
        <ScreenHeader icon="👥" title="Группы" description="Ваши тренировочные группы — создавайте группы, добавляйте атлетов, назначайте тренировки и ведите чат" />

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) flex flex-col items-center gap-1.5">
            <UserGroupIcon className="w-5 h-5 text-(--color_primary_icon)" />
            <div className="text-xl font-bold text-white">{groups.length}</div>
            <div className="text-[11px] text-(--color_text_muted) text-center">Групп</div>
          </div>
          <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) flex flex-col items-center gap-1.5">
            <UsersIcon className="w-5 h-5 text-(--color_primary_icon)" />
            <div className="text-xl font-bold text-white">
              {groups.reduce((s, g) => s + g.athleteCount, 0)}
            </div>
            <div className="text-[11px] text-(--color_text_muted) text-center">Атлетов</div>
          </div>
          <div className="bg-(--color_bg_card) rounded-xl p-3 border border-(--color_border) flex flex-col items-center gap-1.5">
            <ChatBubbleLeftEllipsisIcon className={`w-5 h-5 ${(unreadCounts?.groups.reduce((s, g) => s + g.unread, 0) ?? 0) > 0 ? 'text-red-400' : 'text-(--color_text_muted)'}`} />
            <div className={`text-xl font-bold ${(unreadCounts?.groups.reduce((s, g) => s + g.unread, 0) ?? 0) > 0 ? 'text-red-400' : 'text-white'}`}>
              {unreadCounts?.groups.reduce((s, g) => s + g.unread, 0) ?? 0}
            </div>
            <div className="text-[11px] text-(--color_text_muted) text-center">Новых сообщ.</div>
          </div>
        </motion.div>

        {/* Groups */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[var(--color_bg_card)] rounded-2xl p-5 border border-[var(--color_border)] mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Все группы</h2>
            <button
              onClick={() => setShowGroupInput(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color_primary_light)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <PlusIcon className="w-4 h-4" />
              Создать
            </button>
          </div>

          {showGroupInput && (
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Название группы"
                className="flex-1 bg-[var(--color_bg_input)] border border-[var(--color_border)] rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[var(--color_primary_light)] transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
                autoFocus
              />
              <button
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim()}
                className="px-4 py-2 rounded-xl bg-[var(--color_primary_light)] text-white text-sm font-medium disabled:opacity-50"
              >
                OK
              </button>
            </div>
          )}

          {groups.length === 0 && !showGroupInput ? (
            <p className="text-sm text-[var(--color_text_muted)] text-center py-4">
              Пока нет групп
            </p>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => {
                const unread = getGroupUnread(group.id);
                return (
                  <div
                    key={group.id}
                    className="relative flex items-center justify-between p-3 rounded-xl bg-(--color_bg_card_hover) hover:bg-(--color_border) transition-colors cursor-pointer"
                    onClick={() => navigate(`/trainer/groups/${group.id}`)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <UserGroupIcon className="w-5 h-5 text-(--color_primary_icon) shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">{group.name}</div>
                        <div className="text-xs text-(--color_text_muted)">
                          {group.athleteCount} атлетов
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {unread > 0 && (
                        <div className="min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                          {unread > 99 ? '99+' : unread}
                        </div>
                      )}
                      <ConfirmDeleteButton
                        variant="overlay"
                        label="Удалить группу?"
                        onConfirm={() => handleDeleteGroup(group.id)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </Screen>
  );
}
