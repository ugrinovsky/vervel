interface Props {
  label: React.ReactNode;
  children: React.ReactNode;
}

export default function FormField({ label, children }: Props) {
  return (
    <div>
      <label className="text-xs text-(--color_text_muted) mb-2 block">{label}</label>
      {children}
    </div>
  );
}
