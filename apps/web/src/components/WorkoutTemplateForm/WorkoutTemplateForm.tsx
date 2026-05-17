import { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import AppInput from '@/components/ui/AppInput';
import AccentButton from '@/components/ui/AccentButton';
import SectionLabel from '@/components/SectionLabel';
import WorkoutTypeTabs, { type WorkoutType } from '@/components/WorkoutTypeTabs';
import WorkoutExercisesEditor, {
  type WorkoutExercisesEditorHandle,
} from '@/components/WorkoutExercisesEditor/WorkoutExercisesEditor';
import { normalizeExercisesForType } from '@/components/WorkoutExercisesEditor/normalizeForWorkoutType';
import { convertExercisesForType } from '@/components/WorkoutFormBase/workoutTypeConversion';
import AiWorkoutGenerator from '@/components/AiWorkoutGenerator/AiWorkoutGenerator';
import AiWorkoutRecognizer from '@/components/AiWorkoutRecognizer/AiWorkoutRecognizer';
import AiWorkoutTextParser from '@/components/AiWorkoutTextParser/AiWorkoutTextParser';
import WorkoutAiEmptyState from '@/components/WorkoutAiEmptyState/WorkoutAiEmptyState';
import { exerciseIdForDisplay } from '@/utils/exerciseIdForDisplay';
import type { ExerciseData } from '@/api/trainer';
import type {
  AiParsedWorkoutExercisePayload,
  AiRecognizedWorkoutResult,
  AiTextParseUiPayload,
  AiWorkoutResult,
} from '@/api/ai';

export interface WorkoutTemplateFormData {
  name: string;
  workoutType: WorkoutType;
  exercises: ExerciseData[];
  description: string;
}

interface Props {
  initial?: Partial<WorkoutTemplateFormData>;
  isEditing?: boolean;
  saving?: boolean;
  onSave: (data: WorkoutTemplateFormData) => void | Promise<void>;
}

export default function WorkoutTemplateForm({
  initial,
  isEditing = false,
  saving = false,
  onSave,
}: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [workoutType, setWorkoutType] = useState<WorkoutType>(
    initial?.workoutType ?? 'bodybuilding'
  );
  const [exercises, setExercises] = useState<ExerciseData[]>(initial?.exercises ?? []);
  const [description, setDescription] = useState(initial?.description ?? '');
  const [aiGenerated, setAiGenerated] = useState(false);
  const editorRef = useRef<WorkoutExercisesEditorHandle>(null);

  const handleTypeChange = (newType: WorkoutType) => {
    setWorkoutType(newType);
    if (exercises.length > 0) {
      setExercises(normalizeExercisesForType(newType, exercises));
    }
  };

  const handleAiGeneratedResult = (result: AiWorkoutResult) => {
    const { workoutType: newType } = result;
    const converted = normalizeExercisesForType(newType, result.exercises as ExerciseData[]);
    setWorkoutType(newType);
    setExercises(converted);
    setAiGenerated(true);
    toast.success(`ИИ сгенерировал ${converted.length} упражнений`);
  };

  const handleAiRecognizedResult = (result: AiRecognizedWorkoutResult) => {
    const converted = normalizeExercisesForType(workoutType, result.exercises as ExerciseData[]);
    setExercises(converted);
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
      workoutType,
      convertExercisesForType(baseConverted, 'bodybuilding', workoutType)
    );
    setDescription(payload.sourceText);
    setExercises(converted);
    setAiGenerated(true);
    if (payload.warning) toast(payload.warning, { icon: '⚠️' });
    else toast.success(`ИИ разобрал ${baseConverted.length} упражнений`);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Укажите название шаблона');
      return;
    }
    void onSave({ name, workoutType, exercises, description });
  };

  return (
    <div className="space-y-4">
      <div>
        <SectionLabel>Название</SectionLabel>
        <AppInput
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название шаблона..."
        />
      </div>

      <div>
        <SectionLabel>Тип тренировки</SectionLabel>
        <WorkoutTypeTabs value={workoutType} onChange={handleTypeChange} />
      </div>

      {exercises.length === 0 && (
        <WorkoutAiEmptyState
          onAiGenerated={handleAiGeneratedResult}
          onAiRecognized={handleAiRecognizedResult}
          onAiTextParsed={handleAiTextParsed}
          onOpenCatalog={() => editorRef.current?.openExercisePicker()}
          onOpenCustom={() => editorRef.current?.openCustomPicker()}
        />
      )}

      <div>
        <SectionLabel>
          Упражнения
          {exercises.length > 0 && <span className="text-white/40 ml-1">({exercises.length})</span>}
        </SectionLabel>
        <WorkoutExercisesEditor
          ref={editorRef}
          workoutType={workoutType}
          exercises={exercises}
          onChange={(exs) => {
            setExercises(exs);
            setAiGenerated(false);
          }}
          superset={workoutType !== 'crossfit'}
          toolbar={
            exercises.length > 0 && !aiGenerated ? (
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
                <span className="text-xs text-white/40 self-center">· 10₽</span>
              </div>
            ) : undefined
          }
        />
      </div>

      <div>
        <SectionLabel>Описание (опционально)</SectionLabel>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Описание шаблона..."
          rows={2}
          className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors resize-none placeholder:text-(--color_text_muted)"
        />
      </div>

      <AccentButton
        onClick={handleSave}
        disabled={saving}
        loading={saving}
        loadingText="Сохранение..."
      >
        {isEditing ? 'Сохранить изменения' : 'Создать шаблон'}
      </AccentButton>
    </div>
  );
}
