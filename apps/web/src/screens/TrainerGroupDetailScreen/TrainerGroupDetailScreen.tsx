import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import { trainerApi, type AthleteListItem, type TrainerGroupItem } from '@/api/trainer';
import { ArrowLeftIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function TrainerGroupDetailScreen() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const id = Number(groupId);

  const [group, setGroup] = useState<TrainerGroupItem | null>(null);
  const [athletes, setAthletes] = useState<AthleteListItem[]>([]);
  const [allAthletes, setAllAthletes] = useState<AthleteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPicker, setShowAddPicker] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsRes, groupAthletesRes, allAthletesRes] = await Promise.all([
        trainerApi.listGroups(),
        trainerApi.getGroupAthletes(id),
        trainerApi.listAthletes(),
      ]);
      const foundGroup = groupsRes.data.data.find((g) => g.id === id);
      setGroup(foundGroup || null);
      setAthletes(groupAthletesRes.data.data);
      setAllAthletes(allAthletesRes.data.data);
    } catch {
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleAddToGroup = async (athleteId: number) => {
    try {
      await trainerApi.addAthleteToGroup(id, athleteId);
      toast.success('Атлет добавлен в группу');
      setShowAddPicker(false);
      loadData();
    } catch {
      toast.error('Ошибка добавления');
    }
  };

  const handleRemoveFromGroup = async (athleteId: number) => {
    try {
      await trainerApi.removeAthleteFromGroup(id, athleteId);
      toast.success('Атлет убран из группы');
      loadData();
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  const athleteIdsInGroup = new Set(athletes.map((a) => a.id));
  const availableAthletes = allAthletes.filter((a) => !athleteIdsInGroup.has(a.id));

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
        <button
          onClick={() => navigate('/trainer')}
          className="flex items-center gap-2 text-[var(--color_text_muted)] hover:text-white transition-colors mb-4"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          <span className="text-sm">Назад</span>
        </button>

        <ScreenHeader
          icon="👥"
          title={group?.name || 'Группа'}
          description={`${athletes.length} атлетов`}
        />

        {/* Athletes in group */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--color_bg_card)] rounded-2xl p-5 border border-[var(--color_border)] mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Участники</h2>
            {availableAthletes.length > 0 && (
              <button
                onClick={() => setShowAddPicker(!showAddPicker)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color_primary_light)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <PlusIcon className="w-4 h-4" />
                Добавить
              </button>
            )}
          </div>

          {/* Add picker */}
          {showAddPicker && (
            <div className="mb-4 space-y-1">
              <p className="text-xs text-[var(--color_text_muted)] mb-2">
                Выберите атлета для добавления:
              </p>
              {availableAthletes.map((a) => (
                <button
                  key={a.id}
                  onClick={() => handleAddToGroup(a.id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-[var(--color_bg_card_hover)] hover:bg-[var(--color_border)] transition-colors text-left"
                >
                  <span className="text-sm text-white">
                    {a.fullName || a.email}
                  </span>
                  <span className="text-xs text-[var(--color_text_muted)]">{a.email}</span>
                </button>
              ))}
            </div>
          )}

          {athletes.length === 0 ? (
            <p className="text-sm text-[var(--color_text_muted)] text-center py-4">
              В группе пока нет атлетов
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
                      handleRemoveFromGroup(athlete.id);
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
    </Screen>
  );
}
