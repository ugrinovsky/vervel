import { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /** 'card' (default) — large padded card row; 'compact' — slim row with primary border on hover */
  variant?: 'card' | 'compact';
}

export default function ListButton({ children, variant = 'card', className = '', ...props }: Props) {
  const base = variant === 'compact'
    ? 'w-full flex items-center justify-between px-4 py-3 rounded-xl bg-(--color_bg_card_hover) border border-(--color_border) hover:border-(--color_primary_light)/40 transition-colors group text-left'
    : 'w-full flex items-center gap-4 p-5 bg-(--color_bg_card) rounded-2xl border border-(--color_border) hover:bg-(--color_bg_card_hover) transition-colors text-left';

  return (
    <button {...props} className={`${base} ${className}`}>
      {children}
    </button>
  );
}
