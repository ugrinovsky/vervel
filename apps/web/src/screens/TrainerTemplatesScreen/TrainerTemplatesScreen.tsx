import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import { trainerApi, type WorkoutTemplate, type ExerciseData } from '@/api/trainer';
import { exercisesApi } from '@/api/exercises';
import type { Exercise } from '@/types/Exercise';
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

  // Exercise picker state
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [showExPicker, setShowExPicker] = useState(false);
  const [exSearch, setExSearch] = useState('');
  const [selectedEx, setSelectedEx] = useState<Exercise | null>(null);
  const [exSets, setExSets] = useState(3);
  const [exReps, setExReps] = useState(10);
  const [exWeight, setExWeight] = useState(0);
  const [exDuration, setExDuration] = useState(20);
  const [exHighlight, setExHighlight] = useState(-1);
  const listboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTemplates();
    exercisesApi.list().then((res) => setAllExercises(res ?? []));
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
    setShowExPicker(false);
    setShowForm(true);
  };

  const openEdit = (template: WorkoutTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateType(template.workoutType);
    setTemplateDescription(template.description || '');
    setTemplateExercises(template.exercises ?? []);
    setShowExPicker(false);
    setShowForm(true);
  };

  const filteredExercises = allExercises.filter((ex) =>
    ex.title.toLowerCase().includes(exSearch.toLowerCase())
  );

  const addExercise = () => {
    if (!selectedEx) return;
    const ex: ExerciseData =
      templateType === 'cardio'
        ? { exerciseId: selectedEx.id, name: selectedEx.title, duration: exDuration }
        : { exerciseId: selectedEx.id, name: selectedEx.title, sets: exSets, reps: exReps, weight: exWeight || undefined };
    setTemplateExercises((prev) => [...prev, ex]);
    setShowExPicker(false);
    setSelectedEx(null);
    setExSearch('');
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
    <Screen>
      <div className="p-4 w-full max-w-2xl mx-auto">
        <ScreenHeader icon="📋" title="Шаблоны" description="Шаблоны тренировок" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-(--color_bg_card) rounded-xl p-4 border border-(--color_border) text-center mb-6"
        >
          <div className="text-2xl font-bold text-white">{templates.length}</div>
          <div className="text-xs text-(--color_text_muted) mt-1">Шаблонов</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-(--color_bg_card) rounded-2xl p-5 border border-(--color_border)"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Все шаблоны</h2>
            {!showForm && (
              <button
                onClick={openCreate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--color_primary_light) text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <PlusIcon className="w-4 h-4" />
                Создать
              </button>
            )}
          </div>

          {/* Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-4 bg-(--color_bg_card_hover) rounded-xl border border-(--color_border) overflow-hidden"
              >
                <h3 className="text-sm font-semibold text-white mb-3">
                  {editingTemplate ? 'Редактировать шаблон' : 'Новый шаблон'}
                </h3>
                <div className="space-y-3">
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
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-white">
                        Упражнения
                        {templateExercises.length > 0 && (
                          <span className="text-(--color_text_muted) ml-1">({templateExercises.length})</span>
                        )}
                      </label>
                      {!showExPicker && (
                        <button
                          onClick={() => setShowExPicker(true)}
                          className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          <PlusIcon className="w-3 h-3" />
                          Добавить
                        </button>
                      )}
                    </div>

                    {/* Exercise list */}
                    {templateExercises.length > 0 && (
                      <div className="mb-2 space-y-1">
                        {templateExercises.map((ex, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-3 py-2 rounded-lg bg-(--color_bg_card) border-l-2 border-transparent"
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
                    )}

                    {/* Exercise picker */}
                    {showExPicker && (
                      <div className="rounded-xl bg-(--color_bg_card) p-3 space-y-2 border border-(--color_border)">
                        <input
                          type="text"
                          value={exSearch}
                          onChange={(e) => {
                            setExSearch(e.target.value);
                            setSelectedEx(null);
                            setExHighlight(-1);
                          }}
                          placeholder="Поиск упражнения..."
                          autoFocus
                          className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-(--color_primary_light) transition-colors placeholder:text-(--color_text_muted)"
                          onKeyDown={(e) => {
                            const list = filteredExercises.slice(0, 8);
                            if (!exSearch || selectedEx) return;
                            if (e.key === 'ArrowDown') {
                              e.preventDefault();
                              const next = Math.min(exHighlight + 1, list.length - 1);
                              setExHighlight(next);
                              listboxRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
                            } else if (e.key === 'ArrowUp') {
                              e.preventDefault();
                              const next = Math.max(exHighlight - 1, 0);
                              setExHighlight(next);
                              listboxRef.current?.children[next]?.scrollIntoView({ block: 'nearest' });
                            } else if (e.key === 'Enter' && exHighlight >= 0) {
                              e.preventDefault();
                              const picked = list[exHighlight];
                              if (picked) { setSelectedEx(picked); setExSearch(picked.title); }
                            } else if (e.key === 'Escape') {
                              setShowExPicker(false);
                              setSelectedEx(null);
                              setExSearch('');
                              setExHighlight(-1);
                            }
                          }}
                        />

                        {exSearch && !selectedEx && (
                          <div
                            ref={listboxRef}
                            className="max-h-36 overflow-y-auto rounded-lg bg-(--color_bg_card_hover) divide-y divide-(--color_border)"
                          >
                            {filteredExercises.length === 0 ? (
                              <div className="text-xs text-(--color_text_muted) text-center py-3">Не найдено</div>
                            ) : (
                              filteredExercises.slice(0, 8).map((ex, idx) => (
                                <button
                                  key={ex.id}
                                  onClick={() => { setSelectedEx(ex); setExSearch(ex.title); setExHighlight(-1); }}
                                  className={`w-full text-left px-3 py-2 text-sm text-white transition-colors ${
                                    idx === exHighlight ? 'bg-(--color_primary_light)' : 'hover:bg-(--color_bg_card)'
                                  }`}
                                >
                                  {ex.title}
                                </button>
                              ))
                            )}
                          </div>
                        )}

                        {selectedEx && (
                          templateType === 'cardio' ? (
                            <div>
                              <label className="text-[10px] text-(--color_text_muted) mb-1 block">Длительность (мин)</label>
                              <input
                                type="number"
                                value={exDuration}
                                min={1}
                                onChange={(e) => setExDuration(+e.target.value)}
                                onClick={(e) => e.currentTarget.select()}
                                className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-lg px-3 py-1.5 text-white text-sm outline-none"
                              />
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-[10px] text-(--color_text_muted) mb-1 block">Подходы</label>
                                <input type="number" value={exSets} min={0} onChange={(e) => setExSets(+e.target.value)} onClick={(e) => e.currentTarget.select()} className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-lg px-3 py-1.5 text-white text-sm outline-none" />
                              </div>
                              <div>
                                <label className="text-[10px] text-(--color_text_muted) mb-1 block">Повторы</label>
                                <input type="number" value={exReps} min={0} onChange={(e) => setExReps(+e.target.value)} onClick={(e) => e.currentTarget.select()} className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-lg px-3 py-1.5 text-white text-sm outline-none" />
                              </div>
                              <div>
                                <label className="text-[10px] text-(--color_text_muted) mb-1 block">Вес кг</label>
                                <input type="number" value={exWeight} min={0} step={2.5} onChange={(e) => setExWeight(+e.target.value)} onClick={(e) => e.currentTarget.select()} className="w-full bg-(--color_bg_input) border border-(--color_border) rounded-lg px-3 py-1.5 text-white text-sm outline-none" />
                              </div>
                            </div>
                          )
                        )}

                        <div className="flex gap-2">
                          <button
                            onClick={addExercise}
                            disabled={!selectedEx}
                            className="flex-1 py-1.5 rounded-lg bg-(--color_primary_light) text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
                          >
                            Добавить
                          </button>
                          <button
                            onClick={() => { setShowExPicker(false); setSelectedEx(null); setExSearch(''); }}
                            className="px-3 py-1.5 rounded-lg bg-(--color_bg_card_hover) text-(--color_text_muted) text-sm hover:text-white transition-colors"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

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

                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 py-2 rounded-lg bg-(--color_primary_light) text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {saving ? 'Сохранение...' : editingTemplate ? 'Сохранить' : 'Создать'}
                    </button>
                    <button
                      onClick={() => setShowForm(false)}
                      disabled={saving}
                      className="px-4 py-2 rounded-lg bg-(--color_bg_card) text-(--color_text_muted) text-sm hover:text-white transition-colors disabled:opacity-50"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* List */}
          {loading ? (
            <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-white/20 border-t-(--color_primary_light) rounded-full animate-spin" /></div>
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

                  {/* Exercises preview */}
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
    </Screen>
  );
}
