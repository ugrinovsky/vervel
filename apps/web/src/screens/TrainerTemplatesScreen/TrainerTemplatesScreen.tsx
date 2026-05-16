import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import ScreenHint from '@/components/ScreenHint/ScreenHint';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import FormField from '@/components/FormField';
import WorkoutTypeTabs, { type WorkoutType } from '@/components/WorkoutTypeTabs';
import WorkoutExercisesEditor from '@/components/WorkoutExercisesEditor/WorkoutExercisesEditor';
import { normalizeExercisesForType } from '@/components/WorkoutExercisesEditor/normalizeForWorkoutType';
import {
  trainerApi,
  type WorkoutTemplate,
  type ExerciseData,
  type TrainerCustomExercise,
} from '@/api/trainer';
import { useNavigate } from 'react-router';
import { PlusIcon, PencilIcon } from '@heroicons/react/24/outline';
import AccentButton from '@/components/ui/AccentButton';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AppInput from '@/components/ui/AppInput';
import ConfirmDeleteWrapper from '@/components/ui/ConfirmDeleteWrapper';
import { WORKOUT_TYPE_CONFIG } from '@/constants/workoutTypes';
import AiWorkoutGenerator from '@/components/AiWorkoutGenerator/AiWorkoutGenerator';
import AiWorkoutRecognizer from '@/components/AiWorkoutRecognizer/AiWorkoutRecognizer';
import AiWorkoutTextParser from '@/components/AiWorkoutTextParser/AiWorkoutTextParser';
import {
  convertAiExercises,
  convertAiResult,
  convertExercisesForType,
} from '@/components/WorkoutFormBase/workoutTypeConversion';
import type {
  AiParsedWorkoutExercisePayload,
  AiRecognizedWorkoutResult,
  AiTextParseUiPayload,
  AiWorkoutResult,
} from '@/api/ai';
import { exerciseIdForDisplay } from '@/utils/exerciseIdForDisplay';
import SectionGroup from '@/components/ui/SectionGroup';
import ScreenLinks from '@/components/ScreenLinks/ScreenLinks';
import Tabs from '@/components/ui/Tabs';
import { useTrainerCabinetRedirect } from '@/hooks/useTrainerCabinetRedirect';

/* ------------------------------------------------------------------ */
/* Template tab                                                         */
/* ------------------------------------------------------------------ */

function TemplatesTab() {
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

  async function loadTemplates() {
    try {
      setLoading(true);
      const response = await trainerApi.getWorkoutTemplates();
      setTemplates(response.data.data);
    } catch {
      toast.error('Ошибка загрузки шаблонов');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTemplates();
  }, []);

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
      convertAiExercises(result.exercises, templateType)
    );
    setTemplateExercises(converted);
    setAiGenerated(true);
    toast.success(`ИИ распознал ${converted.length} упражнений`);
  };

  const handleAiTextParsed = (payload: AiTextParseUiPayload) => {
    const nameMap = new Map(payload.previewItems.map((item) => [item.exerciseId, item.name]));
    const baseConverted: ExerciseData[] = payload.exercises.map(
      (ex: AiParsedWorkoutExercisePayload) => ({
        exerciseId: ex.exerciseId,
        name: nameMap.get(ex.exerciseId) ?? exerciseIdForDisplay(String(ex.exerciseId)),
        zones: Array.isArray(ex.zones) ? ex.zones : undefined,
        zoneWeights:
          ex.zoneWeights && typeof ex.zoneWeights === 'object' ? ex.zoneWeights : undefined,
        bodyweight: ex.bodyweight,
        setsDetail: ex.sets?.map((s) => ({ reps: s.reps ?? 10, weight: s.weight })) ?? [],
        sets: ex.sets?.length ?? 3,
        blockId: ex.blockId,
        duration: ex.sets?.[0]?.time ? Math.round(Number(ex.sets?.[0]?.time ?? 0) / 60) : undefined,
      })
    );

    const converted = normalizeExercisesForType(
      templateType,
      convertExercisesForType(baseConverted, 'bodybuilding', templateType)
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
    <>
      <SectionGroup showLabel={false} showBreakAfter={false} bodyClassName="space-y-4">
        <ScreenHint>
          Шаблон — готовая тренировка. Создайте вручную или с помощью ИИ (фото, текст, запрос),
          затем назначайте атлетам и группам через{' '}
          <button
            onClick={() => navigate('/trainer/calendar')}
            className="text-white font-medium underline underline-offset-2 hover:no-underline"
          >
            Календарь
          </button>{' '}
          — не нужно каждый раз вводить упражнения заново.
        </ScreenHint>
      </SectionGroup>

      <SectionGroup
        title="Все шаблоны"
        showBreakAfter={false}
        action={
          <AccentButton size="sm" onClick={openCreate}>
            <PlusIcon className="w-4 h-4" />
            Создать
          </AccentButton>
        }
      >
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {loading ? (
            <div className="flex justify-center py-6">
              <LoadingSpinner size="md" />
            </div>
          ) : templates.length === 0 ? (
            <div className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border) space-y-3">
              <div className="text-center">
                <div className="text-3xl mb-2">📋</div>
                <p className="text-sm font-medium text-white mb-1">Пока нет шаблонов</p>
                <p className="text-xs text-(--color_text_muted)">
                  Шаблон — это готовая тренировка, которую можно быстро назначить любому атлету или
                  группе
                </p>
              </div>
              <div className="space-y-2 pt-1">
                {[
                  { emoji: '1️⃣', text: 'Нажмите «Создать» и добавьте упражнения в шаблон' },
                  {
                    emoji: '2️⃣',
                    text: 'Откройте Календарь и назначьте шаблон атлету или группе на нужную дату',
                  },
                  {
                    emoji: '3️⃣',
                    text: 'Атлет увидит тренировку в своём расписании в разделе «Моя команда»',
                  },
                ].map(({ emoji, text }) => (
                  <div
                    key={emoji}
                    className="flex items-start gap-2 text-xs text-(--color_text_muted)"
                  >
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
                  rounded="rounded-2xl"
                  className="p-4 bg-(--color_bg_card) hover:bg-(--color_bg_card_hover) transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-(--color_primary_light)/15 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-lg">
                        {{
                          crossfit: '🏋️',
                          bodybuilding: '💪',
                          cardio: '🏃',
                          intro: '👋',
                        }[template.workoutType] ?? '📋'}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-white truncate leading-snug">
                            {template.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 leading-none">
                            <span className="text-xs text-(--color_text_muted)">
                              {WORKOUT_TYPE_CONFIG[template.workoutType] ?? template.workoutType}
                            </span>
                            {template.exercises?.length > 0 && (
                              <>
                                <span className="text-(--color_text_muted) opacity-40">·</span>
                                <span className="text-xs text-(--color_text_muted)">
                                  {template.exercises.length} упр.
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 -mr-1.5 -mt-0.5 shrink-0">
                          <button
                            onClick={() => openEdit(template)}
                            className="p-1.5 text-(--color_text_muted) hover:text-white transition-colors rounded-lg hover:bg-white/5"
                            title="Редактировать"
                          >
                            <PencilIcon className="w-3.5 h-3.5" />
                          </button>
                          <ConfirmDeleteWrapper.Trigger />
                        </div>
                      </div>
                      {template.exercises?.length > 0 && (
                        <p className="mt-0.5 text-[11px] text-(--color_text_muted) truncate">
                          {template.exercises
                            .slice(0, 5)
                            .map((ex) => ex.name)
                            .join(' · ')}
                          {template.exercises.length > 5
                            ? ` · +${template.exercises.length - 5}`
                            : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </ConfirmDeleteWrapper>
              ))}
            </div>
          )}
        </motion.div>
      </SectionGroup>

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
                      <span className="block text-sm font-medium text-white">
                        Распознать изображение
                      </span>
                      <span className="block text-xs text-(--color_text_muted)">
                        ИИ распознаёт по фото
                      </span>
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
                      <span className="block text-sm font-medium text-white">
                        Сгенерировать по описанию
                      </span>
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
                  <span className="block text-sm font-medium text-white/70">
                    Вручную из каталога
                  </span>
                  <span className="block text-xs text-(--color_text_muted)">
                    Добавьте упражнения в списке ниже
                  </span>
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
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Exercises tab                                                        */
/* ------------------------------------------------------------------ */

function ExercisesTab() {
  const [exercises, setExercises] = useState<TrainerCustomExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExercise, setEditingExercise] = useState<TrainerCustomExercise | null>(null);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadExercises() {
    try {
      setLoading(true);
      const res = await trainerApi.listCustomExercises();
      setExercises(res.data.data);
    } catch {
      toast.error('Ошибка загрузки упражнений');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadExercises();
  }, []);

  const openCreate = () => {
    setEditingExercise(null);
    setName('');
    setNotes('');
    setShowForm(true);
  };

  const openEdit = (ex: TrainerCustomExercise) => {
    setEditingExercise(ex);
    setName(ex.name);
    setNotes(ex.notes ?? '');
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Укажите название');
      return;
    }
    try {
      setSaving(true);
      const payload = { name: name.trim(), notes: notes.trim() || null };
      if (editingExercise) {
        await trainerApi.updateCustomExercise(editingExercise.id, payload);
        toast.success('Упражнение обновлено');
      } else {
        await trainerApi.createCustomExercise(payload);
        toast.success('Упражнение добавлено');
      }
      setShowForm(false);
      loadExercises();
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await trainerApi.deleteCustomExercise(id);
      toast.success('Упражнение удалено');
      loadExercises();
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  return (
    <>
      <SectionGroup showLabel={false} showBreakAfter={false} bodyClassName="space-y-4">
        <ScreenHint>
          Кастомные упражнения — те, которых нет в каталоге. Добавьте их здесь, и они будут доступны
          при составлении тренировок и шаблонов.
        </ScreenHint>
      </SectionGroup>

      <SectionGroup title="Мои упражнения" showBreakAfter={false}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border)"
        >
          <div className="flex justify-end mb-4">
            <AccentButton size="sm" onClick={openCreate}>
              <PlusIcon className="w-4 h-4" />
              Добавить
            </AccentButton>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <LoadingSpinner size="md" />
            </div>
          ) : exercises.length === 0 ? (
            <div className="py-6 text-center space-y-2">
              <div className="text-3xl mb-2">✏️</div>
              <p className="text-sm font-medium text-white mb-1">Нет кастомных упражнений</p>
              <p className="text-xs text-(--color_text_muted)">
                Добавьте упражнения, которых нет в каталоге — они появятся в пикере при составлении
                тренировок
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {exercises.map((ex) => (
                <ConfirmDeleteWrapper
                  key={ex.id}
                  onConfirm={() => handleDelete(ex.id)}
                  className="p-3 bg-(--color_bg_card_hover) hover:bg-(--color_border) transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-white truncate block">
                        {ex.name}
                      </span>
                      {ex.notes && (
                        <span className="text-xs text-(--color_text_muted) mt-0.5 truncate block">
                          {ex.notes}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <button
                        onClick={() => openEdit(ex)}
                        className="p-1.5 text-(--color_text_muted) hover:text-white transition-colors"
                        title="Редактировать"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <ConfirmDeleteWrapper.Trigger />
                    </div>
                  </div>
                </ConfirmDeleteWrapper>
              ))}
            </div>
          )}
        </motion.div>
      </SectionGroup>

      <BottomSheet
        id="trainer-custom-exercise-form"
        open={showForm}
        onClose={closeForm}
        emoji="✏️"
        title={editingExercise ? 'Редактировать упражнение' : 'Новое упражнение'}
      >
        <div className="space-y-4">
          <FormField label="Название">
            <AppInput
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название упражнения..."
              className="py-2 px-3 rounded-lg"
            />
          </FormField>

          <FormField label="Заметка (опционально)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Техника выполнения, особенности..."
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
            {editingExercise ? 'Сохранить изменения' : 'Добавить упражнение'}
          </AccentButton>
        </div>
      </BottomSheet>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                               */
/* ------------------------------------------------------------------ */

type TabId = 'templates' | 'exercises';

export default function TrainerTemplatesScreen() {
  useTrainerCabinetRedirect('templates');
  const [activeTab, setActiveTab] = useState<TabId>('templates');

  return (
    <Screen className="trainer-templates-screen">
      <div className="p-4 w-full mx-auto">
        <SectionGroup showLabel={false} showBreakAfter={false} bodyClassName="space-y-4">
          <ScreenHeader
            icon="📋"
            title="Шаблоны"
            description="Заготовки тренировок и ваши упражнения"
          />
          <Tabs
            active={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: 'templates', label: '📋 Тренировки' },
              { id: 'exercises', label: '✏️ Упражнения' },
            ]}
          />
        </SectionGroup>

        {activeTab === 'templates' ? <TemplatesTab /> : <ExercisesTab />}

        <SectionGroup title="Ещё" showBreakAfter={false}>
          <ScreenLinks
            links={[
              {
                emoji: '📅',
                bg: 'bg-emerald-500/20',
                label: 'Календарь',
                sub: 'Назначить тренировки',
                to: '/trainer/calendar',
              },
              {
                emoji: '🏋️',
                bg: 'bg-blue-500/20',
                label: 'Команда',
                sub: 'Атлеты и группы',
                to: '/trainer/athletes',
              },
              {
                emoji: '🗂️',
                bg: 'bg-rose-500/20',
                label: 'CRM',
                sub: 'Заявки и аналитика',
                to: '/trainer/crm',
              },
            ]}
          />
        </SectionGroup>
      </div>
    </Screen>
  );
}
