interface CardHeaderProps {
  title: string;
  description?: string;
}

export default function CardHeader({ title, description }: CardHeaderProps) {
  return (
    <div className="mb-3">
      <div className="text-sm font-semibold text-white">{title}</div>
      {description && (
        <div className="text-xs text-(--color_text_muted) mt-0.5">{description}</div>
      )}
    </div>
  );
}
