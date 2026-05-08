import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import FormField from '@/components/FormField';
import WorkoutTypeTabs, { type WorkoutType } from '@/components/WorkoutTypeTabs';
import WorkoutExercisesEditor from '@/components/WorkoutExercisesEditor/WorkoutExercisesEditor';
import { normalizeExercisesForType } from '@/components/WorkoutExercisesEditor/normalizeForWorkoutType';
import { trainerApi, type WorkoutTemplate, type ExerciseData } from '@/api/trainer';
import { PlusIcon, PencilIcon } from '@heroicons/react/24/outline';
import AccentButton from '@/components/ui/AccentButton';
import AppInput from '@/components/ui/AppInput';
import AiWorkoutGenerator from '@/components/AiWorkoutGenerator/AiWorkoutGenerator';
import AiWorkoutRecognizer from '@/components/AiWorkoutRecognizer/AiWorkoutRecognizer';
import AiWorkoutTextParser from '@/components/AiWorkoutTextParser/AiWorkoutTextParser';
import {
  convertAiExercises,
  convertAiResult,
  convertExercisesForType,
} from '@/components/WorkoutFormBase/workoutTypeConversion';
import { exerciseIdForDisplay } from '@/utils/exerciseIdForDisplay';
import type {
  AiParsedWorkoutExercisePayload,
  AiRecognizedWorkoutResult,
  AiTextParseUiPayload,
  AiWorkoutResult,
} from '@/api/ai';

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
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState<WorkoutType>('bodybuilding');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateExercises, setTemplateExercises] = useState<ExerciseData[]>([]);
  const [saving, setSaving] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);

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
    setTemplateName('');
    setTemplateType('bodybuilding');
    setTemplateDescription('');
    setTemplateExercises([]);
    setAiGenerated(false);
    setShowForm(true);
  };

  const openEdit = (t: WorkoutTemplate) => {
    setEditingTemplate(t);
    setTemplateName(t.name);
    setTemplateType(t.workoutType);
    setTemplateDescription(t.description ?? '');
    setTemplateExercises(normalizeExercisesForType(t.workoutType, t.exercises ?? []));
    setAiGenerated(false);
    setShowForm(true);
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
    setSaving(true);
    try {
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
                <button
                  key={t.id}
                  onClick={() => openEdit(t)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors text-left"
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
                </button>
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
                  </>
                }
              />
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
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-[13px] leading-none">📸</span>
                          <span>Распознать по фото</span>
                        </span>
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
                  </div>
                ) : undefined
              }
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
