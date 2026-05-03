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
  const needsHint = hasMissingWeights || hasMissingRpe;
  let hint: string | null = null;
  if (hasMissingWeights && hasMissingRpe) {
    hint = 'В форме укажите веса и оценку нагрузки 1–5.';
  } else if (hasMissingWeights) {
    hint = 'В форме укажите веса — тогда появится интенсивность.';
  } else if (hasMissingRpe) {
    hint = 'В форме оцените нагрузку 1–5 — так точнее аналитика.';
  }

  return (
    <div className={className}>
      {needsHint && (
        <p className="text-[11px] text-(--color_text_muted) leading-snug pr-1">{hint}</p>
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
