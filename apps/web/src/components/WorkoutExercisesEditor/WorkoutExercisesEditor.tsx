/**
 * WorkoutExercisesEditor — inline list editor for a workout's exercises.
 * Used by WorkoutInlineForm (scheduling) and TrainerTemplatesScreen (templates).
 *
 * Single-exercise params are rendered via ExerciseParamsEditor (shared with ExerciseDrawer).
 * Reorder: @dnd-kit/sortable. Важно: только sortable-элементы в SortableContext — разделители внутри той же обёртки с ref.
 */
import ExerciseParamsEditor from '@/components/ExerciseParamsEditor/ExerciseParamsEditor';
import ConfirmDeleteButton from '@/components/ui/ConfirmDeleteButton';
import ExercisePicker from '@/components/ExercisePicker/ExercisePicker';
import type { ExerciseData } from '@/api/trainer';
import type { ExerciseWithSets } from '@/types/Exercise';
import type { WorkoutType } from '@/components/WorkoutTypeTabs';
import { useLayoutEffect, useState } from 'react';
import { ArrowsRightLeftIcon, Bars3Icon } from '@heroicons/react/24/outline';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@/lib/workoutListDnd';
import { exerciseWithSetsToExerciseData } from '@/util/workoutExerciseConversions';
import { InsertStartRow } from '@/components/workoutExerciseShared/WorkoutExerciseInsertControls';
import { WorkoutExerciseBetweenRow } from '@/components/workoutExerciseShared/WorkoutExerciseBetweenRow';

interface Props {
  workoutType: WorkoutType;
  exercises: ExerciseData[];
  onChange: (exercises: ExerciseData[]) => void;
  superset?: boolean;
  toolbar?: React.ReactNode;
  profileWeight?: number;
}

export function normalizeExerciseForType(type: WorkoutType, ex: ExerciseData): ExerciseData {
  if (type === 'cardio') return ex;
  if (type === 'crossfit') {
    const { setsDetail: _s, sets: _c, blockId: _b, ...rest } = ex;
    return { ...rest, reps: ex.reps ?? ex.setsDetail?.[0]?.reps ?? 10 };
  }
  if (ex.duration != null) return ex;
  return {
    ...ex,
    setsDetail: ex.setsDetail?.length
      ? ex.setsDetail
      : Array.from({ length: ex.sets ?? 3 }, () => ({ reps: ex.reps ?? 10, weight: ex.weight })),
  };
}

export function normalizeExercisesForType(type: WorkoutType, exs: ExerciseData[]): ExerciseData[] {
  return exs.map((ex) => normalizeExerciseForType(type, ex));
}

function SortableExerciseCard({
  id,
  index,
  ex,
  isInBlock,
  workoutType,
  profileWeight,
  isLast,
  showBetweenRow,
  showSupersetInBetween,
  isLinkedToNext,
  onToggleSuperset,
  onInsertBetween,
  onUpdate,
  onAddSet,
  onRemoveSet,
  onDupSet,
  onUpdateSet,
  onReplace,
  onRemove,
}: {
  id: string;
  index: number;
  ex: ExerciseData;
  isInBlock: boolean;
  workoutType: WorkoutType;
  profileWeight?: number;
  isLast: boolean;
  showBetweenRow: boolean;
  showSupersetInBetween: boolean;
  isLinkedToNext: boolean;
  onToggleSuperset: () => void;
  onInsertBetween: () => void;
  onUpdate: (patch: Partial<ExerciseData>) => void;
  onAddSet: () => void;
  onRemoveSet: (si: number) => void;
  onDupSet: (si: number) => void;
  onUpdateSet: (si: number, field: 'reps' | 'weight', raw: string) => void;
  onReplace: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: transform ? CSS.Transform.toString({ ...transform, x: 0 }) : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative min-w-0 ${isDragging ? 'z-30' : ''}`}
    >
      <div
        className={`rounded-xl min-w-0 border transition-colors ${
          isDragging ? 'opacity-90 shadow-lg ring-1 ring-white/25' : ''
        } ${isInBlock ? 'bg-amber-500/10 border-amber-500/40' : 'bg-white/[0.07] border-white/10'}`}
      >
        <div className="p-3">
          <div className="flex items-center gap-2 min-w-0">
            <button
              ref={setActivatorNodeRef}
              type="button"
              className="shrink-0 p-0.5 rounded text-white/35 hover:text-white/60 cursor-grab active:cursor-grabbing touch-none select-none"
              title="Перетащить"
              {...listeners}
              {...attributes}
            >
              <Bars3Icon className="w-4 h-4" />
            </button>
            <span className="shrink-0 text-[10px] font-mono text-white/30 w-4 text-right tabular-nums">
              {String(index + 1).padStart(2, '0')}
            </span>
            <p className="flex-1 text-sm font-medium text-white leading-snug min-w-0 truncate">{ex.name}</p>
            <button
              type="button"
              onClick={onReplace}
              className="text-white/30 hover:text-emerald-400 transition-colors shrink-0"
              title="Заменить упражнение"
            >
              <ArrowsRightLeftIcon className="w-4 h-4" />
            </button>
            <ConfirmDeleteButton
              icon="x"
              variant="overlay"
              onConfirm={onRemove}
              className="shrink-0"
            />
          </div>

          <div className="mt-2">
            <ExerciseParamsEditor
              workoutType={workoutType}
              duration={ex.duration}
              reps={ex.reps}
              weight={ex.weight}
              distance={ex.distance}
              wodType={ex.wodType}
              timeCap={ex.timeCap}
              rounds={ex.rounds}
              setsDetail={ex.setsDetail}
              bodyweight={ex.bodyweight}
              profileWeight={profileWeight}
              onPatch={(patch) => onUpdate(patch as Partial<ExerciseData>)}
              onAddSet={onAddSet}
              onRemoveSet={onRemoveSet}
              onDupSet={onDupSet}
              onUpdateSet={onUpdateSet}
            />
          </div>

          <textarea
            value={ex.notes ?? ''}
            onChange={(e) => onUpdate({ notes: e.target.value })}
            placeholder="Комментарий тренера: техника, темп..."
            rows={2}
            className="mt-2 w-full text-xs bg-black/20 border border-white/10 rounded-lg px-2.5 py-1.5 text-white/70 placeholder:text-white/25 outline-none focus:border-white/30 resize-none transition-colors leading-relaxed"
          />
        </div>
      </div>

      {showBetweenRow && !isLast && (
        <WorkoutExerciseBetweenRow
          showSuperset={showSupersetInBetween}
          hideSupersetWhileDragging={isDragging}
          isLinkedToNext={isLinkedToNext}
          onToggleSuperset={onToggleSuperset}
          onInsertBetween={onInsertBetween}
        />
      )}
    </div>
  );
}

export default function WorkoutExercisesEditor({
  workoutType,
  exercises,
  onChange,
  superset = true,
  toolbar,
  profileWeight,
}: Props) {
  const [replacingIdx, setReplacingIdx] = useState<number | null>(null);
  const [insertAt, setInsertAt] = useState<number | null>(null);
  const [sortIds, setSortIds] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useLayoutEffect(() => {
    if (exercises.length === 0) {
      setSortIds([]);
      return;
    }
    setSortIds((prev) => {
      if (prev.length === exercises.length) return prev;
      return exercises.map(() => crypto.randomUUID());
    });
  }, [exercises.length]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortIds.indexOf(String(active.id));
    const newIndex = sortIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setSortIds(arrayMove(sortIds, oldIndex, newIndex));
    const splitBlockId = exercises[oldIndex]?.blockId;
    const reordered = arrayMove(exercises, oldIndex, newIndex);
    onChange(
      splitBlockId
        ? reordered.map((ex) =>
            ex.blockId === splitBlockId ? { ...ex, blockId: undefined } : ex
          )
        : reordered
    );
  };

  const handleReplace = (ex: ExerciseWithSets) => {
    if (replacingIdx === null) return;
    onChange(
      exercises.map((old, i) => {
        if (i !== replacingIdx) return old;
        return { ...old, exerciseId: String(ex.exerciseId), name: ex.title };
      })
    );
    setReplacingIdx(null);
  };

  const handleInsertPicked = (ex: ExerciseWithSets) => {
    if (insertAt === null) return;
    const data = exerciseWithSetsToExerciseData(ex, workoutType);
    const next = [...exercises];
    next.splice(insertAt, 0, data);
    onChange(next);
    setInsertAt(null);
  };

  const update = (index: number, patch: Partial<ExerciseData>) => {
    if ('bodyweight' in patch && patch.bodyweight && profileWeight) {
      onChange(
        exercises.map((ex, i) => {
          if (i !== index) return ex;
          return {
            ...ex,
            ...patch,
            setsDetail: (ex.setsDetail ?? []).map((s) => ({ ...s, weight: s.weight ?? profileWeight })),
          };
        })
      );
    } else {
      onChange(exercises.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)));
    }
  };

  const removeExercise = (index: number) => {
    onChange(exercises.filter((_, i) => i !== index));
  };

  const addSet = (exIdx: number) => {
    onChange(
      exercises.map((ex, i) => {
        if (i !== exIdx || ex.duration != null) return ex;
        const detail = ex.setsDetail ?? [];
        const last = detail[detail.length - 1];
        return { ...ex, setsDetail: [...detail, { reps: last?.reps ?? 10, weight: last?.weight }] };
      })
    );
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    onChange(
      exercises.map((ex, i) => {
        if (i !== exIdx || ex.duration != null) return ex;
        const detail = ex.setsDetail ?? [];
        if (detail.length <= 1) return ex;
        return { ...ex, setsDetail: detail.filter((_, si) => si !== setIdx) };
      })
    );
  };

  const dupSet = (exIdx: number, setIdx: number) => {
    onChange(
      exercises.map((ex, i) => {
        if (i !== exIdx || ex.duration != null) return ex;
        const detail = [...(ex.setsDetail ?? [])];
        detail.splice(setIdx + 1, 0, { ...detail[setIdx] });
        return { ...ex, setsDetail: detail };
      })
    );
  };

  const updateSet = (exIdx: number, setIdx: number, field: 'reps' | 'weight', raw: string) => {
    onChange(
      exercises.map((ex, i) => {
        if (i !== exIdx || ex.duration != null) return ex;
        const detail = [...(ex.setsDetail ?? [])];
        const val = field === 'weight' ? parseFloat(raw) : parseInt(raw, 10);
        detail[setIdx] = {
          ...detail[setIdx],
          [field]: raw === '' || isNaN(val) ? undefined : val,
        };
        return { ...ex, setsDetail: detail };
      })
    );
  };

  const toggleLink = (i: number) => {
    const next = exercises.map((ex) => ({ ...ex }));
    const a = next[i];
    const b = next[i + 1];
    if (!a || !b) return;
    if (a.blockId && a.blockId === b.blockId) {
      const bid = a.blockId;
      for (let j = i + 1; j < next.length; j++) {
        if (next[j].blockId === bid) delete next[j].blockId;
        else break;
      }
    } else {
      const newBlockId = a.blockId ?? crypto.randomUUID();
      a.blockId = newBlockId;
      b.blockId = newBlockId;
    }
    onChange(next);
  };

  const handleExercisePicked = (ex: ExerciseWithSets) => {
    const data = exerciseWithSetsToExerciseData(ex, workoutType);
    onChange([...exercises, data]);
  };

  const listReady = exercises.length > 0 && sortIds.length === exercises.length;

  return (
    <div>
      {toolbar}

      {exercises.length > 0 && (
        <div className={toolbar ? 'mt-3' : ''}>
          {listReady ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              modifiers={[restrictToVerticalAxis]}
              onDragEnd={handleDragEnd}
            >
              <InsertStartRow onClick={() => setInsertAt(0)} />
              <SortableContext items={sortIds} strategy={verticalListSortingStrategy}>
                {exercises.map((ex, i) => {
                  const isInBlock = !!ex.blockId;
                  const isLast = i === exercises.length - 1;
                  const isLinkedToNext =
                    superset &&
                    workoutType !== 'crossfit' &&
                    !isLast &&
                    ex.blockId != null &&
                    ex.blockId === exercises[i + 1].blockId;
                  const showSupersetBetween = superset && workoutType !== 'crossfit';

                  return (
                      <SortableExerciseCard
                        key={sortIds[i]}
                        id={sortIds[i]}
                        index={i}
                        ex={ex}
                        isInBlock={isInBlock}
                        workoutType={workoutType}
                        profileWeight={profileWeight}
                        isLast={isLast}
                        showBetweenRow
                        showSupersetInBetween={showSupersetBetween}
                        isLinkedToNext={isLinkedToNext}
                        onToggleSuperset={() => toggleLink(i)}
                        onInsertBetween={() => setInsertAt(i + 1)}
                        onUpdate={(patch) => update(i, patch)}
                        onAddSet={() => addSet(i)}
                        onRemoveSet={(si) => removeSet(i, si)}
                        onDupSet={(si) => dupSet(i, si)}
                        onUpdateSet={(si, field, raw) => updateSet(i, si, field, raw)}
                        onReplace={() => setReplacingIdx(i)}
                        onRemove={() => removeExercise(i)}
                      />
                  );
                })}
              </SortableContext>
            </DndContext>
          ) : null}
        </div>
      )}

      <ExercisePicker onSelect={handleExercisePicked} workoutType={workoutType} />

      {replacingIdx !== null && (
        <ExercisePicker
          open={true}
          onClose={() => setReplacingIdx(null)}
          onSelect={handleReplace}
          workoutType={workoutType}
        />
      )}

      {insertAt !== null && (
        <ExercisePicker
          open={true}
          onClose={() => setInsertAt(null)}
          onSelect={handleInsertPicked}
          workoutType={workoutType}
        />
      )}
    </div>
  );
}
