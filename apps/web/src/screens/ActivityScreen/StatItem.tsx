interface StatItemProps {
  value: string;
  label: string;
  icon: string;
  title?: string;
  detail?: string;
}

export default function StatItem({ value, label, icon, title, detail }: StatItemProps) {
  return (
    <div
      className="text-center p-4 bg-(--color_bg_card) rounded-lg hover:bg-(--color_bg_card_hover) transition cursor-help"
      title={detail || title}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-(--color_text_muted) mt-1">{label}</div>
    </div>
  );
}
