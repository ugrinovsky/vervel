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
import AccentButton from '@/components/ui/AccentButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AppInput from '@/components/ui/AppInput';
import ConfirmDeleteWrapper from '@/components/ui/ConfirmDeleteWrapper';
import { WORKOUT_TYPE_CONFIG, exerciseBrief } from '@/constants/workoutTypes';
import AiWorkoutGenerator from '@/components/AiWorkoutGenerator/AiWorkoutGenerator';
import AiWorkoutRecognizer from '@/components/AiWorkoutRecognizer/AiWorkoutRecognizer';
import AiWorkoutTextParser from '@/components/AiWorkoutTextParser/AiWorkoutTextParser';
import {
  convertAiExercises,
  convertAiResult,
  convertExercisesForType,
} from '@/components/WorkoutFormBase/workoutTypeConversion';
import type {
  AiRecognizedWorkoutResult,
  AiTextParseUiPayload,
  AiWorkoutResult,
} from '@/api/ai';
import { exerciseIdForDisplay } from '@/utils/exerciseIdForDisplay';

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
  const [aiGenerated, setAiGenerated] = useState(false);

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
    setAiGenerated(false);
    setShowForm(true);
  };

  const openEdit = (template: WorkoutTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateType(template.workoutType);
    setTemplateDescription(template.description || '');
    setTemplateExercises(normalizeExercisesForType(template.workoutType, template.exercises ?? []));
    setAiGenerated(false);
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

  const handleAiGeneratedResult = (result: AiWorkoutResult) => {
    setTemplateType(result.workoutType);
    const converted = normalizeExercisesForType(result.workoutType, convertAiResult(result));
    setTemplateExercises(converted);
    setAiGenerated(true);
    toast.success(`ИИ сгенерировал ${converted.length} упражнений`);
  };

  const handleAiRecognizedResult = (result: AiRecognizedWorkoutResult) => {
    const converted = normalizeExercisesForType(
      templateType,
      convertAiExercises(result.exercises, templateType),
    );
    setTemplateExercises(converted);
    setAiGenerated(true);
    toast.success(`ИИ распознал ${converted.length} упражнений`);
  };

  const handleAiTextParsed = (payload: AiTextParseUiPayload) => {
    const nameMap = new Map(payload.previewItems.map((item) => [item.exerciseId, item.name]));
    const baseConverted: ExerciseData[] = payload.exercises.map((ex: any) => ({
      exerciseId: ex.exerciseId,
      name:
        nameMap.get(ex.exerciseId) ?? exerciseIdForDisplay(String(ex.exerciseId)),
      zones: Array.isArray(ex.zones) ? ex.zones : undefined,
      zoneWeights:
        ex.zoneWeights && typeof ex.zoneWeights === 'object' ? ex.zoneWeights : undefined,
      bodyweight: ex.bodyweight,
      setsDetail: ex.sets?.map((s: any) => ({ reps: s.reps ?? 10, weight: s.weight })) ?? [],
      sets: ex.sets?.length ?? 3,
      blockId: ex.blockId,
      duration: ex.sets?.[0]?.time ? Math.round(Number(ex.sets?.[0]?.time ?? 0) / 60) : undefined,
    }));

    const converted = normalizeExercisesForType(
      templateType,
      convertExercisesForType(baseConverted, 'bodybuilding', templateType),
    );

    setTemplateDescription(payload.sourceText);
    setTemplateExercises(converted);
    setAiGenerated(true);
    if (payload.warning) toast(payload.warning, { icon: '⚠️' });
    else toast.success(`ИИ разобрал ${baseConverted.length} упражнений`);
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
          Шаблон — готовая тренировка. Создайте вручную или с помощью ИИ (фото, текст, запрос), затем
          назначайте атлетам и группам через{' '}
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
            <AccentButton size="sm" onClick={openCreate}>
              <PlusIcon className="w-4 h-4" />
              Создать
            </AccentButton>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <LoadingSpinner size="md" />
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
                <ConfirmDeleteWrapper
                  key={template.id}
                  onConfirm={() => handleDelete(template.id)}

                  className="p-3 bg-(--color_bg_card_hover) hover:bg-(--color_border) transition-colors"
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
                      <ConfirmDeleteWrapper.Trigger />
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
                </ConfirmDeleteWrapper>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Form BottomSheet ── */}
      <BottomSheet
        id="trainer-templates-form"
        open={showForm}
        onClose={closeForm}
        emoji="📋"
        title={editingTemplate ? 'Редактировать шаблон' : 'Новый шаблон'}
      >
        <div className="space-y-4">
          <FormField label="Название">
            <AppInput
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Название шаблона..."
              className="py-2 px-3 rounded-lg"
            />
          </FormField>

          <FormField label="Тип">
            <WorkoutTypeTabs value={templateType} onChange={handleTypeChange} />
          </FormField>

          {templateExercises.length === 0 && (
            <div className="rounded-2xl bg-(--color_bg_card) border border-(--color_border) p-4 space-y-2">
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest mb-1">
                Как добавить упражнения?
              </p>
              <AiWorkoutRecognizer
                onResult={handleAiRecognizedResult}
                triggerClassName="w-full flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-left hover:bg-emerald-500/15 transition-colors"
                triggerContent={
                  <>
                    <span className="text-xl shrink-0">📸</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-white">Распознать изображение</span>
                      <span className="block text-xs text-(--color_text_muted)">ИИ распознаёт по фото</span>
                    </span>
                    <span className="text-emerald-400/60 text-base shrink-0">→</span>
                  </>
                }
              />
              <AiWorkoutTextParser onResult={handleAiTextParsed} />
              <AiWorkoutGenerator
                onResult={handleAiGeneratedResult}
                triggerClassName="w-full flex items-center gap-3 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-left hover:bg-violet-500/15 transition-colors"
                triggerContent={
                  <>
                    <span className="text-xl shrink-0">✨</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-white">Сгенерировать по описанию</span>
                      <span className="block text-xs text-(--color_text_muted)">
                        ИИ подберёт упражнения, подходы и веса
                      </span>
                    </span>
                    <span className="text-violet-400/60 text-base shrink-0">→</span>
                  </>
                }
              />
              <div className="flex items-center gap-3 p-3 rounded-xl bg-(--color_bg_card_hover) border border-(--color_border)">
                <span className="text-xl shrink-0">✏️</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-white/70">Вручную из каталога</span>
                  <span className="block text-xs text-(--color_text_muted)">Добавьте упражнения в списке ниже</span>
                </span>
              </div>
            </div>
          )}

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
              onChange={(exs) => {
                setTemplateExercises(exs);
                setAiGenerated(false);
              }}
              superset={templateType !== 'crossfit'}
              toolbar={
                templateExercises.length > 0 && !aiGenerated ? (
                  <div className="flex flex-wrap gap-3 mb-1">
                    <AiWorkoutRecognizer
                      onResult={handleAiRecognizedResult}
                      triggerContent={
                        <>
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-[13px] leading-none">📸</span>
                            <span>Распознать по фото</span>
                          </span>
                        </>
                      }
                    />
                    <AiWorkoutTextParser
                      onResult={handleAiTextParsed}
                      triggerClassName="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                      triggerContent={
                        <>
                          <span>📝</span>
                          Распознать по тексту
                        </>
                      }
                    />
                    <AiWorkoutGenerator onResult={handleAiGeneratedResult} />
                    <span className="text-xs text-white/40 self-center">· 10₽</span>
                  </div>
                ) : undefined
              }
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

          <AccentButton
            onClick={handleSave}
            disabled={saving}
            loading={saving}
            loadingText="Сохранение..."
          >
            {editingTemplate ? 'Сохранить изменения' : 'Создать шаблон'}
          </AccentButton>
        </div>
      </BottomSheet>
    </Screen>
  );
}
