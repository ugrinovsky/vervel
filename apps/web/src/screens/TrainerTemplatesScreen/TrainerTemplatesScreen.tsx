import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import ScreenHint from '@/components/ScreenHint/ScreenHint';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import FormField from '@/components/FormField';
import WorkoutTypeTabs, { type WorkoutType } from '@/components/WorkoutTypeTabs';
import WorkoutExercisesEditor, {
  normalizeExercisesForType,
} from '@/components/WorkoutExercisesEditor/WorkoutExercisesEditor';
import { trainerApi, type WorkoutTemplate, type ExerciseData } from '@/api/trainer';
import { useNavigate } from 'react-router';
import { PlusIcon, PencilIcon } from '@heroicons/react/24/outline';
import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton';
import { WORKOUT_TYPE_CONFIG, exerciseBrief } from '@/constants/workoutTypes';

export default function TrainerTemplatesScreen() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState<WorkoutType>('crossfit');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateExercises, setTemplateExercises] = useState<ExerciseData[]>([]);
  const [saving, setSaving] = useState(false);

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
    setTemplateExercises(normalizeExercisesForType(template.workoutType, template.exercises ?? []));
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
  };

  const handleTypeChange = (newType: WorkoutType) => {
    setTemplateType(newType);
    if (templateExercises.length > 0) {
      setTemplateExercises(normalizeExercisesForType(newType, templateExercises));
    }
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
      toast.success('Шаблон удалён');
      loadTemplates();
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  return (
    <Screen className="trainer-templates-screen">
      <div className="p-4 w-full mx-auto">
        <ScreenHeader
          icon="📋"
          title="Шаблоны"
          description="Заготовки тренировок для быстрого назначения атлетам и группам — создайте один раз и используйте многократно"
        />

        {/* Hint */}
        <ScreenHint className="mb-4">
          Шаблон — готовая тренировка. Создайте один раз и назначайте атлетам и группам через{' '}
          <button onClick={() => navigate('/trainer/calendar')} className="text-white font-medium underline underline-offset-2 hover:no-underline">
            Календарь
          </button>
          {' '}— не нужно каждый раз вводить упражнения заново.
        </ScreenHint>

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
            <div className="py-4 space-y-3">
              <div className="text-center">
                <div className="text-3xl mb-2">📋</div>
                <p className="text-sm font-medium text-white mb-1">Пока нет шаблонов</p>
                <p className="text-xs text-(--color_text_muted)">Шаблон — это готовая тренировка, которую можно быстро назначить любому атлету или группе</p>
              </div>
              <div className="space-y-2 pt-1">
                {[
                  { emoji: '1️⃣', text: 'Нажмите «Создать» и добавьте упражнения в шаблон' },
                  { emoji: '2️⃣', text: 'Откройте Календарь и назначьте шаблон атлету или группе на нужную дату' },
                  { emoji: '3️⃣', text: 'Атлет увидит тренировку в своём расписании в разделе «Моя команда»' },
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
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="relative p-3 rounded-xl bg-(--color_bg_card_hover) hover:bg-(--color_border) transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-white truncate">
                          {template.name}
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-(--color_primary_light) text-white shrink-0">
                          {WORKOUT_TYPE_CONFIG[template.workoutType] ?? template.workoutType}
                        </span>
                      </div>
                      {template.description && (
                        <div className="text-xs text-(--color_text_muted) mt-0.5 truncate">
                          {template.description}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <button
                        onClick={() => openEdit(template)}
                        className="p-1.5 text-(--color_text_muted) hover:text-white transition-colors"
                        title="Редактировать"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <ConfirmDeleteButton
                        variant="overlay"
                        label="Удалить шаблон?"
                        onConfirm={() => handleDelete(template.id)}
                      />
                    </div>
                  </div>

                  {template.exercises?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {template.exercises.slice(0, 4).map((ex, i) => {
                        const brief = exerciseBrief({
                          duration: ex.duration,
                          wodType: ex.wodType,
                          timeCap: ex.timeCap,
                          rounds: ex.rounds,
                          reps: ex.reps,
                          sets: ex.sets,
                        });
                        return (
                          <span
                            key={i}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-(--color_bg_card) text-(--color_text_secondary)"
                          >
                            {ex.name}
                            {brief ? ` · ${brief}` : ''}
                          </span>
                        );
                      })}
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
          <FormField label="Название">
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Название шаблона..."
              className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors"
            />
          </FormField>

          <FormField label="Тип">
            <WorkoutTypeTabs value={templateType} onChange={handleTypeChange} />
          </FormField>

          <FormField
            label={
              <>
                Упражнения
                {templateExercises.length > 0 && (
                  <span className="text-white/40 ml-1">({templateExercises.length})</span>
                )}
              </>
            }
          >
            <WorkoutExercisesEditor
              workoutType={templateType}
              exercises={templateExercises}
              onChange={setTemplateExercises}
              superset={templateType !== 'crossfit'}
            />
          </FormField>

          <FormField label="Описание (опционально)">
            <textarea
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              placeholder="Описание шаблона..."
              rows={2}
              className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors resize-none"
            />
          </FormField>

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
