import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import AddAthleteDrawer from '@/components/AddAthleteDrawer/AddAthleteDrawer';
import { trainerApi, type AthleteListItem } from '@/api/trainer';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function TrainerAthletesListScreen() {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<AthleteListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDrawer, setShowAddDrawer] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const athletesRes = await trainerApi.listAthletes();
      setAthletes(athletesRes.data.data);
    } catch {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
        <ScreenHeader icon="🏃" title="Атлеты" description="Управление персональными атлетами" />

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--color_bg_card)] rounded-xl p-4 border border-[var(--color_border)] text-center mb-6"
        >
          <div className="text-2xl font-bold text-white">{athletes.length}</div>
          <div className="text-xs text-[var(--color_text_muted)] mt-1">Атлетов</div>
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
      </div>

      <AddAthleteDrawer
        open={showAddDrawer}
        onClose={() => setShowAddDrawer(false)}
        onAdded={loadData}
      />
    </Screen>
  );
}
