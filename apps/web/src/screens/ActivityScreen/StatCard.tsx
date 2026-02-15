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

const valueColors: Record<StatColor, string> = {
  emerald: 'text-emerald-400',
  teal: 'text-teal-400',
  yellow: 'text-yellow-400',
  orange: 'text-orange-400',
};

const iconColors: Record<StatColor, string> = {
  emerald: 'text-emerald-400/80',
  teal: 'text-teal-400/80',
  yellow: 'text-yellow-400/80',
  orange: 'text-orange-400/80',
};

export default function StatCard({ value, label, color, icon, title, unit = '', detail }: StatCardProps) {
  const displayValue = unit ? `${value} ${unit}` : value;

  return (
    <div
      className="text-center p-4 bg-(--color_bg_card) rounded-lg group hover:bg-(--color_bg_card_hover) transition cursor-help"
      title={detail || title}
    >
      <div className={`mb-1 flex justify-center ${iconColors[color]}`}>
        {icon}
      </div>
      <div className={`text-2xl font-bold ${valueColors[color]} group-hover:scale-105 transition-transform`}>
        {displayValue}
      </div>
      <div className="text-xs text-[var(--color_text_muted)] mt-1 group-hover:text-[var(--color_text_secondary)] transition">
        {label}
      </div>
    </div>
  );
}
