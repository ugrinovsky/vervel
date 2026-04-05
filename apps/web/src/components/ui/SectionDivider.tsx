interface Props {
  className?: string;
}

/** Декоративная линия между секциями (градиент + ромб с подсветкой). */
export default function SectionDivider({ className = '' }: Props) {
  return (
    <div
      className={`my-6 flex items-center gap-0 select-none ${className}`.trim()}
      aria-hidden
    >
      <div className="h-px flex-1 rounded-full bg-gradient-to-r from-transparent via-(--color_border) to-(--color_primary_light)/35" />
      <div className="mx-3 flex h-2 w-2 shrink-0 rotate-45 rounded-sm border border-(--color_primary_light)/45 bg-(--color_primary_light)/10 shadow-[0_0_14px_rgb(var(--color_primary_light_ch)_/_0.45)]" />
      <div className="h-px flex-1 rounded-full bg-gradient-to-l from-transparent via-(--color_border) to-(--color_primary_light)/35" />
    </div>
  );
}
