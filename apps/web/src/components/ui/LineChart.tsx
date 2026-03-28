import { useState } from 'react';

interface Point {
  workouts: number;
  volume: number;
}

interface Series {
  id: string | number;
  label: string;
  points: Point[];
}

interface Props {
  series: Series[];
  /** Which field to plot */
  valueKey: 'workouts' | 'volume';
  /** ISO date labels for the X axis */
  dates: string[];
}

const COLORS = [
  'var(--color_chart_1)',
  'var(--color_chart_2)',
  'var(--color_chart_3)',
  'var(--color_chart_4)',
  'var(--color_chart_5)',
  'var(--color_chart_6)',
  'var(--color_chart_7)',
  'var(--color_chart_8)',
];

const W = 360, H = 120;
const PAD = { t: 8, r: 8, b: 28, l: 28 };
const plotW = W - PAD.l - PAD.r;
const plotH = H - PAD.t - PAD.b;

function xPos(i: number, total: number) {
  return PAD.l + (total === 1 ? plotW / 2 : (i / (total - 1)) * plotW);
}
function yPos(val: number, maxVal: number) {
  return PAD.t + plotH - (val / maxVal) * plotH;
}

export default function LineChart({ series, valueKey, dates }: Props) {
  const [hidden, setHidden] = useState<Set<string | number>>(new Set());

  if (dates.length < 2) return null;

  const toggle = (id: string | number) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const visibleSeries = series.filter((s) => !hidden.has(s.id));
  const allVals = visibleSeries.flatMap((s) => s.points.map((p) => p[valueKey]));
  const maxVal = Math.max(...allVals, 1);

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'numeric' });

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
        {/* Grid + Y labels */}
        {[0, 0.5, 1].map((t) => {
          const y = PAD.t + plotH * (1 - t);
          const val = Math.round(maxVal * t);
          return (
            <g key={t}>
              <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y}
                stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              <text x={PAD.l - 4} y={y + 3}
                textAnchor="end" fontSize={7} fill="rgba(255,255,255,0.3)">
                {val}
              </text>
            </g>
          );
        })}

        {/* X labels */}
        {dates.map((d, i) => {
          const anchor = i === 0 ? 'start' : i === dates.length - 1 ? 'end' : 'middle';
          return (
            <text key={d} x={xPos(i, dates.length)} y={H - 6}
              textAnchor={anchor} fontSize={8} fill="rgba(255,255,255,0.3)">
              {fmt(d)}
            </text>
          );
        })}

        {/* Lines */}
        {series.map((s, si) => {
          if (hidden.has(s.id)) return null;
          const color = COLORS[si % COLORS.length];
          const pts = s.points
            .map((p, pi) => `${xPos(pi, dates.length)},${yPos(p[valueKey], maxVal)}`)
            .join(' ');
          return (
            <g key={s.id}>
              <polyline points={pts} fill="none" stroke={color}
                strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
              {s.points.map((p, pi) => (
                <circle key={pi}
                  cx={xPos(pi, dates.length)} cy={yPos(p[valueKey], maxVal)}
                  r={2.5} fill={color} />
              ))}
            </g>
          );
        })}
      </svg>

      {/* Legend — tap to toggle */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
        {series.map((s, si) => {
          const isHidden = hidden.has(s.id);
          const color = COLORS[si % COLORS.length];
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              className="flex items-center gap-1"
              style={{ opacity: isHidden ? 0.35 : 1 }}
            >
              <div className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: isHidden ? 'rgba(255,255,255,0.3)' : color }} />
              <span className="text-[10px] text-(--color_text_muted) truncate max-w-15">
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
