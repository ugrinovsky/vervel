import { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** 'dashed' — full-width dashed border (default); 'solid' — auto-width solid border with bg */
  variant?: 'dashed' | 'solid';
}

export default function GhostButton({ children, variant = 'dashed', className = '', ...props }: Props) {
  const base = variant === 'solid'
    ? 'flex items-center justify-center gap-2 px-5 py-2 rounded-xl border border-(--color_border) bg-(--color_bg_card_hover) text-(--color_text_muted) hover:text-white text-sm transition-colors disabled:opacity-50'
    : 'w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-white/20 text-white/60 hover:text-white hover:border-white/40 text-sm transition-colors disabled:opacity-50 disabled:pointer-events-none';

  return (
    <button {...props} className={`${base} ${className}`}>
      {children}
    </button>
  );
}
