import { useState, useEffect } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import AccentButton from '@/components/ui/AccentButton';
import GhostButton from '@/components/ui/GhostButton';
import AppInput from '@/components/ui/AppInput';
import FormField from '@/components/FormField';
import { trainerApi, type TrainerCustomExercise } from '@/api/trainer';
import type { ExerciseWithSets } from '@/types/Exercise';
import { buildTrainerCustomExerciseWithSets } from '@/util/trainerCustomExerciseWithSets';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  workoutType: string;
  onSelect: (exercise: ExerciseWithSets) => void;
}

export default function CustomExercisePicker({ open, onClose, workoutType, onSelect }: Props) {
  const [exercises, setExercises] = useState<TrainerCustomExercise[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Inline create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    trainerApi
      .listCustomExercises()
      .then((res) => setExercises(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const handleClose = () => {
    setSearch('');
    setShowCreate(false);
    setNewName('');
    setNewNotes('');
    onClose();
  };

  const filtered = exercises.filter(
    (ex) => !search.trim() || ex.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const handlePick = (ex: TrainerCustomExercise) => {
    onSelect(buildTrainerCustomExerciseWithSets(workoutType, ex.name));
    handleClose();
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await trainerApi.createCustomExercise({
        name: newName.trim(),
        notes: newNotes.trim() || null,
      });
      const created = res.data.data;
      setExercises((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      onSelect(buildTrainerCustomExerciseWithSets(workoutType, created.name));
      toast.success('Упражнение добавлено');
      handleClose();
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const headerContent = (
    <div className="flex items-center gap-2">
      <span className="text-xl">✏️</span>
      <span className="text-lg font-bold text-white">Свои упражнения</span>
    </div>
  );

  return (
    <BottomSheet
      id="custom-exercise-picker"
      open={open}
      onClose={handleClose}
      header={headerContent}
    >
      <div className="flex flex-col" style={{ maxHeight: 'calc(90dvh - 140px)' }}>
        {/* Search */}
        <div className="mb-3">
          <AppInput
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto min-h-0 pb-4">
          {loading ? (
            <p className="text-sm text-(--color_text_muted) text-center py-6">Загрузка…</p>
          ) : filtered.length === 0 && !showCreate ? (
            <div className="py-6 text-center">
              <p className="text-sm text-(--color_text_muted) mb-3">
                {search.trim() ? `«${search}» не найдено` : 'Нет сохранённых упражнений'}
              </p>
              <button
                onClick={() => {
                  setNewName(search.trim());
                  setShowCreate(true);
                }}
                className="flex items-center gap-1.5 mx-auto text-sm text-(--color_primary_light) hover:opacity-80 transition-opacity"
              >
                <PlusIcon className="w-4 h-4" />
                Создать новое
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => handlePick(ex)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-(--color_bg_card_hover) border border-(--color_border) text-left hover:border-(--color_primary_light) transition-colors"
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-white truncate">{ex.name}</span>
                    {ex.notes && (
                      <span className="text-xs text-(--color_text_muted) truncate block">
                        {ex.notes}
                      </span>
                    )}
                  </span>
                  <PlusIcon className="w-4 h-4 text-(--color_text_muted) shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Inline create form */}
        {showCreate ? (
          <div className="shrink-0 border-t border-(--color_border) pt-4 space-y-3">
            <p className="text-sm font-medium text-white">Новое упражнение</p>
            <FormField label="Название">
              <AppInput
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Название..."
                autoFocus
              />
            </FormField>
            <FormField label="Заметка (опционально)">
              <AppInput
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Техника, особенности..."
              />
            </FormField>
            <div className="flex gap-2">
              <AccentButton
                onClick={() => void handleCreate()}
                disabled={!newName.trim() || saving}
                loading={saving}
                loadingText="Сохраняем..."
                className="flex-1"
              >
                Добавить
              </AccentButton>
              <GhostButton variant="solid" onClick={() => setShowCreate(false)} className="px-4">
                Отмена
              </GhostButton>
            </div>
          </div>
        ) : (
          filtered.length > 0 && (
            <div className="shrink-0 border-t border-(--color_border) pt-3">
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 text-sm text-(--color_text_muted) hover:text-white transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Создать новое упражнение
              </button>
            </div>
          )
        )}
      </div>
    </BottomSheet>
  );
}
