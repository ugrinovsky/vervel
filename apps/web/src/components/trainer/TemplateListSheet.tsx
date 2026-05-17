import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import { normalizeExercisesForType } from '@/components/WorkoutExercisesEditor/normalizeForWorkoutType';
import { trainerApi, type WorkoutTemplate } from '@/api/trainer';
import { PlusIcon, PencilIcon } from '@heroicons/react/24/outline';
import AccentButton from '@/components/ui/AccentButton';
import Button from '@/components/ui/Button';
import WorkoutTemplateForm, {
  type WorkoutTemplateFormData,
} from '@/components/WorkoutTemplateForm/WorkoutTemplateForm';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export default function TemplateListSheet({ open, onClose, onSaved }: Props) {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadTemplates() {
    setLoading(true);
    try {
      const res = await trainerApi.getWorkoutTemplates();
      setTemplates(res.data.data);
    } catch {
      toast.error('Ошибка загрузки шаблонов');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) loadTemplates();
  }, [open]);

  const openCreate = () => {
    setEditingTemplate(null);
    setShowForm(true);
  };

  const openEdit = (t: WorkoutTemplate) => {
    setEditingTemplate(t);
    setShowForm(true);
  };

  const handleSave = async (data: WorkoutTemplateFormData) => {
    setSaving(true);
    try {
      const payload = {
        name: data.name,
        workoutType: data.workoutType,
        exercises: data.exercises,
        description: data.description || undefined,
        isPublic: false as const,
      };
      if (editingTemplate) {
        await trainerApi.updateWorkoutTemplate(editingTemplate.id, payload);
        toast.success('Шаблон обновлён');
      } else {
        await trainerApi.createWorkoutTemplate(payload);
        toast.success('Шаблон создан');
      }
      setShowForm(false);
      loadTemplates();
      onSaved?.();
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Список шаблонов */}
      <BottomSheet
        id="copilot-template-list"
        open={open}
        onClose={onClose}
        emoji="📋"
        title="Шаблоны"
      >
        <div className="space-y-3">
          <div className="flex justify-end">
            <AccentButton size="sm" onClick={openCreate}>
              <PlusIcon className="w-4 h-4" />
              Новый шаблон
            </AccentButton>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-(--color_text_muted) text-center py-4">
              Нет шаблонов — создайте первый
            </p>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <Button
                  key={t.id}
                  type="button"
                  variant="unstyled"
                  fullWidth
                  onClick={() => openEdit(t)}
                  className="glass-row flex items-center gap-3 p-3 rounded-xl text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{t.name}</div>
                    <div className="text-xs text-(--color_text_muted) mt-0.5">
                      {t.exercises?.length ? (
                        `${t.exercises.length} упр.`
                      ) : (
                        <span className="text-yellow-400">⚠ нет упражнений</span>
                      )}
                      {' · '}
                      {t.workoutType === 'bodybuilding'
                        ? 'Силовая'
                        : t.workoutType === 'cardio'
                          ? 'Кардио'
                          : 'CrossFit'}
                    </div>
                  </div>
                  <PencilIcon className="w-4 h-4 text-white/30 shrink-0" />
                </Button>
              ))}
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Редактор шаблона */}
      <BottomSheet
        id="copilot-template-form"
        open={showForm}
        onClose={() => !saving && setShowForm(false)}
        emoji="📋"
        title={editingTemplate ? 'Редактировать шаблон' : 'Новый шаблон'}
      >
        <WorkoutTemplateForm
          key={editingTemplate?.id ?? 'new'}
          initial={
            editingTemplate
              ? {
                  name: editingTemplate.name,
                  workoutType: editingTemplate.workoutType,
                  exercises: normalizeExercisesForType(
                    editingTemplate.workoutType,
                    editingTemplate.exercises ?? []
                  ),
                  description: editingTemplate.description ?? '',
                }
              : undefined
          }
          isEditing={editingTemplate != null}
          saving={saving}
          onSave={handleSave}
        />
      </BottomSheet>
    </>
  );
}
