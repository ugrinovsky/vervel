export type StatColor = 'emerald' | 'teal' | 'yellow' | 'orange';

interface StatCardProps {
  value: string | number;
  label: string;
  color: StatColor;
  icon: React.ReactNode;
  title?: string;
  unit?: string;
  detail?: string;
}

const colorClass: Record<StatColor, string> = {
  emerald: 'text-emerald-400',
  teal:    'text-teal-400',
  yellow:  'text-yellow-400',
  orange:  'text-orange-400',
};

const wrapClass: Record<StatColor, string> = {
  emerald: 'bg-emerald-400/10 border border-emerald-400/20',
  teal:    'bg-teal-400/10 border border-teal-400/20',
  yellow:  'bg-yellow-400/10 border border-yellow-400/20',
  orange:  'bg-orange-400/10 border border-orange-400/20',
};

export default function StatCard({ value, label, color, icon, title, unit = '', detail }: StatCardProps) {
  const displayValue = unit ? `${value} ${unit}` : value;

  return (
    <div
      className="p-4 bg-(--color_bg_card) rounded-lg group hover:bg-(--color_bg_card_hover) transition cursor-help flex items-center gap-3 border border-white/10"
      title={detail || title}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass[color]} ${wrapClass[color]}`}>
        {icon}
      </div>
      <div>
        <div className={`text-xl font-bold leading-tight ${colorClass[color]} group-hover:scale-105 transition-transform`}>
          {displayValue}
        </div>
        <div className="text-xs text-(--color_text_muted) mt-0.5 group-hover:text-(--color_text_secondary) transition">
          {label}
        </div>
      </div>
    </div>
  );
}
