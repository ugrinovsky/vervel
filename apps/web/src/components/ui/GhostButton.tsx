import { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /**
   * dashed — full-width dashed border (default)
   * solid — bordered pill with card hover bg
   * outline-accent — compact border, accent text (каталог, вторичные CTA)
   * accent-soft — full-width мягкий акцент (создать эталон, закрепить топ)
   * link — текстовая ссылка без рамки
   */
  variant?: 'dashed' | 'solid' | 'outline-accent' | 'accent-soft' | 'link';
}

export default function GhostButton({
  children,
  variant = 'dashed',
  className = '',
  type = 'button',
  ...props
}: Props) {
  const base =
    variant === 'solid'
      ? 'flex items-center justify-center gap-2 px-5 py-2 rounded-xl border border-(--color_border) bg-(--color_bg_card_hover) text-(--color_text_muted) hover:text-white text-sm transition-colors disabled:opacity-50'
      : variant === 'outline-accent'
        ? 'inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-(--color_border) text-xs font-medium text-(--color_primary_light) hover:bg-(--color_primary_light)/10 transition-colors disabled:opacity-50 disabled:pointer-events-none'
        : variant === 'accent-soft'
          ? 'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-(--color_primary)/25 border border-(--color_primary_light)/40 text-(--color_primary_light) text-sm font-semibold transition-opacity hover:opacity-95 disabled:opacity-50 disabled:pointer-events-none'
          : variant === 'link'
            ? 'inline p-0 m-0 bg-transparent border-0 shadow-none text-xs text-(--color_text_muted) underline-offset-2 hover:underline disabled:opacity-50'
            : 'w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-white/20 text-white/60 hover:text-white hover:border-white/40 text-sm transition-colors disabled:opacity-50 disabled:pointer-events-none';

  return (
    <button type={type} {...props} className={`${base} ${className}`.trim()}>
      {children}
    </button>
  );
}
