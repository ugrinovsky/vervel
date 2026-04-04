interface Props {
  intensity: number; // 0-1
  hasMissingWeights?: boolean;
  className?: string;
}

export default function WorkoutIntensityBar({ intensity, hasMissingWeights, className = '' }: Props) {
  if (hasMissingWeights) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/4 border border-(--color_border) text-xs text-(--color_text_muted) ${className}`}>
        <span>⚖️</span>
        <span>Укажите веса — тогда покажем интенсивность</span>
      </div>
    );
  }

  const pct = Math.round(intensity * 100);
  if (pct === 0) return null;

  return (
    <div className={className}>
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
    </div>
  );
}
