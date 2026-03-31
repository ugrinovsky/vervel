import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import BottomSheet from '@/components/BottomSheet/BottomSheet';
import { WORKOUT_TYPE_CONFIG } from '@/constants/workoutTypes';
import type { WorkoutPreviewData } from './WorkoutPreviewCard';

interface Props {
  data: WorkoutPreviewData | null;
  open: boolean;
  onClose: () => void;
}

export function WorkoutDetailSheet({ data, open, onClose }: Props) {
  if (!data) return null;
  const [y, m, d] = data.date.split('-').map(Number);
  const dateStr = format(new Date(y, m - 1, d), 'd MMMM yyyy', { locale: ru });
  const typeLabel = WORKOUT_TYPE_CONFIG[data.workoutType] ?? data.workoutType;

  type ExBlock = { superset: boolean; blockId?: string; items: typeof data.exercises };
  const blocks: ExBlock[] = [];
  for (const ex of data.exercises) {
    const last = blocks[blocks.length - 1];
    if (ex.blockId && last && last.blockId === ex.blockId) {
      last.items.push(ex);
    } else {
      blocks.push({ superset: !!ex.blockId, blockId: ex.blockId, items: [ex] });
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      header={
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-lg font-bold text-white">Тренировка</span>
          </div>
          <span className="text-sm font-semibold text-white/60">{typeLabel}</span>
        </div>
      }
    >
      <div className="space-y-4">
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-white/10"
          style={{ backgroundColor: 'var(--color_bg_card_hover)' }}
        >
          <span className="text-xl">📅</span>
          <div>
            <div className="text-sm font-semibold text-white">{dateStr}</div>
            <div className="text-xs text-white/50">{data.time}</div>
          </div>
        </div>

        {data.exercises.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
              Упражнения ({data.exercises.length})
            </div>
            <div className="space-y-2">
              {blocks.map((block, bi) =>
                block.superset ? (
                  <div key={bi} className="rounded-xl border border-amber-500/30 overflow-hidden">
                    <div
                      className="px-3 py-1 text-[10px] font-semibold text-amber-400 uppercase tracking-wider"
                      style={{ backgroundColor: 'rgba(245,158,11,0.08)' }}
                    >
                      ⚡ Суперсет
                    </div>
                    {block.items.map((ex, i) => (
                      <div
                        key={i}
                        className={`px-3 py-2.5 ${i < block.items.length - 1 ? 'border-b border-amber-500/20' : ''}`}
                        style={{ backgroundColor: 'rgba(245,158,11,0.04)' }}
                      >
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <span className="text-sm font-medium text-white">{ex.name}</span>
                          <span className="text-sm text-white/60 shrink-0">
                            {ex.duration
                              ? `${ex.duration} мин`
                              : [
                                  ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : null,
                                  ex.weight ? `${ex.weight} кг` : null,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                          </span>
                        </div>
                        {ex.notes && (
                          <div className="text-xs text-amber-300/60 italic">{ex.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  block.items.map((ex, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-white/10 overflow-hidden"
                      style={{ backgroundColor: 'var(--color_bg_card_hover)' }}
                    >
                      <div className="flex items-baseline justify-between gap-2 px-3 py-2.5">
                        <span className="text-sm font-medium text-white">{ex.name}</span>
                        {ex.duration && (
                          <span className="text-sm text-white/60 shrink-0">{ex.duration} мин</span>
                        )}
                      </div>
                      {ex.setsDetail && ex.setsDetail.length > 0 ? (
                        <div className="px-3 pb-2.5 space-y-1 border-t border-white/5 pt-2">
                          {ex.setsDetail.map((s, si) => (
                            <div key={si} className="flex items-center justify-between text-xs text-white/50">
                              <span>{si + 1}</span>
                              <span className="tabular-nums">
                                {s.reps ? `${s.reps} повт.` : ''}
                                {s.weight ? ` · ${s.weight} кг` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (ex.sets || ex.reps || ex.weight) && !ex.duration ? (
                        <div className="px-3 pb-2.5 text-xs text-white/50 border-t border-white/5 pt-1.5 tabular-nums">
                          {[
                            ex.sets && ex.reps ? `${ex.sets}×${ex.reps} повт.` : ex.sets ? `${ex.sets} подх.` : null,
                            ex.weight ? `${ex.weight} кг` : null,
                          ].filter(Boolean).join(' · ')}
                        </div>
                      ) : null}
                      {ex.notes && (
                        <div className="px-3 pb-2.5 text-xs text-white/50 italic border-t border-white/5 pt-1.5">
                          💬 {ex.notes}
                        </div>
                      )}
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        )}

        {data.notes && (
          <div>
            <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
              Заметки тренера
            </div>
            <div
              className="px-3 py-2.5 rounded-xl border border-white/10 text-sm text-white/70 italic"
              style={{ backgroundColor: 'var(--color_bg_card_hover)' }}
            >
              📝 {data.notes}
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
