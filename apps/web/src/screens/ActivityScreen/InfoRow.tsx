interface InfoRowProps {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  className?: string;
}

export default function InfoRow({ icon, value, label, className = '' }: InfoRowProps) {
  return (
    <div className={`glass rounded-lg flex-1 flex items-center gap-2 px-3 py-2 ${className}`}>
      {icon}
      <div>
        <div className="text-sm font-semibold text-white">{value}</div>
        <div className="text-xs text-(--color_text_muted)">{label}</div>
      </div>
    </div>
  );
}
