import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import AddAthleteDrawer from '@/components/AddAthleteDrawer/AddAthleteDrawer';
import { trainerApi, type AthleteListItem, type TrainerGroupItem } from '@/api/trainer';
import { PlusIcon, UserGroupIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function TrainerDashboardScreen() {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<AthleteListItem[]>([]);
  const [groups, setGroups] = useState<TrainerGroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showGroupInput, setShowGroupInput] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [athletesRes, groupsRes] = await Promise.all([
        trainerApi.listAthletes(),
        trainerApi.listGroups(),
      ]);
      setAthletes(athletesRes.data.data);
      setGroups(groupsRes.data.data);
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

  const handleRemoveAthlete = async (athleteId: number) => {
    try {
      await trainerApi.removeAthlete(athleteId);
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
        <ScreenHeader icon="👥" title="Команда" description="Управление атлетами и группами" />

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 gap-3 mb-6"
        >
          <div className="bg-[var(--color_bg_card)] rounded-xl p-4 border border-[var(--color_border)] text-center">
            <div className="text-2xl font-bold text-white">{athletes.length}</div>
            <div className="text-xs text-[var(--color_text_muted)] mt-1">Атлетов</div>
          </div>
          <div className="bg-[var(--color_bg_card)] rounded-xl p-4 border border-[var(--color_border)] text-center">
            <div className="text-2xl font-bold text-white">{groups.length}</div>
            <div className="text-xs text-[var(--color_text_muted)] mt-1">Групп</div>
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
            <h2 className="text-lg font-semibold text-white">Атлеты</h2>
            <button
              onClick={() => setShowAddDrawer(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color_primary_light)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <PlusIcon className="w-4 h-4" />
              Добавить
            </button>
          </div>

          {athletes.length === 0 ? (
            <p className="text-sm text-[var(--color_text_muted)] text-center py-4">
              Пока нет привязанных атлетов
            </p>
          ) : (
            <div className="space-y-2">
              {athletes.map((athlete) => (
                <div
                  key={athlete.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[var(--color_bg_card_hover)] hover:bg-[var(--color_border)] transition-colors cursor-pointer"
                  onClick={() => navigate(`/trainer/athletes/${athlete.id}`)}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {athlete.fullName || 'Без имени'}
                    </div>
                    <div className="text-xs text-[var(--color_text_muted)] truncate">
                      {athlete.email}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveAthlete(athlete.id);
                    }}
                    className="text-[var(--color_text_muted)] hover:text-red-400 transition-colors p-1"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Groups */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[var(--color_bg_card)] rounded-2xl p-5 border border-[var(--color_border)] mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Группы</h2>
            <button
              onClick={() => setShowGroupInput(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color_bg_card_hover)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
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
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-[var(--color_bg_card_hover)] hover:bg-[var(--color_border)] transition-colors cursor-pointer"
                  onClick={() => navigate(`/trainer/groups/${group.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <UserGroupIcon className="w-5 h-5 text-[var(--color_primary_light)]" />
                    <div>
                      <div className="text-sm font-medium text-white">{group.name}</div>
                      <div className="text-xs text-[var(--color_text_muted)]">
                        {group.athleteCount} атлетов
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGroup(group.id);
                    }}
                    className="text-[var(--color_text_muted)] hover:text-red-400 transition-colors p-1"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
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
