import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import Badge from '@/components/ui/Badge';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import ScreenHint from '@/components/ScreenHint/ScreenHint';
import AccentButton from '@/components/ui/AccentButton';
import AppInput from '@/components/ui/AppInput';
import Card, { cardClass } from '@/components/ui/Card';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import { trainerApi, type TrainerGroupItem, type UnreadCounts } from '@/api/trainer';
import {
  PlusIcon,
  UserGroupIcon,
  UsersIcon,
  ChatBubbleLeftEllipsisIcon,
} from '@heroicons/react/24/outline';
import ConfirmDeleteWrapper from '@/components/ui/ConfirmDeleteWrapper';

export default function TrainerGroupsListScreen() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<TrainerGroupItem[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateSheet, setShowCreateSheet] = useState(false);
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
      setShowCreateSheet(false);
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
      <div className="p-4 w-full mx-auto">
        <ScreenHeader
          icon="👥"
          title="Группы"
          description="Ваши тренировочные группы — создавайте группы, добавляйте атлетов, назначайте тренировки и ведите чат"
        />

        <ScreenHint className="mb-4">
          Создайте группу, добавьте атлетов по коду или QR и назначайте тренировки сразу всей группе через{' '}
          <span className="text-white font-medium">Календарь</span>.
          В каждой группе есть общий чат для общения с участниками.
        </ScreenHint>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3 mb-6"
        >
          <Card className="p-3 flex flex-col items-center gap-1.5">
            <UserGroupIcon className="w-5 h-5 text-(--color_primary_icon)" />
            <div className="text-xl font-bold text-white">{groups.length}</div>
            <div className="text-[11px] text-(--color_text_muted) text-center">Групп</div>
          </Card>
          <Card className="p-3 flex flex-col items-center gap-1.5">
            <UsersIcon className="w-5 h-5 text-(--color_primary_icon)" />
            <div className="text-xl font-bold text-white">
              {groups.reduce((s, g) => s + g.athleteCount, 0)}
            </div>
            <div className="text-[11px] text-(--color_text_muted) text-center">Атлетов</div>
          </Card>
          <Card className="p-3 flex flex-col items-center gap-1.5">
            <ChatBubbleLeftEllipsisIcon
              className={`w-5 h-5 ${(unreadCounts?.groups.reduce((s, g) => s + g.unread, 0) ?? 0) > 0 ? 'text-red-400' : 'text-(--color_text_muted)'}`}
            />
            <div
              className={`text-xl font-bold ${(unreadCounts?.groups.reduce((s, g) => s + g.unread, 0) ?? 0) > 0 ? 'text-red-400' : 'text-white'}`}
            >
              {unreadCounts?.groups.reduce((s, g) => s + g.unread, 0) ?? 0}
            </div>
            <div className="text-[11px] text-(--color_text_muted) text-center">Новых сообщ.</div>
          </Card>
        </motion.div>

        {/* Groups */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`${cardClass} rounded-2xl p-5 mb-6`}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Все группы</h2>
            <AccentButton
              onClick={() => setShowCreateSheet(true)}
              size="sm"
            >
              <PlusIcon className="w-4 h-4" />
              Создать
            </AccentButton>
          </div>

          {groups.length === 0 ? (
            <div className="py-4 space-y-3">
              <div className="text-center">
                <div className="text-3xl mb-2">👥</div>
                <p className="text-sm font-medium text-white mb-1">Пока нет групп</p>
                <p className="text-xs text-(--color_text_muted)">Создайте группу и добавьте атлетов — они получат расписание и доступ к чату</p>
              </div>
              <div className="space-y-2 pt-1">
                {[
                  { emoji: '1️⃣', text: 'Нажмите «Создать» и задайте название группы' },
                  { emoji: '2️⃣', text: 'Зайдите в группу и пригласите атлетов по QR-коду или ссылке' },
                  { emoji: '3️⃣', text: 'Назначайте тренировки сразу всей группе через Календарь' },
                ].map(({ emoji, text }) => (
                  <div key={emoji} className="flex items-start gap-2 text-xs text-(--color_text_muted)">
                    <span className="shrink-0">{emoji}</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => {
                const unread = getGroupUnread(group.id);
                return (
                  <ConfirmDeleteWrapper
                    key={group.id}
                    onConfirm={() => handleDeleteGroup(group.id)}

                    className="p-3 bg-(--color_bg_card_hover) w-full"
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity"
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
                        {unread > 0 && <Badge count={unread} />}
                        <ConfirmDeleteWrapper.Trigger />
                      </div>
                    </div>
                  </ConfirmDeleteWrapper>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      <BottomSheet
        id="trainer-groups-list-create-group"
        open={showCreateSheet}
        onClose={() => { setShowCreateSheet(false); setNewGroupName(''); }}
        emoji="👥"
        title="Новая группа"
      >
        <div className="flex flex-col gap-3">
          <AppInput
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Название группы"
            onKeyDown={(e) => e.key === 'Enter' && handleCreateGroup()}
          />
          <AccentButton onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
            Создать группу
          </AccentButton>
        </div>
      </BottomSheet>
    </Screen>
  );
}
