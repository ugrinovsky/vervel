import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  /**
   * 'card' (default) — large padded card row
   * 'compact' — slim row with primary border on hover
   * 'flat' — no bg/border/padding, just flex row; use inside a container that already has the card styling
   */
  variant?: 'card' | 'compact' | 'flat';
}

export default function ListButton({
  children,
  variant = 'card',
  className = '',
  type = 'button',
  ...props
}: Props) {
  const base =
    variant === 'flat'
      ? 'flex items-center gap-3 text-left transition-colors'
      : variant === 'compact'
        ? 'w-full flex items-center justify-between px-4 py-3 rounded-xl bg-(--color_bg_card_hover) border border-(--color_border) hover:border-(--color_primary_light)/40 transition-colors group text-left'
        : 'glass-row rounded-2xl w-full flex items-center gap-4 p-5 text-left';

  return (
    <Button type={type} variant="unstyled" className={`${base} ${className}`} {...props}>
      {children}
    </Button>
  );
}
