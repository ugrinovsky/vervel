import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import ExercisePicker from '@/components/ExercisePicker/ExercisePicker';
import { trainerApi, type WorkoutTemplate, type ExerciseData } from '@/api/trainer';
import type { ExerciseWithSets } from '@/types/Exercise';
import { PlusIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function TrainerTemplatesScreen() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState<'crossfit' | 'bodybuilding' | 'cardio'>('crossfit');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateExercises, setTemplateExercises] = useState<ExerciseData[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await trainerApi.getWorkoutTemplates();
      setTemplates(response.data.data);
    } catch {
      toast.error('Ошибка загрузки шаблонов');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateType('crossfit');
    setTemplateDescription('');
    setTemplateExercises([]);
    setShowForm(true);
  };

  const openEdit = (template: WorkoutTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateType(template.workoutType);
    setTemplateDescription(template.description || '');
    setTemplateExercises(template.exercises ?? []);
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
  };

  const handleExerciseSelect = (ex: ExerciseWithSets) => {
    const exData: ExerciseData = ex.duration != null
      ? { exerciseId: String(ex.exerciseId), name: ex.title, duration: ex.duration }
      : {
          exerciseId: String(ex.exerciseId),
          name: ex.title,
          sets: ex.sets.length || 3,
          reps: ex.sets[0]?.reps ?? 10,
          weight: ex.sets[0]?.weight || undefined,
        };
    setTemplateExercises((prev) => [...prev, exData]);
  };

  const removeExercise = (index: number) => {
    setTemplateExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      toast.error('Укажите название шаблона');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: templateName,
        workoutType: templateType,
        exercises: templateExercises,
        description: templateDescription || undefined,
        isPublic: false,
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
    } catch {
      toast.error('Ошибка сохранения шаблона');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await trainerApi.deleteWorkoutTemplate(id);
      setConfirmDeleteId(null);
      toast.success('Шаблон удалён');
      loadTemplates();
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  return (
    <Screen className="trainer-templates-screen">
      <div className="p-4 w-full max-w-2xl mx-auto">
        <ScreenHeader
          icon="📋"
          title="Шаблоны"
          description="Заготовки тренировок для быстрого назначения атлетам и группам"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border)"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Все шаблоны</h2>
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--color_primary_light) text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <PlusIcon className="w-4 h-4" />
              Создать
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-white/20 border-t-(--color_primary_light) rounded-full animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-sm text-(--color_text_muted)">Пока нет шаблонов. Создайте первый!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="relative p-3 rounded-xl bg-(--color_bg_card_hover) hover:bg-(--color_border) transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-white truncate">{template.name}</div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-(--color_primary_light) text-white shrink-0">
                          {template.workoutType === 'crossfit' ? 'CrossFit' : template.workoutType === 'bodybuilding' ? 'Силовая' : 'Кардио'}
                        </span>
                      </div>
                      {template.description && (
                        <div className="text-xs text-(--color_text_muted) mt-0.5 truncate">{template.description}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <button onClick={() => openEdit(template)} className="p-1.5 text-(--color_text_muted) hover:text-white transition-colors" title="Редактировать">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => setConfirmDeleteId(template.id)} className="p-1.5 text-(--color_text_muted) hover:text-red-400 transition-colors" title="Удалить">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {confirmDeleteId === template.id && (
                    <div
                      className="absolute inset-0 rounded-xl bg-black/40 backdrop-blur-sm flex items-center justify-center gap-3 z-10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-sm text-red-400 font-medium">Удалить шаблон?</span>
                      <button onClick={() => handleDelete(template.id)} className="p-1.5 text-red-400 hover:text-red-300 transition-colors" title="Да">
                        <CheckIcon className="w-5 h-5" />
                      </button>
                      <button onClick={() => setConfirmDeleteId(null)} className="p-1.5 text-white/60 hover:text-white transition-colors" title="Отмена">
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {template.exercises?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {template.exercises.slice(0, 4).map((ex, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-(--color_bg_card) text-(--color_text_secondary)">
                          {ex.name}
                          {ex.sets && ex.reps ? ` ${ex.sets}×${ex.reps}` : ex.duration ? ` ${ex.duration}мин` : ''}
                        </span>
                      ))}
                      {template.exercises.length > 4 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-(--color_bg_card) text-(--color_text_muted)">
                          +{template.exercises.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Form BottomSheet ── */}
      <BottomSheet
        open={showForm}
        onClose={closeForm}
        emoji="📋"
        title={editingTemplate ? 'Редактировать шаблон' : 'Новый шаблон'}
      >
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs text-(--color_text_muted) mb-1 block">Название</label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Название шаблона..."
              className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-xs text-(--color_text_muted) mb-1 block">Тип</label>
            <div className="grid grid-cols-3 gap-2">
              {(['crossfit', 'bodybuilding', 'cardio'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setTemplateType(type)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    templateType === type
                      ? 'bg-(--color_primary_light) text-white'
                      : 'bg-(--color_bg_card) text-(--color_text_muted) hover:text-white'
                  }`}
                >
                  {type === 'crossfit' ? 'CrossFit' : type === 'bodybuilding' ? 'Силовая' : 'Кардио'}
                </button>
              ))}
            </div>
          </div>

          {/* Exercises */}
          {templateExercises.length > 0 && (
            <div>
              <label className="text-xs text-(--color_text_muted) mb-2 block">
                Упражнения <span className="text-white/40">({templateExercises.length})</span>
              </label>
              <div className="space-y-1">
                {templateExercises.map((ex, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-(--color_bg_card)"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-sm text-white truncate block">{ex.name}</span>
                      <span className="text-xs text-(--color_text_muted)">
                        {ex.duration
                          ? `${ex.duration} мин`
                          : `${ex.sets ?? '?'}×${ex.reps ?? '?'}${ex.weight ? ` · ${ex.weight}кг` : ''}`}
                      </span>
                    </div>
                    <button
                      onClick={() => removeExercise(i)}
                      className="ml-2 text-(--color_text_muted) hover:text-red-400 transition-colors shrink-0"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <ExercisePicker onSelect={handleExerciseSelect} workoutType={templateType} />

          {/* Description */}
          <div>
            <label className="text-xs text-(--color_text_muted) mb-1 block">Описание (опционально)</label>
            <textarea
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Описание шаблона..."
              rows={2}
              className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-(--color_primary_light) text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Сохранение...' : editingTemplate ? 'Сохранить изменения' : 'Создать шаблон'}
          </button>
        </div>
      </BottomSheet>
    </Screen>
  );
}
