import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Screen from '@/components/Screen/Screen';
import ScreenHeader from '@/components/ScreenHeader/ScreenHeader';
import BackButton from '@/components/BackButton/BackButton';
import AnimatedBlock from '@/components/ui/AnimatedBlock';
import { cardClass } from '@/components/ui/Card';
import ExercisePicker from '@/components/ExercisePicker/ExercisePicker';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import {
  athleteApi,
  type ExerciseDashboardMetric,
  type ExerciseDashboardPayload,
  type WeightedExerciseOption,
} from '@/api/athlete';
import type { ExerciseWithSets } from '@/types/Exercise';

/** Пресеты под силовое троеборье и олимпийские движения (id из каталога). */
const DASHBOARD_PRESETS: { label: string; ids: string[] }[] = [
  {
    label: 'Сила: жим, присед, становая',
    ids: ['Barbell_Bench_Press_-_Medium_Grip', 'Barbell_Full_Squat', 'Barbell_Deadlift'],
  },
  {
    label: 'Кроссфит / олимп: рывок, пуш-пресс, толчок',
    ids: ['Power_Snatch', 'Push_Press', 'Clean_and_Jerk'],
  },
];

function formatShortDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function MetricCard({ m }: { m: ExerciseDashboardMetric }) {
  const delta =
    m.changePct !== null ? (
      <span
        className={
          m.changePct > 0
            ? 'text-emerald-400'
            : m.changePct < 0
              ? 'text-rose-400'
              : 'text-(--color_text_muted)'
        }
      >
        {m.changePct > 0 ? '+' : ''}
        {m.changePct}%
      </span>
    ) : (
      <span className="text-(--color_text_muted)">—</span>
    );

  return (
    <div className={`${cardClass} rounded-2xl p-4 space-y-3`}>
      <div className="text-sm font-bold text-white leading-snug">{m.exerciseName}</div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <div className="text-(--color_text_muted) mb-0.5">Лучший 1RM (30 дн)</div>
          <div className="text-lg font-bold text-(--color_primary_light)">
            {m.best1RMLast30d !== null ? `${m.best1RMLast30d} кг` : '—'}
          </div>
        </div>
        <div>
          <div className="text-(--color_text_muted) mb-0.5 leading-snug">
            <span className="block">Изменение 1RM в %</span>
            <span className="block">к предыдущим 30 дням</span>
          </div>
          <div className="text-lg font-semibold text-white">{delta}</div>
        </div>
        <div>
          <div className="text-(--color_text_muted) mb-0.5">Сессий (30 дн)</div>
          <div className="text-white font-medium">{m.sessionsLast30d}</div>
        </div>
        <div>
          <div className="text-(--color_text_muted) mb-0.5">Последний раз</div>
          <div className="text-white font-medium">{formatShortDate(m.lastWorkedAt)}</div>
        </div>
      </div>
    </div>
  );
}

export default function ExerciseDashboardScreen({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const [payload, setPayload] = useState<ExerciseDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draftIds, setDraftIds] = useState<string[]>([]);
  const [draftLabels, setDraftLabels] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState('');

  const load = useCallback(() => {
    return athleteApi
      .getExerciseDashboard()
      .then((res) => {
        if (res.data.success) setPayload(res.data.data);
      })
      .catch(() => toast.error('Не удалось загрузить дашборд'));
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (editing && payload) {
      setDraftIds([...payload.trackedExerciseIds]);
      const labels: Record<string, string> = {};
      for (const m of payload.metrics) {
        labels[m.exerciseId] = m.exerciseName;
      }
      setDraftLabels(labels);
    }
  }, [editing, payload]);

  const nameById = (id: string) =>
    draftLabels[id] ??
    payload?.metrics.find((m) => m.exerciseId === id)?.exerciseName ??
    id.replace(/_/g, ' ');

  const saveDraft = async () => {
    setSaving(true);
    try {
      const res = await athleteApi.putExerciseDashboard(draftIds);
      if (res.data.success) {
        setPayload(res.data.data);
        setEditing(false);
        toast.success('Дашборд сохранён');
      }
    } catch {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (presetIds: string[]) => {
    setDraftIds((prev) => {
      const merged: string[] = [];
      const seen = new Set<string>();
      for (const id of [...prev, ...presetIds]) {
        if (seen.has(id)) continue;
        seen.add(id);
        merged.push(id);
        if (merged.length >= 12) break;
      }
      return merged;
    });
    setDraftLabels((labs) => {
      const next = { ...labs };
      for (const id of presetIds) {
        if (!next[id]) next[id] = id.replace(/_/g, ' ');
      }
      return next;
    });
  };

  const removeDraftId = (id: string) => {
    setDraftIds((prev) => prev.filter((x) => x !== id));
    setDraftLabels((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const onPickerSelect = (ex: ExerciseWithSets) => {
    const id = String(ex.exerciseId);
    setDraftIds((prev) => {
      if (prev.includes(id) || prev.length >= 12) return prev;
      return [...prev, id];
    });
    setDraftLabels((prev) => ({ ...prev, [id]: ex.title }));
    setPickerOpen(false);
  };

  const weightedExerciseOptions = payload?.weightedExerciseOptions ?? [];
  const historyFiltered = historySearch.trim()
    ? weightedExerciseOptions.filter((o) =>
        o.exerciseName.toLowerCase().includes(historySearch.trim().toLowerCase()),
      )
    : weightedExerciseOptions;

  const addFromHistory = (opt: WeightedExerciseOption) => {
    const id = opt.exerciseId;
    setDraftIds((prev) => {
      if (prev.includes(id) || prev.length >= 12) return prev;
      return [...prev, id];
    });
    setDraftLabels((prev) => ({ ...prev, [id]: opt.exerciseName }));
    setHistoryOpen(false);
    setHistorySearch('');
  };

  const metrics = payload?.metrics ?? [];
  const showEmpty = !loading && metrics.length === 0 && !editing;

  const inner = (
    <div className={`w-full space-y-4 ${embedded ? '' : 'p-4 max-w-lg mx-auto'}`}>
        {!embedded && (
          <>
            <div className="flex items-center justify-between pb-5">
              <BackButton onClick={() => navigate(-1)} />
            </div>
            <ScreenHeader
              icon="📈"
              title="Мой дашборд"
              description="Выберите упражнения — увидите лучший условный 1RM за последние 30 дней и насколько он изменился к предыдущим 30 дням"
            />
          </>
        )}

        {!editing && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex-1 py-2.5 rounded-xl bg-(--color_primary_light) text-white text-sm font-semibold"
            >
              Настроить список
            </button>
          </div>
        )}

        {editing && (
          <div className={`${cardClass} rounded-2xl p-4 space-y-3`}>
            <p className="text-xs text-(--color_text_muted)">
              До 12 упражнений.               Каталог, пресеты или упражнения из истории — в том числе после распознавания фото, если
              их нет в списке из 800.
            </p>

            <div className="flex flex-wrap gap-2">
              {DASHBOARD_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p.ids)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/15"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 min-h-[2rem]">
              {draftIds.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-(--color_bg_card_hover) text-xs text-white max-w-full"
                >
                  <span className="truncate max-w-[200px]">{nameById(id)}</span>
                  <button
                    type="button"
                    onClick={() => removeDraftId(id)}
                    className="p-0.5 rounded-md hover:bg-white/10 shrink-0"
                    aria-label="Убрать"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              disabled={draftIds.length >= 12}
              className="w-full py-2 rounded-xl border border-(--color_border) text-sm text-white disabled:opacity-40"
            >
              Добавить из каталога
            </button>
            {weightedExerciseOptions.length > 0 && (
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                disabled={draftIds.length >= 12}
                className="w-full py-2 rounded-xl border border-(--color_border) text-sm text-(--color_primary_light) disabled:opacity-40"
              >
                Из истории тренировок (в т.ч. с ИИ)
              </button>
            )}

            <BottomSheet
              id="dashboard-history-exercises"
              open={historyOpen}
              onClose={() => {
                setHistoryOpen(false);
                setHistorySearch('');
              }}
              emoji="🏋️"
              title="Из ваших тренировок"
            >
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Поиск…"
                className="w-full px-3 py-2 rounded-lg bg-(--color_bg_card) border border-(--color_border) text-sm text-white mb-3 outline-none"
              />
              <div className="max-h-[50dvh] overflow-y-auto space-y-1 pb-4">
                {historyFiltered.map((o) => (
                  <button
                    key={o.exerciseId}
                    type="button"
                    disabled={draftIds.includes(o.exerciseId) || draftIds.length >= 12}
                    onClick={() => addFromHistory(o)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-white/5 disabled:opacity-40"
                  >
                    <div className="text-sm text-white">{o.exerciseName}</div>
                    {o.isCustom && (
                      <div className="text-[10px] text-(--color_text_muted) mt-0.5">
                        Не из каталога
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </BottomSheet>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditing(false)}
                className="flex-1 py-2.5 rounded-xl border border-(--color_border) text-sm text-(--color_text_muted)"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={saveDraft}
                className="flex-1 py-2.5 rounded-xl bg-(--color_primary_light) text-white text-sm font-semibold disabled:opacity-50"
              >
                {saving ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          </div>
        )}

        <ExercisePicker
          workoutType="bodybuilding"
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={onPickerSelect}
        />

        {showEmpty && (
          <div className="text-center py-12 text-(--color_text_muted) text-sm">
            Список пуст. Нажмите «Настроить список» и добавьте жим, присед, тягу или олимпийские
            движения.
          </div>
        )}

        <div className="space-y-3">
          {!editing &&
            metrics.map((m, i) => (
              <AnimatedBlock key={m.exerciseId} delay={i * 0.04}>
                <MetricCard m={m} />
              </AnimatedBlock>
            ))}
        </div>

        {!loading && metrics.length > 0 && !editing && (
          <p className="mx-auto max-w-md px-2 text-center text-[11px] leading-relaxed text-(--color_text_muted)">
            1RM (один повторный максимум) — оценка веса на один повтор по формуле Эпли по лучшему
            подходу в тренировке. Учитываются WOD и силовые, только подходы с весом больше нуля.
            Если вы закрепили упражнение из каталога, к нему могут подмешаться похожие записи с
            «своим» названием после ИИ.
          </p>
        )}
    </div>
  );

  if (embedded) {
    if (loading) {
      return (
        <div className="flex justify-center py-16 w-full">
          <div className="w-8 h-8 border-2 border-white/20 border-t-(--color_primary_light) rounded-full animate-spin" />
        </div>
      );
    }
    return inner;
  }

  return (
    <Screen loading={loading} className="exercise-dashboard-screen">
      {inner}
    </Screen>
  );
}
