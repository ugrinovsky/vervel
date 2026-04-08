interface Props {
  intensity: number; // 0-1
  hasMissingWeights?: boolean;
  hasMissingRpe?: boolean;
  className?: string;
}

export default function WorkoutIntensityBar({
  intensity,
  hasMissingWeights,
  hasMissingRpe,
  className = '',
}: Props) {
  return (
    <div className={className}>
      {hasMissingWeights && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/4 border border-(--color_border) text-xs text-(--color_text_muted) mb-1.5">
          <span>⚖️</span>
          <span>Укажите веса — тогда покажем интенсивность</span>
        </div>
      )}
      {hasMissingRpe && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/25 text-xs text-sky-100/90 mb-1.5">
          <span>⭐</span>
          <span>Оцените нагрузку по ощущениям (1–5) в форме тренировки — так аналитика точнее</span>
        </div>
      )}
      {!hasMissingWeights && <IntensityStrip intensity={intensity} />}
    </div>
  );
}

function IntensityStrip({ intensity }: { intensity: number }) {
  const pct = Math.round(intensity * 100);
  if (pct === 0) return null;

  return (
    <>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-(--color_text_muted)">Интенсивность</span>
        <span className="text-xs text-(--color_text_muted) tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-(--color_bg_card_hover) overflow-hidden">
        <div
          className="h-full rounded-full bg-linear-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </>
  );
}
